import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { WhatsAppService } from '../services/whatsapp.service';
import { BotWebhookDto, SendWhatsAppDto, WhatsAppQueryDto } from '../dto/whatsapp.dto';

@ApiTags('WhatsApp Bot')
@Controller('api/v1/whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  @ApiOperation({ summary: 'Send a WhatsApp message to a recipient' })
  async sendMessage(@TenantId() tenantId: string, @Body() dto: SendWhatsAppDto) {
    const data = await this.whatsappService.sendMessage(tenantId, dto);
    return { success: true, data };
  }

  @Post('girvi-balance/:customerId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  @ApiOperation({ summary: 'Send girvi balance message to customer on WhatsApp' })
  async sendGirviBalance(@TenantId() tenantId: string, @Param('customerId') customerId: string) {
    const data = await this.whatsappService.sendGirviBalance(tenantId, customerId);
    return { success: true, data };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'WhatsApp Business API webhook — incoming bot messages (no auth required)' })
  async webhook(@TenantId() tenantId: string, @Body() dto: BotWebhookDto) {
    const data = await this.whatsappService.handleBotWebhook(tenantId, dto.payload);
    return { success: true, data };
  }

  @Get('messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(Permission.NOTIFICATION_SEND)
  @ApiOperation({ summary: 'List WhatsApp message log with status and recipient filters' })
  async findMessages(@TenantId() tenantId: string, @Query() query: WhatsAppQueryDto) {
    const data = await this.whatsappService.findMessages(tenantId, query);
    return { success: true, data };
  }
}
