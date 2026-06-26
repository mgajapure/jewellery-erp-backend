import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { CustomOrderService } from '../services/custom-order.service';
import { CreateCustomOrderDto, CustomOrderQueryDto, RecordMilestonePaymentDto, UpdateCustomOrderDto } from '../dto/custom-order.dto';

@ApiTags('Custom Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/custom-orders')
export class CustomOrderController {
  constructor(private readonly customOrderService: CustomOrderService) {}

  @Post()
  @RequirePermissions(Permission.CUSTOM_ORDER_MANAGE)
  @ApiOperation({ summary: 'Create custom order' })
  async createOrder(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateCustomOrderDto) {
    const data = await this.customOrderService.createOrder(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.CUSTOM_ORDER_VIEW)
  @ApiOperation({ summary: 'List custom orders' })
  async findOrders(@TenantId() tenantId: string, @Query() query: CustomOrderQueryDto) {
    const data = await this.customOrderService.findOrders(tenantId, query);
    return { success: true, data };
  }

  @Get('delayed')
  @RequirePermissions(Permission.CUSTOM_ORDER_VIEW)
  @ApiOperation({ summary: 'List overdue custom orders past promised date' })
  async getDelayedOrders(@TenantId() tenantId: string) {
    const data = await this.customOrderService.getDelayedOrders(tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOM_ORDER_VIEW)
  @ApiOperation({ summary: 'Get custom order by ID' })
  async findOrderById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.customOrderService.findOrderById(tenantId, id);
    return { success: true, data };
  }

  @Get(':id/profit')
  @RequirePermissions(Permission.CUSTOM_ORDER_VIEW)
  @ApiOperation({ summary: 'Get profit report for custom order' })
  async getProfitReport(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.customOrderService.getProfitReport(tenantId, id);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermissions(Permission.CUSTOM_ORDER_MANAGE)
  @ApiOperation({ summary: 'Update custom order status or details' })
  async updateOrder(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCustomOrderDto) {
    const data = await this.customOrderService.updateOrder(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Post(':id/payments')
  @RequirePermissions(Permission.CUSTOM_ORDER_MANAGE)
  @ApiOperation({ summary: 'Record milestone payment for custom order' })
  async recordMilestonePayment(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: RecordMilestonePaymentDto) {
    const data = await this.customOrderService.recordMilestonePayment(tenantId, id, dto, user.userId);
    return { success: true, data };
  }
}
