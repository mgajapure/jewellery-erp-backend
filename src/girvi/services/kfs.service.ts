import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { KfsPdfService, KfsData } from '../../pdf/services/kfs-pdf.service';
import { StorageService } from '../../files/services/storage.service';

@Injectable()
export class KfsService {
  private readonly logger = new Logger(KfsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kfsPdfService: KfsPdfService,
    private readonly storageService: StorageService,
  ) {}

  async generateAndStore(tenantId: string, girviId: string): Promise<string> {
    const girvi = await this.prisma.girvi.findFirstOrThrow({
      where: { id: girviId, tenantId },
      include: {
        items: true,
        customer: true,
        tenant: true,
      },
    });

    const kfsData: KfsData = {
      girviNumber: girvi.girviNumber,
      date: new Date(),
      shopName: girvi.tenant.name,
      shopAddress: girvi.tenant.address ?? '',
      shopPhone: girvi.tenant.phone,
      shopGstin: girvi.tenant.gstin ?? undefined,
      customerName: girvi.customer.name,
      customerMobile: girvi.customer.mobile,
      customerAddress: girvi.customer.address ?? undefined,
      aadhaarNumber: girvi.customer.aadhaarNumber ?? undefined,
      panNumber: girvi.customer.panNumber ?? undefined,
      principalAmount: Number(girvi.principalAmount),
      interestRate: Number(girvi.interestRate),
      interestType: girvi.interestType,
      tenureMonths: girvi.tenureMonths,
      startDate: girvi.startDate,
      dueDate: girvi.dueDate,
      ltv: Number(girvi.ltv),
      goldRateAtCreation: Number(girvi.goldRateAtCreation),
      items: girvi.items.map((item) => ({
        itemName: item.itemName,
        purity: item.purity,
        grossWeight: Number(item.grossWeight),
        netWeight: Number(item.netWeight),
        fineWeight: Number(item.fineWeight),
        valuation: Number(item.valuation),
      })),
      totalGrossWeight: Number(girvi.totalGrossWeight),
      totalNetWeight: Number(girvi.totalNetWeight),
      totalFineWeight: Number(girvi.totalFineWeight),
      totalValuation: Number(girvi.totalValuation),
    };

    const pdfBuffer = await this.kfsPdfService.generate(kfsData);

    const { key } = await this.storageService.uploadBuffer(
      tenantId,
      'girvi/kfs',
      girviId,
      `KFS-${girvi.girviNumber}.pdf`,
      pdfBuffer,
      'application/pdf',
    );

    await this.prisma.girvi.update({
      where: { id: girviId },
      data: { kfsGenerated: true, kfsPdfUrl: key },
    });

    this.logger.log(`KFS generated for girvi ${girvi.girviNumber}`);
    return key;
  }

  async getSignedKfsUrl(tenantId: string, girviId: string): Promise<string> {
    const girvi = await this.prisma.girvi.findFirstOrThrow({
      where: { id: girviId, tenantId },
      select: { kfsPdfUrl: true, kfsGenerated: true },
    });

    if (!girvi.kfsGenerated || !girvi.kfsPdfUrl) {
      throw new Error('KFS not yet generated for this Girvi');
    }

    return this.storageService.getSignedUrl(girvi.kfsPdfUrl, 3600);
  }
}
