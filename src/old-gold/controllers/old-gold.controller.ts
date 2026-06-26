import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { OldGoldService } from '../services/old-gold.service';
import { CreateOldGoldPurchaseDto, OldGoldQueryDto, PurityTestDto, SettleOldGoldDto } from '../dto/old-gold.dto';

@ApiTags('Old Gold')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/old-gold')
export class OldGoldController {
  constructor(private readonly oldGoldService: OldGoldService) {}

  @Post('purchases')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Record old gold purchase from customer or walk-in vendor' })
  async createPurchase(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateOldGoldPurchaseDto) {
    const data = await this.oldGoldService.createPurchase(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('purchases')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List old gold purchases with status filter' })
  async findAll(@TenantId() tenantId: string, @Query() query: OldGoldQueryDto) {
    const data = await this.oldGoldService.findAll(tenantId, query);
    return { success: true, data };
  }

  @Get('purchases/report')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Old gold report — totals by status, weight, value' })
  async getReport(@TenantId() tenantId: string) {
    const data = await this.oldGoldService.getReport(tenantId);
    return { success: true, data };
  }

  @Get('purchases/:id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get single old gold purchase' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.oldGoldService.findOne(tenantId, id);
    return { success: true, data };
  }

  @Patch('purchases/:id/purity-test')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Record purity test result — calculates net fine weight and total amount' })
  async recordPurityTest(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: PurityTestDto) {
    const data = await this.oldGoldService.recordPurityTest(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch('purchases/:id/melt')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Mark old gold as melted and processed' })
  async meltAndProcess(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.oldGoldService.meltAndProcess(tenantId, id, user.userId);
    return { success: true, data };
  }

  @Patch('purchases/:id/settle')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Settle melted gold with refiner' })
  async settleWithRefiner(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: SettleOldGoldDto) {
    const data = await this.oldGoldService.settleWithRefiner(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch('purchases/:id/return')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Return old gold to customer' })
  async returnToCustomer(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.oldGoldService.returnToCustomer(tenantId, id, user.userId);
    return { success: true, data };
  }
}
