import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { BranchService } from '../services/branch.service';
import { BranchTransferDto, CreateBranchDto, UpdateBranchDto } from '../dto/branch.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Create branch (multi-shop)' })
  async createBranch(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateBranchDto) {
    const data = await this.branchService.createBranch(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'List branches' })
  async findBranches(@TenantId() tenantId: string) {
    const data = await this.branchService.findBranches(tenantId);
    return { success: true, data };
  }

  @Get('consolidated-pl')
  @RequirePermissions(Permission.REPORTS_VIEW)
  @ApiOperation({ summary: 'Consolidated P&L across all branches for date range' })
  async getConsolidatedPL(
    @TenantId() tenantId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.branchService.getConsolidatedPL(tenantId, fromDate, toDate);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get branch by ID' })
  async findBranchById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.branchService.findBranchById(tenantId, id);
    return { success: true, data };
  }

  @Put(':id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Update branch details' })
  async updateBranch(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    const data = await this.branchService.updateBranch(tenantId, id, dto, user.userId);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Deactivate branch (soft delete)' })
  async deactivateBranch(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.branchService.deactivateBranch(tenantId, id, user.userId);
    return { success: true, data };
  }

  @Post('transfer')
  @RequirePermissions(Permission.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'Transfer inventory item between branches (inter-branch GRN)' })
  async transferInventory(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: BranchTransferDto) {
    const data = await this.branchService.transferInventory(tenantId, dto, user.userId);
    return { success: true, data };
  }
}
