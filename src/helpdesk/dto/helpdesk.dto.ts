import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class CreateTicketDto {
  @ApiProperty() @IsString() subject: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) priority?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() subject?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
}

export class AddCommentDto {
  @ApiProperty() @IsString() comment: string;
  @ApiPropertyOptional() @IsOptional() isInternal?: boolean;
}

export class EscalateTicketDto {
  @ApiProperty() @IsString() reason: string;
  @ApiPropertyOptional() @IsOptional() @IsString() escalateTo?: string;
}

export class ResolveTicketDto {
  @ApiProperty() @IsString() resolution: string;
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5) csatScore?: number;
}

export class TicketQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'] })
  @IsOptional() @IsEnum(['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']) status?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional() @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) priority?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
