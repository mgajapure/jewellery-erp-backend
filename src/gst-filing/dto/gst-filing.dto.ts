import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class GenerateGstReturnDto {
  @ApiProperty({ enum: ['GSTR1', 'GSTR3B'] }) @IsString() returnType: string;
  @ApiProperty({ minimum: 1, maximum: 12 }) @Type(() => Number) @IsInt() @Min(1) @Max(12) month: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2020) year: number;
}

export class FiledGstReturnDto {
  @ApiPropertyOptional({ description: 'GST portal reference number' })
  @IsOptional() @IsString() referenceNumber?: string;
}

export class GstReturnQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['GSTR1', 'GSTR3B'] }) @IsOptional() @IsString() returnType?: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 12 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12) month?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @ApiPropertyOptional({ enum: ['DRAFT', 'FILED', 'ACCEPTED', 'REJECTED'] }) @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
