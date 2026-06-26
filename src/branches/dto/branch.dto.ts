import { IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ description: 'Unique branch code (e.g. PUNE-01)' }) @IsString() code: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
}

export class UpdateBranchDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
}

export class BranchTransferDto {
  @ApiProperty() @IsString() inventoryItemId: string;
  @ApiProperty() @IsString() fromBranchId: string;
  @ApiProperty() @IsString() toBranchId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
