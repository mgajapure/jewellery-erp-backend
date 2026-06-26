import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class CreateImportJobDto {
  @ApiProperty({ description: 'Module to import into: customers, inventory, girvi, etc.' })
  @IsString() module: string;

  @ApiProperty({ description: 'S3 URL of the uploaded CSV/Excel file' })
  @IsString() fileUrl: string;

  @ApiProperty({ description: 'Original file name' })
  @IsString() fileName: string;
}

export class ImportQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL'] })
  @IsOptional() @IsEnum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL']) status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() module?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
