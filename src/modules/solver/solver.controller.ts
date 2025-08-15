import { Body, Controller, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Length, ValidateNested } from 'class-validator';

import { SolverService } from './solver.service';

class GuessItemDto {
  @IsString()
  @Length(1, 1)
  letter!: string; // a-z

  @IsString()
  @IsIn(['HIT', 'BITE', 'ABSENT'])
  result!: 'HIT' | 'BITE' | 'ABSENT';
}

class GuessDto {
  @IsString()
  @Length(5, 5)
  word!: string; // 5 letters

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuessItemDto)
  results!: GuessItemDto[]; // length 5
}

class SolveRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuessDto)
  @IsOptional()
  guesses?: GuessDto[];
}

@Controller('solve')
export class SolverController {
  constructor(private readonly solver: SolverService) {}

  @Post()
  async next(
    @Body() body: SolveRequestDto,
  ): Promise<{ word: string; entropy: number } | { message: string }> {
    const suggestion = await this.solver.suggestNext(body.guesses ?? []);
    return suggestion;
  }
}
