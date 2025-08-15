import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WordEntity } from '../words/word.entity';
import { WordsModule } from '../words/words.module';
import { WordsService } from '../words/words.service';
import { SolverController } from './solver.controller';
import { SolverService } from './solver.service';

@Module({
  imports: [TypeOrmModule.forFeature([WordEntity]), WordsModule],
  providers: [SolverService, WordsService],
  controllers: [SolverController],
})
export class SolverModule {}
