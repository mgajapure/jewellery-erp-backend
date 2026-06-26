import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { HelpdeskService } from '../services/helpdesk.service';
import {
  AddCommentDto,
  CreateTicketDto,
  EscalateTicketDto,
  ResolveTicketDto,
  TicketQueryDto,
  UpdateTicketDto,
} from '../dto/helpdesk.dto';

@ApiTags('Help Desk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/helpdesk')
export class HelpdeskController {
  constructor(private readonly helpdeskService: HelpdeskService) {}

  @Post('tickets')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Create a support ticket' })
  async createTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    const data = await this.helpdeskService.createTicket(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('tickets')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'List tickets with status/priority filters' })
  async findAll(@TenantId() tenantId: string, @Query() query: TicketQueryDto) {
    const data = await this.helpdeskService.findAll(tenantId, query);
    return { success: true, data };
  }

  @Get('tickets/analytics')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Ticket analytics — by status, priority, SLA breaches' })
  async getAnalytics(@TenantId() tenantId: string) {
    const data = await this.helpdeskService.getAnalytics(tenantId);
    return { success: true, data };
  }

  @Get('tickets/:id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get ticket with full comment thread' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.helpdeskService.findOne(tenantId, id);
    return { success: true, data };
  }

  @Patch('tickets/:id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Update ticket subject, description, priority, or assignee' })
  async updateTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const data = await this.helpdeskService.updateTicket(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Post('tickets/:id/comments')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Add comment to ticket (marks ticket as In Progress)' })
  async addComment(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: AddCommentDto) {
    const data = await this.helpdeskService.addComment(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch('tickets/:id/escalate')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Escalate ticket and optionally reassign' })
  async escalateTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: EscalateTicketDto) {
    const data = await this.helpdeskService.escalateTicket(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch('tickets/:id/resolve')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Resolve ticket with resolution note and optional CSAT score' })
  async resolveTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: ResolveTicketDto) {
    const data = await this.helpdeskService.resolveTicket(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch('tickets/:id/close')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Close a resolved ticket' })
  async closeTicket(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.helpdeskService.closeTicket(tenantId, id, user.userId);
    return { success: true, data };
  }
}
