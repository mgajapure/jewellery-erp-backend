import { IsString, IsOptional, IsNumber, IsPositive, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class CreateOldGoldPurchaseDto {
  @ApiPropertyOptional({ description: 'Customer ID if selling to store customer' })
  @IsOptional() @IsString() customerId?: string;

  @ApiPropertyOptional({ description: 'Walk-in vendor name if no customer ID' })
  @IsOptional() @IsString() vendorName?: string;

  @ApiProperty({ description: 'Gross weight in grams' })
  @Type(() => Number) @IsNumber() @IsPositive() grossWeight: number;

  @ApiProperty({ description: 'Rate per gram in INR' })
  @Type(() => Number) @IsNumber() @IsPositive() ratePerGram: number;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PurityTestDto {
  @ApiProperty({ description: 'Tested purity percentage (e.g. 91.6 for 22K)' })
  @Type(() => Number) @IsNumber() @IsPositive() testedPurity: number;

  @ApiPropertyOptional({ description: 'Melting loss percentage' })
  @IsOptional() @Type(() => Number) @IsNumber() meltingLoss?: number;
}

export class SettleOldGoldDto {
  @ApiPropertyOptional() @IsOptional() @IsString() refinerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() settlementNotes?: string;
}

export class OldGoldQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['RECEIVED', 'PURITY_TESTED', 'MELTED', 'SETTLED', 'RETURNED'] })
  @IsOptional() @IsEnum(['RECEIVED', 'PURITY_TESTED', 'MELTED', 'SETTLED', 'RETURNED']) status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
