import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'JSON object with arbitrary tenant config keys' })
  @IsObject()
  settings: Record<string, unknown>;
}

export class UpdateInterestConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) defaultInterestRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() defaultInterestType?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) overdueInterestRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) billingThresholdDays?: number;
}
