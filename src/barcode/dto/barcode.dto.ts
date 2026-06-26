import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BarcodeTypeEnum { CODE128 = 'CODE128', QR = 'QR' }

export class GenerateBarcodeDto {
  @ApiProperty() @IsString() inventoryItemId: string;
  @ApiProperty({ enum: BarcodeTypeEnum }) @IsEnum(BarcodeTypeEnum) barcodeType: BarcodeTypeEnum;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) copies?: number;
}

export class BarcodeQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() inventoryItemId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}
