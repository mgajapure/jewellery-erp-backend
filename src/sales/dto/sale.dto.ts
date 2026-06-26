import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentModeEnum {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  CHEQUE = 'CHEQUE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  ONLINE = 'ONLINE',
}

export class SaleItemDto {
  @ApiProperty()
  @IsString()
  inventoryItemId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price (metal value at current rate)' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  makingCharges?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stoneCharges?: number;

  @ApiPropertyOptional({ description: 'Wastage amount in rupees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wastageAmount?: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'Customer ID (optional for walk-in)' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiPropertyOptional({ description: 'Discount amount in rupees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ enum: PaymentModeEnum })
  @IsEnum(PaymentModeEnum)
  paymentMode: PaymentModeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaleQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class GstrExportDto {
  @ApiProperty({ description: 'Financial year (e.g., 2024 for Apr 2024 - Mar 2025)', example: 2024 })
  @Type(() => Number)
  @IsInt()
  year: number;

  @ApiProperty({ description: 'Month number 1-12 (for GSTR-1)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  month: number;
}
