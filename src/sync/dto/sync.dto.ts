import { IsString, IsOptional, IsObject, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class PushSyncOperationDto {
  @ApiProperty({ description: 'Entity type, e.g. Girvi, Sale, Customer' }) @IsString() operation: string;
  @ApiProperty({ description: 'JSON payload of the offline operation' }) @IsObject() payload: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceId?: string;
}

export class SyncQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'] })
  @IsOptional() @IsEnum(['PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT'])
  status?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
