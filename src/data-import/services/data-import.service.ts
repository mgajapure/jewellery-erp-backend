import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';
import { CreateImportJobDto, ImportQueryDto } from '../dto/data-import.dto';

// Supported import modules and their required columns
const MODULE_COLUMNS: Record<string, string[]> = {
  customers:  ['name', 'mobile'],
  inventory:  ['sku', 'name', 'metalType', 'purity', 'grossWeight', 'netWeight'],
  girvi:      ['customerId', 'principalAmount', 'interestRate'],
  sales:      ['customerId', 'billNumber', 'totalAmount'],
  expenses:   ['categoryId', 'amount', 'description'],
};

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createImportJob(tenantId: string, dto: CreateImportJobDto, importedBy: string) {
    if (!MODULE_COLUMNS[dto.module]) {
      throw new BadRequestException(`Unsupported import module: ${dto.module}. Supported: ${Object.keys(MODULE_COLUMNS).join(', ')}`);
    }

    const job = await this.prisma.dataImportJob.create({
      data: {
        tenantId,
        module: dto.module,
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        importedBy,
      },
    });

    await this.auditService.log({ tenantId, userId: importedBy, action: 'CREATE', module: 'DataImport', entityId: job.id, entityType: 'DataImportJob', newValues: { module: dto.module, fileName: dto.fileName } });

    // In production: dispatch to BullMQ queue for async processing
    // For now, process inline (synchronous stub)
    await this.processJob(job.id, tenantId, dto.module, importedBy);

    return job;
  }

  private async processJob(jobId: string, tenantId: string, module: string, processedBy: string) {
    await this.prisma.dataImportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' as never, startedAt: new Date() },
    });

    try {
      // Stub: real implementation downloads the file from S3, parses CSV/Excel,
      // validates each row against required columns, and inserts records.
      // Returns row-level errors for failed rows.
      this.logger.log(`Processing import job ${jobId} for module ${module} by ${processedBy}`);

      await this.prisma.dataImportJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' as never, completedAt: new Date() },
      });
    } catch (err: any) {
      this.logger.error(`Import job ${jobId} failed`, err);
      await this.prisma.dataImportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED' as never,
          completedAt: new Date(),
          errors: ({ message: err?.message ?? String(err) }) as any,
        },
      });
    }
  }

  async findAll(tenantId: string, query: ImportQueryDto) {
    const where: any = {
      tenantId,
      ...(query.status && { status: query.status as never }),
      ...(query.module && { module: query.module }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.dataImportJob.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.dataImportJob.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const job = await this.prisma.dataImportJob.findFirst({ where: { id, tenantId } });
    if (!job) throw new NotFoundException('Import job not found');
    return job;
  }

  async retryJob(tenantId: string, id: string, retriedBy: string) {
    const job = await this.findOne(tenantId, id);
    if (!['FAILED', 'PARTIAL'].includes(job.status)) {
      throw new BadRequestException('Only FAILED or PARTIAL jobs can be retried');
    }

    const updated = await this.prisma.dataImportJob.update({
      where: { id },
      data: { status: 'QUEUED' as never, startedAt: null, completedAt: null, errors: undefined, processedRows: 0, successRows: 0, failedRows: 0 },
    });

    await this.processJob(id, tenantId, job.module, retriedBy);
    return updated;
  }

  getSupportedModules() {
    return Object.entries(MODULE_COLUMNS).map(([module, requiredColumns]) => ({ module, requiredColumns }));
  }

  // Export: returns CSV-formatted data for a given module
  async exportData(tenantId: string, module: string): Promise<string> {
    let rows: Record<string, unknown>[] = [];

    switch (module) {
      case 'customers':
        rows = await this.prisma.customer.findMany({ where: { tenantId, deletedAt: null }, select: { customerId: true, name: true, mobile: true, email: true, kycStatus: true, createdAt: true } });
        break;
      case 'inventory':
        rows = await this.prisma.inventoryItem.findMany({ where: { tenantId, deletedAt: null }, select: { sku: true, name: true, metalType: true, purity: true, grossWeight: true, netWeight: true, quantity: true, currentValue: true } });
        break;
      case 'expenses':
        rows = await this.prisma.expense.findMany({ where: { tenantId, deletedAt: null }, select: { amount: true, title: true, notes: true, status: true, createdAt: true } });
        break;
      default:
        throw new BadRequestException(`Export not supported for module: ${module}`);
    }

    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(','), ...rows.map(r => headers.map(h => String(r[h] ?? '')).join(','))];
    return lines.join('\n');
  }
}
