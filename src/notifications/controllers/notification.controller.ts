import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { NotificationService } from '../services/notification.service';

class SendNotificationDto {
  @ApiProperty() @IsString() recipient: string;
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional({ enum: ['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'] }) @IsOptional() @IsEnum(['SMS', 'WHATSAPP', 'EMAIL', 'PUSH']) channel?: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH';
}

class SendBulkDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsString({ each: true }) recipients: string[];
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional({ enum: ['SMS', 'WHATSAPP'] }) @IsOptional() @IsEnum(['SMS', 'WHATSAPP']) channel?: 'SMS' | 'WHATSAPP';
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  @ApiOperation({ summary: 'Send single SMS/WhatsApp/Push notification' })
  async sendNotification(@TenantId() tenantId: string, @Body() dto: SendNotificationDto) {
    await this.notificationService.send({ tenantId, channel: dto.channel ?? 'SMS', recipient: dto.recipient, message: dto.message });
    return { success: true, data: { queued: true } };
  }

  @Post('send-bulk')
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  @ApiOperation({ summary: 'Bulk SMS to multiple recipients (DND compliant)' })
  async sendBulk(@TenantId() tenantId: string, @Body() dto: SendBulkDto) {
    const data = await this.notificationService.sendBulk(tenantId, dto.recipients, dto.message, dto.channel);
    return { success: true, data };
  }

  @Get('history')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Notification delivery history with status' })
  async getHistory(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.notificationService.getNotificationHistory(tenantId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    return { success: true, data };
  }
}
