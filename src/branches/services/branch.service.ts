import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { BranchTransferDto, CreateBranchDto, UpdateBranchDto } from '../dto/branch.dto';

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createBranch(tenantId: string, dto: CreateBranchDto, createdBy: string) {
    const existing = await this.prisma.branch.findFirst({ where: { tenantId, code: dto.code } });
    if (existing) throw new ConflictException(`Branch code '${dto.code}' already exists`);

    const branch = await this.prisma.branch.create({
      data: { tenantId, name: dto.name, code: dto.code, gstin: dto.gstin, phone: dto.phone, address: dto.address, city: dto.city },
    });
    await this.auditService.log({ tenantId, userId: createdBy, action: 'CREATE', module: 'branches', entityId: branch.id, entityType: 'Branch', newValues: { code: dto.code, name: dto.name } });
    return branch;
  }

  async findBranches(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findBranchById(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async updateBranch(tenantId: string, id: string, dto: UpdateBranchDto, updatedBy: string) {
    await this.findBranchById(tenantId, id);
    const updated = await this.prisma.branch.update({ where: { id }, data: dto });
    await this.auditService.log({ tenantId, userId: updatedBy, action: 'UPDATE', module: 'branches', entityId: id, entityType: 'Branch', newValues: dto as Record<string, unknown> });
    return updated;
  }

  async deactivateBranch(tenantId: string, id: string, deletedBy: string) {
    await this.findBranchById(tenantId, id);
    const updated = await this.prisma.branch.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), deletedBy },
    });
    await this.auditService.log({ tenantId, userId: deletedBy, action: 'UPDATE', module: 'branches', entityId: id, entityType: 'Branch', newValues: { isActive: false } });
    return updated;
  }

  async transferInventory(tenantId: string, dto: BranchTransferDto, transferredBy: string) {
    const [fromBranch, toBranch, item] = await Promise.all([
      this.findBranchById(tenantId, dto.fromBranchId),
      this.findBranchById(tenantId, dto.toBranchId),
      this.prisma.inventoryItem.findFirst({ where: { id: dto.inventoryItemId, tenantId, deletedAt: null } }),
    ]);
    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.branchId !== dto.fromBranchId) {
      throw new BadRequestException(`Item is not in branch ${fromBranch.code}`);
    }

    const updated = await this.prisma.inventoryItem.update({
      where: { id: dto.inventoryItemId },
      data: { branchId: dto.toBranchId },
    });

    await this.auditService.log({
      tenantId, userId: transferredBy, action: 'UPDATE', module: 'branches',
      entityId: dto.inventoryItemId, entityType: 'InventoryTransfer',
      oldValues: { branchId: dto.fromBranchId, branchCode: fromBranch.code },
      newValues: { branchId: dto.toBranchId, branchCode: toBranch.code, notes: dto.notes },
    });
    return { item: updated, fromBranch: fromBranch.code, toBranch: toBranch.code };
  }

  async getConsolidatedPL(tenantId: string, fromDate: string, toDate: string) {
    const branches = await this.findBranches(tenantId);
    const dateFilter = { gte: new Date(fromDate), lte: new Date(toDate) };

    const branchStats = await Promise.all(branches.map(async (branch) => {
      const [salesAgg, expensesAgg] = await this.prisma.$transaction([
        this.prisma.sale.aggregate({
          where: { tenantId, branchId: branch.id, deletedAt: null, createdAt: dateFilter },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        this.prisma.expense.aggregate({
          where: { tenantId, branchId: branch.id, deletedAt: null, status: 'APPROVED' as never, expenseDate: dateFilter },
          _sum: { amount: true },
        }),
      ]);

      const revenue = Number(salesAgg._sum.totalAmount ?? 0);
      const expenses = Number(expensesAgg._sum.amount ?? 0);
      return {
        branchId: branch.id, branchCode: branch.code, branchName: branch.name,
        revenue, expenses, profit: revenue - expenses, salesCount: salesAgg._count.id,
      };
    }));

    const totalRevenue = branchStats.reduce((s, b) => s + b.revenue, 0);
    const totalExpenses = branchStats.reduce((s, b) => s + b.expenses, 0);
    return { fromDate, toDate, branches: branchStats, totalRevenue, totalExpenses, totalProfit: totalRevenue - totalExpenses };
  }
}
