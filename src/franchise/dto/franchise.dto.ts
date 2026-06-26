import { IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class CreateFranchiseeDto {
  @ApiProperty() @IsString() franchiseeName: string;
  @ApiProperty() @IsString() territory: string;
  @ApiProperty() @IsString() contactPerson: string;
  @ApiProperty() @IsString() contactMobile: string;
  @ApiProperty({ description: 'Royalty rate percentage, e.g. 5 for 5%' })
  @Type(() => Number) @IsNumber() @IsPositive() royaltyRate: number;
  @ApiProperty({ description: 'Agreement start date (ISO)' }) @IsDateString() agreementStart: string;
  @ApiProperty({ description: 'Agreement end date (ISO)' }) @IsDateString() agreementEnd: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateFranchiseeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() franchiseeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() territory?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactMobile?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() royaltyRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() agreementEnd?: string;
}

export class CalculateRoyaltyDto {
  @ApiProperty({ minimum: 1, maximum: 12 }) @Type(() => Number) @IsInt() @Min(1) month: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2020) year: number;
  @ApiProperty({ description: 'Gross sales for the period' })
  @Type(() => Number) @IsNumber() @IsPositive() grossSales: number;
}

export class FranchiseeQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED', 'TERMINATED'] })
  @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
