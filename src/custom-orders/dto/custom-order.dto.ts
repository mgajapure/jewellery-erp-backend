import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MetalTypeEnum { GOLD = 'GOLD', SILVER = 'SILVER', PLATINUM = 'PLATINUM', DIAMOND = 'DIAMOND', OTHER = 'OTHER' }
export enum CustomOrderStatusEnum {
  DRAFT = 'DRAFT', ADVANCE_PAID = 'ADVANCE_PAID', DESIGN_APPROVED = 'DESIGN_APPROVED',
  IN_PRODUCTION = 'IN_PRODUCTION', READY = 'READY', DELIVERED = 'DELIVERED', CANCELLED = 'CANCELLED',
}

export class CreateCustomOrderDto {
  @ApiProperty() @IsString() customerId: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) designPhotoUrls?: string[];
  @ApiProperty({ enum: MetalTypeEnum }) @IsEnum(MetalTypeEnum) metalType: MetalTypeEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() purity?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedWeight?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) makingCharges?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() promisedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateCustomOrderDto {
  @ApiPropertyOptional({ enum: CustomOrderStatusEnum }) @IsOptional() @IsEnum(CustomOrderStatusEnum) status?: CustomOrderStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) finalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordMilestonePaymentDto {
  @ApiProperty() @IsString() milestone: string;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiProperty() @IsString() paymentMode: string;
}

export class CustomOrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ enum: CustomOrderStatusEnum }) @IsOptional() @IsEnum(CustomOrderStatusEnum) status?: CustomOrderStatusEnum;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}
