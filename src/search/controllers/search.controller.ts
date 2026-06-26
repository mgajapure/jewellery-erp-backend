import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { SearchService } from '../services/search.service';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Global search across customers, girvi, repairs, job cards, inventory' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async globalSearch(
    @TenantId() tenantId: string,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.searchService.globalSearch(tenantId, q, limit ? parseInt(limit) : 20);
    return { success: true, data };
  }

  @Get('customers')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Search customers by name, mobile, ID, or Aadhaar' })
  @ApiQuery({ name: 'q', required: true })
  async searchCustomers(@TenantId() tenantId: string, @Query('q') q: string) {
    const data = await this.searchService.searchCustomers(tenantId, q);
    return { success: true, data };
  }

  @Get('qr')
  @RequirePermissions(Permission.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Lookup by QR code — resolves to customer or inventory item' })
  @ApiQuery({ name: 'code', required: true })
  async searchByQr(@TenantId() tenantId: string, @Query('code') code: string) {
    const data = await this.searchService.searchByQr(tenantId, code);
    return { success: true, data };
  }
}
