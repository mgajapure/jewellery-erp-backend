import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterestType, MetalType } from '@prisma/client';

export class GirviItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  itemName: string;

  @ApiProperty({ enum: MetalType })
  @IsEnum(MetalType)
  metalType: MetalType;

  @ApiProperty({ example: '22K' })
  @IsString()
  purity: string;

  @ApiProperty({ example: 15.5 })
  @IsNumber()
  @IsPositive()
  grossWeight: number;

  @ApiProperty({ example: 14.8 })
  @IsNumber()
  @IsPositive()
  netWeight: number;

  @ApiProperty({ example: 0.5 })
  @IsNumber()
  @Min(0)
  stoneWeight: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class CreateGirviDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiProperty({ enum: InterestType })
  @IsEnum(InterestType)
  interestType: InterestType;

  @ApiProperty({ example: 2.0 })
  @IsNumber()
  @IsPositive()
  interestRate: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(1)
  @Max(12)
  tenureMonths: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [GirviItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GirviItemDto)
  items: GirviItemDto[];
}

export class RecordPaymentDto {
  @ApiProperty()
  @IsNumber()
  @IsPositive()
  principalPaid: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  interestPaid: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  penaltyPaid: number;

  @ApiProperty({ enum: ['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE'] })
  @IsString()
  paymentMode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GirviQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}

export class AcknowledgeKfsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  girviId: string;

  @ApiProperty({ description: 'Digital signature or OTP for KFS acknowledgment' })
  @IsString()
  @IsNotEmpty()
  acknowledgment: string;
}
