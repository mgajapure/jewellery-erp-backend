import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDiamondCertificateDto {
  @ApiProperty() @IsString() inventoryItemId: string;
  @ApiProperty({ description: 'GIA / IGI / HRD certificate number' }) @IsString() certNumber: string;
  @ApiProperty({ description: 'GIA, IGI, HRD, SGL, etc.' }) @IsString() lab: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shape?: string;
  @ApiProperty({ description: 'Carat weight (4 decimal places)' }) @IsNumber() @Min(0) caratWeight: number;
  @ApiProperty({ description: 'D–Z colour grade' }) @IsString() color: string;
  @ApiProperty({ description: 'FL/IF/VVS1/VVS2/VS1/VS2/SI1/SI2/I1/I2/I3' }) @IsString() clarity: string;
  @ApiPropertyOptional({ description: 'Excellent/Very Good/Good' }) @IsOptional() @IsString() cut?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() polish?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() symmetry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fluorescence?: string;
  @ApiPropertyOptional({ description: 'Rapaport price per carat (USD)' }) @IsOptional() @IsNumber() @Min(0) rapPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() certUrl?: string;
  @ApiPropertyOptional({ description: 'Certificate expiry date' }) @IsOptional() @IsDateString() expiresAt?: string;
}

export class DiamondQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() inventoryItemId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lab?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() clarity?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}
