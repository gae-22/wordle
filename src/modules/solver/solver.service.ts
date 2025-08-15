import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { WordEntity } from '../words/word.entity';
import { WordsService } from '../words/words.service';

export type Result = 'HIT' | 'BITE' | 'ABSENT';

export interface GuessItem {
  letter: string; // one char
  result: Result;
}

export interface Guess {
  word: string;
  results: GuessItem[]; // length 5
}

@Injectable()
export class SolverService {
  constructor(
    @InjectRepository(WordEntity) private readonly repo: Repository<WordEntity>,
    private readonly wordsService: WordsService,
  ) {}

  private evaluatePattern(answer: string, guess: string): Result[] {
    const res: Result[] = Array(5).fill('ABSENT');
    const used = Array(5).fill(false);

    // First pass: HIT
    for (let i = 0; i < 5; i++) {
      if (guess[i] === answer[i]) {
        res[i] = 'HIT';
        used[i] = true;
      }
    }
    // Second pass: BITE
    for (let i = 0; i < 5; i++) {
      if (res[i] === 'HIT') continue;
      const idx = answer.split('').findIndex((c, j) => c === guess[i] && !used[j]);
      if (idx >= 0) {
        res[i] = 'BITE';
        used[idx] = true;
      }
    }
    return res;
  }

  private matchesFeedback(word: string, guess: Guess): boolean {
    const pattern = this.evaluatePattern(word, guess.word);
    return pattern.every((p, i) => p === guess.results[i].result);
  }

  private entropy(probabilities: number[]): number {
    // H = -sum p log2 p
    return -probabilities.reduce((acc, p) => (p > 0 ? acc + p * Math.log2(p) : acc), 0);
  }

  async suggestNext(
    guesses: Guess[],
  ): Promise<{ word: string; entropy: number } | { message: string }> {
    // Ensure words are loaded on first access
    await this.wordsService.ensureLoaded();
    const candidates: string[] = await this.findCandidatesByDB(guesses);

    // Filter by previous feedback
    const filtered: string[] = candidates.filter((w: string) =>
      guesses.every((g) => this.matchesFeedback(w, g)),
    );
    if (filtered.length === 0) return { message: 'No candidates left' };
    if (filtered.length === 1) return { word: filtered[0], entropy: 0 };

    // Heuristic fast path for huge candidate sets
    if (filtered.length > 3000) {
      const posFreq: Array<Map<string, number>> = Array.from({ length: 5 }, () => new Map());
      for (const w of filtered) {
        for (let i = 0; i < 5; i++) {
          const m = posFreq[i];
          const c = w[i];
          m.set(c, (m.get(c) ?? 0) + 1);
        }
      }
      let best = filtered[0];
      let bestScore = -1;
      for (const w of filtered) {
        let score = 0;
        const seen = new Set<string>();
        for (let i = 0; i < 5; i++) {
          const ch = w[i];
          // weight unique letters more
          if (!seen.has(ch)) score += posFreq[i].get(ch) ?? 0;
          seen.add(ch);
        }
        if (score > bestScore) {
          bestScore = score;
          best = w;
        }
      }
      return { word: best, entropy: 0 };
    }

    // For each possible guess (use filtered as both answer and guess set for simplicity)
    let bestWord = filtered[0];
    let bestEntropy = -1;
    for (const guess of filtered) {
      const patternCounts = new Map<string, number>();
      for (const ans of filtered) {
        const pattern = this.evaluatePattern(ans, guess).join('-');
        patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
      }
      const probs = Array.from(patternCounts.values()).map((n) => n / filtered.length);
      const H = this.entropy(probs);
      if (H > bestEntropy) {
        bestEntropy = H;
        bestWord = guess;
      }
    }
    return { word: bestWord, entropy: bestEntropy };
  }

  private idxToCol(i: number): keyof WordEntity {
    return ['first', 'second', 'third', 'fourth', 'fifth'][i] as keyof WordEntity;
  }

  private async findCandidatesByDB(guesses: Guess[]): Promise<string[]> {
    const present = new Set<string>();
    const absent = new Set<string>();
    const mustAt = new Map<number, string>();
    const notAt = new Map<number, Set<string>>();

    for (let i = 0; i < 5; i++) notAt.set(i, new Set());

    for (const g of guesses) {
      for (let i = 0; i < 5; i++) {
        const { letter, result } = g.results[i];
        if (result === 'HIT') {
          mustAt.set(i, letter);
          present.add(letter);
        } else if (result === 'BITE') {
          notAt.get(i)!.add(letter);
          present.add(letter);
        } else if (result === 'ABSENT') {
          absent.add(letter);
          // do not mark present
        }
      }
    }

    // exclude letters that are only ABSENT and never present
    const excludeLetters = new Set<string>([...absent].filter((l) => !present.has(l)));

    const qb = this.repo.createQueryBuilder('w');

    // mustAt constraints
    let paramIndex = 0;
    for (const [idx, letter] of mustAt.entries()) {
      const col = this.idxToCol(idx);
      qb.andWhere(`w.${String(col)} = :p${paramIndex}`, { [`p${paramIndex}`]: letter });
      paramIndex++;
    }

    // notAt constraints
    for (const [idx, letters] of notAt.entries()) {
      if (letters.size === 0) continue;
      const col = this.idxToCol(idx);
      for (const l of letters) {
        qb.andWhere(`w.${String(col)} != :p${paramIndex}`, { [`p${paramIndex}`]: l });
        paramIndex++;
      }
    }

    // must include each present letter somewhere
    for (const l of present) {
      qb.andWhere(
        `(w.first = :p${paramIndex} OR w.second = :p${paramIndex} OR w.third = :p${paramIndex} OR w.fourth = :p${paramIndex} OR w.fifth = :p${paramIndex})`,
        { [`p${paramIndex}`]: l },
      );
      paramIndex++;
    }

    // global excludes
    for (const l of excludeLetters) {
      qb.andWhere(
        `w.first != :p${paramIndex} AND w.second != :p${paramIndex} AND w.third != :p${paramIndex} AND w.fourth != :p${paramIndex} AND w.fifth != :p${paramIndex}`,
        { [`p${paramIndex}`]: l },
      );
      paramIndex++;
    }

    const rows: Pick<WordEntity, 'word'>[] = await qb.select('w.word', 'word').getRawMany();
    const words = rows.map((r) => (r as any).word as string);
    // Final guard with exact feedback match
    return words.filter((w) => guesses.every((g) => this.matchesFeedback(w, g)));
  }
}
