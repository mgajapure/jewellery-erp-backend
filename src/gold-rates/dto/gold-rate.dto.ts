import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetManualRateDto {
  @ApiProperty() @IsString() metalType: string;
  @ApiProperty() @IsString() purity: string;
  @ApiProperty() @IsNumber() @Min(0) ratePerGram: number;
}

export class ThresholdDto {
  @ApiProperty() @IsString() metalType: string;
  @ApiProperty() @IsString() purity: string;
  @ApiProperty() @IsNumber() @Min(0) threshold: number;
}

export class CheckThresholdsDto {
  @ApiProperty({ type: [ThresholdDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => ThresholdDto) thresholds: ThresholdDto[];
}
