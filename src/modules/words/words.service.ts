import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as readline from 'node:readline';
import { Readable } from 'node:stream';
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

    // Fetch word list as a stream to minimize memory usage.
    // Use dwyl/english-words words_alpha.txt (one word per line) and filter to 5 letters.
    const url = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
    try {
      const resp = await axios.get<Readable>(url, { timeout: 60000, responseType: 'stream' });
      const rl = readline.createInterface({
        input: resp.data as unknown as Readable,
        crlfDelay: Infinity,
      });

      const batchWords: string[] = [];
      const chunkSize = 120; // 6 cols/row -> 720 params < 999
      let total = 0;

      const flush = async () => {
        if (batchWords.length === 0) return;
        const batch: WordEntity[] = batchWords.map((w) => ({
          id: undefined as unknown as number,
          word: w,
          first: w[0],
          second: w[1],
          third: w[2],
          fourth: w[3],
          fifth: w[4],
        }));
        batchWords.length = 0;
        await this.repo
          .createQueryBuilder()
          .insert()
          .into(WordEntity)
          .values(batch)
          .orIgnore()
          .execute();
      };

      for await (const line of rl) {
        const w = String(line).trim().toLowerCase();
        if (/^[a-z]{5}$/.test(w)) {
          batchWords.push(w);
          total++;
          if (batchWords.length >= chunkSize) {
            // eslint-disable-next-line no-await-in-loop
            await flush();
          }
        }
      }
      await flush();
      this.logger.log(`Loaded ${total} words`);
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
