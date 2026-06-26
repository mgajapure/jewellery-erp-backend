import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { FranchiseService } from '../services/franchise.service';
import { CalculateRoyaltyDto, CreateFranchiseeDto, FranchiseeQueryDto, UpdateFranchiseeDto } from '../dto/franchise.dto';

@ApiTags('Franchise')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/franchise')
export class FranchiseController {
  constructor(private readonly franchiseService: FranchiseService) {}

  @Post('franchisees')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Register a new franchisee with territory and royalty rate' })
  async create(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateFranchiseeDto) {
    const data = await this.franchiseService.create(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('franchisees')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'List franchisees with status filter' })
  async findAll(@TenantId() tenantId: string, @Query() query: FranchiseeQueryDto) {
    const data = await this.franchiseService.findAll(tenantId, query);
    return { success: true, data };
  }

  @Get('dashboard')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Franchise dashboard — active count, unpaid royalties, total collected' })
  async getDashboard(@TenantId() tenantId: string) {
    const data = await this.franchiseService.getDashboard(tenantId);
    return { success: true, data };
  }

  @Get('franchisees/:id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Get franchisee with royalty history' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.franchiseService.findOne(tenantId, id);
    return { success: true, data };
  }

  @Patch('franchisees/:id')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Update franchisee details' })
  async update(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateFranchiseeDto) {
    const data = await this.franchiseService.update(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch('franchisees/:id/suspend')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Suspend a franchisee' })
  async suspend(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.franchiseService.suspend(tenantId, id, user.userId);
    return { success: true, data };
  }

  @Post('franchisees/:id/royalties')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Calculate monthly royalty (grossSales × royaltyRate%)' })
  async calculateRoyalty(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: CalculateRoyaltyDto) {
    const data = await this.franchiseService.calculateRoyalty(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Patch('royalties/:royaltyId/paid')
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiOperation({ summary: 'Mark royalty payment as received' })
  async markRoyaltyPaid(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('royaltyId') royaltyId: string) {
    const data = await this.franchiseService.markRoyaltyPaid(tenantId, royaltyId, user.userId);
    return { success: true, data };
  }
}
