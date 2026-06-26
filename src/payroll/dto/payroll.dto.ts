import { IsString, IsNumber, IsPositive, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class GeneratePayrollDto {
  @ApiProperty({ description: 'Staff user ID' }) @IsString() staffId: string;
  @ApiProperty({ minimum: 1, maximum: 12 }) @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2020) year: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @IsPositive() basicSalary: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() hra?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() da?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() otherAllowances?: number;
  @ApiPropertyOptional({ description: 'Total working days in month' }) @IsOptional() @Type(() => Number) @IsInt() workingDays?: number;
  @ApiPropertyOptional({ description: 'Days actually present' }) @IsOptional() @Type(() => Number) @IsInt() presentDays?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() otherDeductions?: number;
}

export class ApprovePayrollDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PayrollQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 12 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() staffId?: string;
  @ApiPropertyOptional({ enum: ['DRAFT', 'APPROVED', 'PAID', 'CANCELLED'] }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
