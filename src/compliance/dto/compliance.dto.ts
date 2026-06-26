import { IsDateString, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Form6QueryDto {
  @ApiProperty({ description: 'Date for daily cash book (YYYY-MM-DD)', example: '2025-06-25' })
  @IsDateString()
  date: string;
}

export class Form9QueryDto {
  @ApiProperty({ description: 'Customer ID for debtor ledger' })
  @IsString()
  customerId: string;
}

export class Form11QueryDto {
  @ApiProperty({ description: 'Payment ID for repayment receipt' })
  @IsString()
  paymentId: string;
}

export class Form12QueryDto {
  @ApiProperty({ description: 'Girvi ID for pledge receipt' })
  @IsString()
  girviId: string;
}

export class Form13QueryDto {
  @ApiProperty({ description: 'Financial year (e.g., 2024 means Apr 2024 - Mar 2025)', example: 2024 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}

export class Section25NoticeDto {
  @ApiProperty({ description: 'Girvi ID for auction notice' })
  @IsString()
  girviId: string;
}

export class Section25StatementDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2025-01-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)', example: '2025-12-31' })
  @IsDateString()
  to: string;
}
