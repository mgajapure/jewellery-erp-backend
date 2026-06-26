import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MetalTypeEnum {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
  OTHER = 'OTHER',
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiProperty({ enum: MetalTypeEnum })
  @IsEnum(MetalTypeEnum)
  metalType: MetalTypeEnum;

  @ApiProperty({ description: 'GST rate percentage', example: 3 })
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate: number;
}

export class CreateInventoryItemDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: MetalTypeEnum })
  @IsEnum(MetalTypeEnum)
  metalType: MetalTypeEnum;

  @ApiProperty({ example: '22K' })
  @IsString()
  purity: string;

  @ApiProperty({ description: 'Gross weight in grams' })
  @IsNumber()
  @Min(0)
  grossWeight: number;

  @ApiProperty({ description: 'Net weight in grams (after stone deduction)' })
  @IsNumber()
  @Min(0)
  netWeight: number;

  @ApiPropertyOptional({ description: 'Stone weight in grams' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stoneWeight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  makingCharges?: number;

  @ApiPropertyOptional({ description: 'Wastage percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wastage?: number;

  @ApiPropertyOptional({ description: 'BIS Hallmark HUID number' })
  @IsOptional()
  @IsString()
  huId?: string;

  @ApiPropertyOptional({ description: 'BIS license number' })
  @IsOptional()
  @IsString()
  bisNumber?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  makingCharges?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StockAdjustmentDto {
  @ApiProperty({ description: 'Positive for addition, negative for reduction' })
  @IsInt()
  quantityChange: number;

  @ApiProperty({ description: 'Reason for adjustment (e.g., DAMAGE, THEFT, RECOUNT, PURCHASE)' })
  @IsString()
  reason: string;
}

export class InventoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MetalTypeEnum })
  @IsOptional()
  @IsEnum(MetalTypeEnum)
  metalType?: MetalTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
