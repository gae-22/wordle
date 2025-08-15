import { Type } from 'class-transformer';
import { IsArray, IsIn, IsString, Length, ValidateNested } from 'class-validator';

export class GuessItemDto {
  @IsString()
  @Length(1, 1)
  letter!: string;

  @IsString()
  @IsIn(['HIT', 'BITE', 'ABSENT'])
  result!: 'HIT' | 'BITE' | 'ABSENT';
}

export class GuessDto {
  @IsString()
  @Length(5, 5)
  word!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuessItemDto)
  results!: GuessItemDto[];
}
