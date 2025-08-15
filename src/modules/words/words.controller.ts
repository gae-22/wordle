import { Controller, Get } from '@nestjs/common';

import { WordsService } from './words.service';

@Controller('words')
export class WordsController {
  constructor(private readonly words: WordsService) {}

  @Get('count')
  async count(): Promise<{ count: number }> {
    await this.words.ensureLoaded();
    const n = await this.words.count();
    return { count: n };
  }

  @Get('load')
  async load(): Promise<{ loaded: boolean; count: number }> {
    await this.words.ensureLoaded();
    const n = await this.words.count();
    return { loaded: true, count: n };
  }
}
