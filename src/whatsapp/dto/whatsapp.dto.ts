import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQuery } from '../../common/utils/pagination';

export class SendWhatsAppDto {
  @ApiProperty({ description: 'Recipient phone number with country code (e.g. 919876543210)' })
  @IsString() recipient: string;

  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional({ description: 'WhatsApp Business template name' }) @IsOptional() @IsString() template?: string;
}

export class BotWebhookDto {
  @ApiProperty({ description: 'Incoming WhatsApp message from WhatsApp Business API webhook' })
  payload: unknown;
}

export class WhatsAppQueryDto implements PaginationQuery {
  @ApiPropertyOptional({ enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'] })
  @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recipient?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
