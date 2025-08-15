import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';

import { WordEntity } from './word.entity';

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);
  private isLoaded = false;

  constructor(@InjectRepository(WordEntity) private readonly repo: Repository<WordEntity>) {}

  async ensureLoaded(): Promise<void> {
    if (this.isLoaded) return;

    const count = await this.repo.count();
    if (count > 0) {
      this.isLoaded = true;
      return;
    }

    // Fetch word list (dwyl/english-words) raw JSON word list.
    // We avoid bundling their list; download on first access.
    const url = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json';
    try {
      const resp = await axios.get<Record<string, number>>(url, { timeout: 30000 });
      const dict = resp.data ?? {};
      const all = Object.keys(dict)
        .filter((w) => /^[a-z]{5}$/.test(w))
        .map((w) => w.toLowerCase());

      // Insert in chunks to avoid SQLITE_MAX_VARIABLE_NUMBER limit
      const chunkSize = 120; // 6 cols/row -> 720 params < 999
      for (let i = 0; i < all.length; i += chunkSize) {
        const slice = all.slice(i, i + chunkSize);
        const batch: WordEntity[] = slice.map((w) => ({
          id: undefined as unknown as number,
          word: w,
          first: w[0],
          second: w[1],
          third: w[2],
          fourth: w[3],
          fifth: w[4],
        }));
        await this.repo
          .createQueryBuilder()
          .insert()
          .into(WordEntity)
          .values(batch)
          .orIgnore()
          .execute();
      }
      this.logger.log(`Loaded ${all.length} words`);
      this.isLoaded = true;
    } catch (e) {
      this.logger.error('Failed to load words', e as Error);
      throw e;
    }
  }

  async allFiveLetterWords(): Promise<WordEntity[]> {
    await this.ensureLoaded();
    return this.repo.find();
  }

  async count(): Promise<number> {
    return this.repo.count();
  }
}
