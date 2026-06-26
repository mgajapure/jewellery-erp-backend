import { IsInt, IsOptional, IsPositive, IsString, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class AdjustPointsDto {
  @ApiProperty({ enum: ['EARN', 'REDEEM', 'EXPIRE', 'BONUS', 'ADJUSTMENT'] })
  @IsEnum(['EARN', 'REDEEM', 'EXPIRE', 'BONUS', 'ADJUSTMENT']) type: string;

  @ApiProperty({ description: 'Points to add (positive) or deduct (negative for REDEEM/EXPIRE)' })
  @Type(() => Number) @IsInt() @IsPositive() points: number;

  @ApiProperty() @IsString() description: string;

  @ApiPropertyOptional() @IsOptional() @IsString() referenceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceType?: string;
}

export class LoyaltyQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] })
  @IsOptional() @IsEnum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']) tier?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
