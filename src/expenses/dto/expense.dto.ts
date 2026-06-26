import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty() @IsString() name: string;
}

export class CreateExpenseDto {
  @ApiProperty() @IsString() categoryId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiProperty() @IsString() paymentMode: string;
  @ApiProperty() @IsDateString() expenseDate: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRecurring?: boolean;
  @ApiPropertyOptional({ description: 'Day of month (1-28) for recurring' }) @IsOptional() @IsInt() @Min(1) @Max(28) recurringDay?: number;
}

export class ApproveExpenseDto {
  @ApiPropertyOptional() @IsOptional() @IsString() rejectedReason?: string;
}

export class ExpenseQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() toDate?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}
