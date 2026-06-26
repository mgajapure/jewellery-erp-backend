import {
  IsString, IsNumber, IsOptional, IsArray, IsEnum, IsInt, Min, IsDateString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MetalTypeEnum { GOLD = 'GOLD', SILVER = 'SILVER', PLATINUM = 'PLATINUM', DIAMOND = 'DIAMOND', OTHER = 'OTHER' }

export class CreateKarigarDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialization?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) ratePerGram?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) ratePerPiece?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() aadhaarNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
}

export class CreateJobCardDto {
  @ApiProperty() @IsString() karigarId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customOrderId?: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) designPhotoUrls?: string[];
  @ApiProperty({ enum: MetalTypeEnum }) @IsEnum(MetalTypeEnum) metalType: MetalTypeEnum;
  @ApiProperty({ example: '22K' }) @IsString() purity: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expectedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class IssueMaterialDto {
  @ApiProperty({ enum: MetalTypeEnum }) @IsEnum(MetalTypeEnum) metalType: MetalTypeEnum;
  @ApiProperty({ example: '22K' }) @IsString() purity: string;
  @ApiProperty() @IsNumber() @Min(0) grossWeight: number;
  @ApiProperty() @IsNumber() @Min(0) netWeight: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReceiveMaterialDto {
  @ApiProperty({ enum: MetalTypeEnum }) @IsEnum(MetalTypeEnum) metalType: MetalTypeEnum;
  @ApiProperty({ example: '22K' }) @IsString() purity: string;
  @ApiProperty() @IsNumber() @Min(0) grossWeight: number;
  @ApiProperty() @IsNumber() @Min(0) netWeight: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RecordKarigarPaymentDto {
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiProperty() @IsString() paymentMode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class KarigarQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}

export class JobCardQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() karigarId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}
