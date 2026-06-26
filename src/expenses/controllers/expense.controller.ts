import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { ExpenseService } from '../services/expense.service';
import { ApproveExpenseDto, CreateExpenseCategoryDto, CreateExpenseDto, ExpenseQueryDto } from '../dto/expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('api/v1/expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post('categories')
  @RequirePermissions(Permission.EXPENSE_APPROVE)
  @ApiOperation({ summary: 'Create expense category' })
  async createCategory(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateExpenseCategoryDto) {
    const data = await this.expenseService.createCategory(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get('categories')
  @RequirePermissions(Permission.EXPENSE_VIEW)
  @ApiOperation({ summary: 'List expense categories' })
  async findCategories(@TenantId() tenantId: string) {
    const data = await this.expenseService.findCategories(tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermissions(Permission.EXPENSE_SUBMIT)
  @ApiOperation({ summary: 'Submit expense for approval' })
  async submitExpense(@TenantId() tenantId: string, @CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    const data = await this.expenseService.submitExpense(tenantId, dto, user.userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermissions(Permission.EXPENSE_VIEW)
  @ApiOperation({ summary: 'List expenses with filters' })
  async findExpenses(@TenantId() tenantId: string, @Query() query: ExpenseQueryDto) {
    const data = await this.expenseService.findExpenses(tenantId, query);
    return { success: true, data };
  }

  @Get('summary')
  @RequirePermissions(Permission.EXPENSE_VIEW)
  @ApiOperation({ summary: 'Expense summary by category for date range' })
  async getSummary(
    @TenantId() tenantId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.expenseService.getSummary(tenantId, fromDate, toDate);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermissions(Permission.EXPENSE_VIEW)
  @ApiOperation({ summary: 'Get expense by ID' })
  async findExpenseById(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.expenseService.findExpenseById(tenantId, id);
    return { success: true, data };
  }

  @Put(':id/approve')
  @RequirePermissions(Permission.EXPENSE_APPROVE)
  @ApiOperation({ summary: 'Approve expense' })
  async approveExpense(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.expenseService.approveExpense(tenantId, id, user.userId);
    return { success: true, data };
  }

  @Put(':id/reject')
  @RequirePermissions(Permission.EXPENSE_APPROVE)
  @ApiOperation({ summary: 'Reject expense with reason' })
  async rejectExpense(@TenantId() tenantId: string, @CurrentUser() user: any, @Param('id') id: string, @Body() dto: ApproveExpenseDto) {
    const data = await this.expenseService.rejectExpense(tenantId, id, dto, user.userId);
    return { success: true, data };
  }
}
