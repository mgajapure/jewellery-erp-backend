import { Injectable, NotFoundException } from '@nestjs/common';
import * as bwipjs from 'bwip-js';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { BarcodeQueryDto, BarcodeTypeEnum, GenerateBarcodeDto } from '../dto/barcode.dto';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination';

@Injectable()
export class BarcodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async generateBarcode(tenantId: string, dto: GenerateBarcodeDto, printedBy: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, tenantId, deletedAt: null },
      select: { id: true, sku: true, name: true },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    const imageBuffer = await this.renderBarcode(item.sku, dto.barcodeType);

    const log = await this.prisma.barcodeLog.create({
      data: {
        tenantId,
        inventoryItemId: item.id,
        sku: item.sku,
        barcodeType: dto.barcodeType,
        printedBy,
        isPrint: true,
      },
    });

    await this.auditService.log({
      tenantId, userId: printedBy, action: 'CREATE', module: 'barcode',
      entityId: log.id, entityType: 'BarcodeLog',
      newValues: { sku: item.sku, barcodeType: dto.barcodeType },
    });

    return { logId: log.id, sku: item.sku, barcodeType: dto.barcodeType, imageBase64: imageBuffer.toString('base64'), copies: dto.copies ?? 1 };
  }

  async lookupBySku(tenantId: string, sku: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { sku, tenantId, deletedAt: null },
      include: { category: { select: { name: true } } },
    });
    if (!item) throw new NotFoundException(`No inventory item found for SKU: ${sku}`);
    return item;
  }

  async findPrintHistory(tenantId: string, query: BarcodeQueryDto) {
    const where: any = {
      tenantId,
      ...(query.inventoryItemId && { inventoryItemId: query.inventoryItemId }),
    };
    const { skip, take } = paginate(query);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.barcodeLog.findMany({ where, skip, take, orderBy: { printedAt: 'desc' } }),
      this.prisma.barcodeLog.count({ where }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  private async renderBarcode(sku: string, type: BarcodeTypeEnum): Promise<Buffer> {
    if (type === BarcodeTypeEnum.QR) {
      return QRCode.toBuffer(sku, { errorCorrectionLevel: 'M', width: 200 });
    }
    return bwipjs.toBuffer({
      bcid: 'code128',
      text: sku,
      scale: 2,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
  }
}
