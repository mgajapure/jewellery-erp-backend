import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ApproveExpenseDto, CreateExpenseCategoryDto, CreateExpenseDto, ExpenseQueryDto } from '../dto/expense.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import dayjs from 'dayjs';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Categories ───────────────────────────────────────────────────────────────

  async createCategory(tenantId: string, dto: CreateExpenseCategoryDto, createdBy: string) {
    const cat = await this.prisma.expenseCategory.create({
      data: { tenantId, name: dto.name },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'expenses', entityId: cat.id, entityType: 'ExpenseCategory', newValues: { name: dto.name } });
    return cat;
  }

  async findCategories(tenantId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Expenses ─────────────────────────────────────────────────────────────────

  async submitExpense(tenantId: string, dto: CreateExpenseDto, submittedBy: string) {
    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        categoryId: dto.categoryId,
        title: dto.title,
        amount: dto.amount,
        paymentMode: dto.paymentMode as never,
        expenseDate: new Date(dto.expenseDate),
        billUrl: dto.billUrl,
        notes: dto.notes,
        isRecurring: dto.isRecurring ?? false,
        recurringDay: dto.recurringDay,
        submittedBy,
        status: 'PENDING',
      },
      include: { category: true },
    });
    await this.auditService.log({ tenantId, userId: submittedBy, action: 'CREATE', module: 'expenses', entityId: expense.id, entityType: 'Expense', newValues: { title: dto.title, amount: dto.amount } });
    return expense;
  }

  async findExpenses(tenantId: string, query: ExpenseQueryDto) {
    const where: any = {
      tenantId, deletedAt: null,
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.status && { status: query.status as never }),
      ...(query.fromDate || query.toDate) && {
        expenseDate: {
          ...(query.fromDate && { gte: new Date(query.fromDate) }),
          ...(query.toDate && { lte: new Date(query.toDate) }),
        },
      },
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where, skip, take, orderBy: { expenseDate: 'desc' },
        include: { category: { select: { name: true } } },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findExpenseById(tenantId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { category: true },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async approveExpense(tenantId: string, id: string, approverId: string) {
    const expense = await this.findExpenseById(tenantId, id);
    if (expense.status !== 'PENDING') {
      throw new BadRequestException(`Expense is already ${expense.status}`);
    }
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: approverId, approvedAt: new Date() },
    });
    await this.auditService.log({ tenantId, userId: approverId, action: 'UPDATE', module: 'expenses', entityId: id, entityType: 'Expense', oldValues: { status: 'PENDING' }, newValues: { status: 'APPROVED' } });
    return updated;
  }

  async rejectExpense(tenantId: string, id: string, dto: ApproveExpenseDto, rejectedBy: string) {
    const expense = await this.findExpenseById(tenantId, id);
    if (expense.status !== 'PENDING') {
      throw new BadRequestException(`Expense is already ${expense.status}`);
    }
    if (!dto.rejectedReason) throw new BadRequestException('Rejection reason is required');
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: dto.rejectedReason },
    });
    await this.auditService.log({ tenantId, userId: rejectedBy, action: 'UPDATE', module: 'expenses', entityId: id, entityType: 'Expense', oldValues: { status: 'PENDING' }, newValues: { status: 'REJECTED', reason: dto.rejectedReason } });
    return updated;
  }

  async getSummary(tenantId: string, fromDate: string, toDate: string) {
    const [byCategory, total] = await this.prisma.$transaction([
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: {
          tenantId, deletedAt: null, status: 'APPROVED' as never,
          expenseDate: { gte: new Date(fromDate), lte: new Date(toDate) },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _count: { categoryId: 'desc' } },
      }),
      this.prisma.expense.aggregate({
        where: {
          tenantId, deletedAt: null, status: 'APPROVED',
          expenseDate: { gte: new Date(fromDate), lte: new Date(toDate) },
        },
        _sum: { amount: true },
      }),
    ]);
    return { byCategory, totalApproved: Number(total._sum.amount ?? 0) };
  }

  // ── Recurring expense auto-generation (runs daily at 7 AM) ──────────────────
  @Cron('0 7 * * *')
  async generateRecurringExpenses() {
    const today = dayjs();
    const dayOfMonth = today.date();

    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true }, select: { id: true } });

    for (const tenant of tenants) {
      const templates = await this.prisma.expense.findMany({
        where: { tenantId: tenant.id, isRecurring: true, recurringDay: dayOfMonth, deletedAt: null },
      });

      for (const tmpl of templates) {
        await this.prisma.expense.create({
          data: {
            tenantId: tmpl.tenantId,
            categoryId: tmpl.categoryId,
            title: tmpl.title,
            amount: tmpl.amount,
            paymentMode: tmpl.paymentMode,
            expenseDate: today.toDate(),
            notes: `Auto-generated recurring expense`,
            isRecurring: false,
            submittedBy: tmpl.submittedBy,
            status: 'PENDING',
          },
        });
      }
    }
  }
}
