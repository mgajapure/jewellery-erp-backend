import { IsString, IsNumber, IsOptional, IsArray, IsEnum, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RepairStatusEnum {
  RECEIVED = 'RECEIVED',
  ASSESSING = 'ASSESSING',
  ESTIMATE_SENT = 'ESTIMATE_SENT',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class CreateRepairDto {
  @ApiProperty() @IsString() customerId: string;
  @ApiProperty() @IsString() itemDescription: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) itemPhotoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() damageDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) estimatedCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() promisedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateRepairStatusDto {
  @ApiProperty({ enum: RepairStatusEnum }) @IsEnum(RepairStatusEnum) status: RepairStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) finalCost?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deliverySignatureUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class RepairQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ enum: RepairStatusEnum }) @IsOptional() @IsEnum(RepairStatusEnum) status?: RepairStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}
