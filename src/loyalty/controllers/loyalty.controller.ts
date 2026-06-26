import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { LoyaltyService } from '../services/loyalty.service';
import { AdjustPointsDto, LoyaltyQueryDto } from '../dto/loyalty.dto';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('accounts')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List loyalty accounts with tier filter and lifetime points ranking' })
  async findAllAccounts(@TenantId() tenantId: string, @Query() query: LoyaltyQueryDto) {
    const data = await this.loyaltyService.findAllAccounts(tenantId, query);
    return { success: true, data };
  }

  @Get('tiers')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Tier distribution report — count and points by tier' })
  async getTierReport(@TenantId() tenantId: string) {
    const data = await this.loyaltyService.getTierReport(tenantId);
    return { success: true, data };
  }

  @Get('accounts/:customerId')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get loyalty account with last 20 transactions' })
  async getAccount(@TenantId() tenantId: string, @Param('customerId') customerId: string) {
    const data = await this.loyaltyService.getAccount(tenantId, customerId);
    return { success: true, data };
  }

  @Get('accounts/:customerId/transactions')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Full transaction history for a loyalty account' })
  async getTransactionHistory(@TenantId() tenantId: string, @Param('customerId') customerId: string, @Query() query: LoyaltyQueryDto) {
    const data = await this.loyaltyService.getTransactionHistory(tenantId, customerId, query);
    return { success: true, data };
  }

  @Post('accounts/:customerId/points')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Earn, redeem, or adjust loyalty points manually' })
  async adjustPoints(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('customerId') customerId: string, @Body() dto: AdjustPointsDto) {
    const data = await this.loyaltyService.adjustPoints(tenantId, customerId, dto);
    return { success: true, data };
  }
}
