import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { CustomerService } from '../services/customer.service';
import {
  CreateCustomerDto,
  CustomerQueryDto,
  UpdateCustomerDto,
} from '../dto/customer.dto';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @RequirePermissions(Permission.CUSTOMER_CREATE)
  @ApiOperation({ summary: 'Create a new customer' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customerService.create(tenantId, dto, user.id);
  }

  @Get()
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  @ApiOperation({ summary: 'List customers with search and filters' })
  findAll(@TenantId() tenantId: string, @Query() query: CustomerQueryDto) {
    return this.customerService.findAll(tenantId, query);
  }

  @Get('qr/:qrCode')
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  @ApiOperation({ summary: 'Find customer by QR code' })
  findByQr(@TenantId() tenantId: string, @Param('qrCode') qrCode: string) {
    return this.customerService.findByQr(tenantId, qrCode);
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  @ApiOperation({ summary: 'Get customer details' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.customerService.findById(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Update customer' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customerService.update(tenantId, id, dto, user.id);
  }

  @Patch(':id/kyc/:status')
  @RequirePermissions(Permission.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Update KYC status' })
  updateKyc(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('status') status: 'VERIFIED' | 'REJECTED',
    @CurrentUser() user: { id: string },
  ) {
    return this.customerService.verifyKyc(tenantId, id, status, user.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CUSTOMER_UPDATE)
  @ApiOperation({ summary: 'Delete customer (soft delete)' })
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.customerService.delete(tenantId, id, user.id);
  }
}
