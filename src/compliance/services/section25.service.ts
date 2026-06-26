import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import PDFDocument from 'pdfkit';

// Maharashtra Pawnbrokers Act — Section 25(1): Auction Notice Statement
@Injectable()
export class Section25Service {
  constructor(private readonly prisma: PrismaService) {}

  // Generate 14-day auction notice for a specific overdue girvi
  async generateNotice(tenantId: string, girviId: string): Promise<Buffer> {
    const girvi = await this.prisma.girvi.findFirstOrThrow({
      where: { id: girviId, tenantId },
      include: { customer: true, tenant: true, items: true },
    });

    if (!['OVERDUE'].includes(girvi.status)) {
      throw new Error(`Cannot issue auction notice for Girvi with status ${girvi.status}`);
    }

    const noticeDate = new Date();
    const auctionDate = new Date(noticeDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;

      doc.fontSize(11).font('Helvetica-Bold').text('NOTICE UNDER SECTION 25(1)', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Maharashtra Pawnbrokers Act, 2014', { align: 'center' });
      doc.moveDown(1);

      doc.text(`Date: ${this.formatDate(noticeDate)}`);
      doc.text(`Ref: ${girvi.girviNumber}/NOTICE/${Date.now().toString(36).toUpperCase()}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('To,');
      doc.font('Helvetica');
      doc.text(`${girvi.customer.name}`);
      doc.text(`Mobile: ${girvi.customer.mobile}`);
      if (girvi.customer.address) doc.text(girvi.customer.address);
      doc.moveDown(0.5);

      doc.text('Subject: Notice of Intended Auction of Pledged Articles');
      doc.moveDown(0.5);
      doc.text('Sir / Madam,');
      doc.moveDown(0.5);

      doc.text(
        `This is to inform you that you had pledged the following articles with us on ` +
        `${this.formatDate(girvi.startDate)} against loan no. ${girvi.girviNumber} for ` +
        `a principal amount of Rs. ${this.formatAmount(Number(girvi.principalAmount))}.`,
      );
      doc.moveDown(0.5);

      doc.text(
        `The loan was due for repayment on ${this.formatDate(girvi.dueDate)}. As the loan ` +
        `amount along with interest remains unpaid, we hereby give you notice under Section 25(1) ` +
        `of the Maharashtra Pawnbrokers Act, 2014, that if the entire outstanding amount ` +
        `is not repaid within FOURTEEN (14) DAYS from the date of this notice, the pledged ` +
        `articles described below will be auctioned/sold at a public auction.`,
      );
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Articles Subject to Auction:');
      doc.moveDown(0.3);
      const pageW = pageWidth;
      this.itemsHeader(doc, pageW);
      girvi.items.forEach((item, idx) => this.itemsRow(doc, idx + 1, item, pageW));
      doc.moveDown(0.5);

      doc.font('Helvetica').text(
        `Estimated auction date: ${this.formatDate(auctionDate)} (subject to change with further notice).`,
      );
      doc.moveDown(0.5);

      doc.text(
        'You may avoid auction by repaying the entire outstanding principal, interest, and charges ' +
        'before the above date. For the exact outstanding amount, please contact our office.',
      );
      doc.moveDown(1);

      doc.text('Yours faithfully,');
      doc.moveDown(1);
      doc.text('___________________________');
      doc.text(`${girvi.tenant.name}`);
      doc.text(`${girvi.tenant.address ?? ''}`);
      doc.text(`Ph: ${girvi.tenant.phone}`);
      doc.moveDown(1);

      doc.fontSize(8).font('Helvetica').text(
        'NOTE: This notice has been sent in compliance with Section 25(1) of the Maharashtra Pawnbrokers Act, 2014. ' +
        'A copy of this notice shall be maintained in our records.',
      );

      doc.end();
    });
  }

  // Generate summary statement of all Section 25 notices issued in a period
  async generateStatement(tenantId: string, from: Date, to: Date): Promise<Buffer> {
    const tenant = await this.prisma.tenant.findFirstOrThrow({ where: { id: tenantId } });

    const overdueGirvis = await this.prisma.girvi.findMany({
      where: {
        tenantId,
        status: { in: ['OVERDUE', 'AUCTIONED'] },
        dueDate: { gte: from, lte: to },
        deletedAt: null,
      },
      include: { customer: { select: { name: true, mobile: true } } },
      orderBy: { dueDate: 'asc' },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;

      doc.fontSize(11).font('Helvetica-Bold').text('SECTION 25(1) STATEMENT', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Summary of Overdue / Auction Cases', { align: 'center' });
      doc.moveDown(0.5);

      doc.text(`Pawnbroker: ${tenant.name}`);
      doc.text(`Period: ${this.formatDate(from)} to ${this.formatDate(to)}`);
      doc.text(`Total Cases: ${overdueGirvis.length}`);
      doc.moveDown(0.5);

      this.statementHeader(doc, pageWidth);
      overdueGirvis.forEach((g, idx) => {
        this.statementRow(doc, idx + 1, g, pageWidth);
      });

      doc.moveDown(1);
      doc.text('___________________________');
      doc.text('Signature of Pawnbroker');

      doc.end();
    });
  }

  private itemsHeader(doc: PDFKit.PDFDocument, width: number): void {
    const y = doc.y;
    doc.rect(50, y, width, 14).fill('#e0e0e0').fillColor('black');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('#', 53, y + 3);
    doc.text('Item', 73, y + 3, { width: 120 });
    doc.text('Purity', 200, y + 3);
    doc.text('Net Weight', 245, y + 3);
    doc.text('Value', 320, y + 3);
    doc.y = y + 16;
  }

  private itemsRow(doc: PDFKit.PDFDocument, idx: number, item: { itemName: string; purity: string; netWeight: object; valuation: object }, width: number): void {
    const y = doc.y;
    doc.fontSize(8).font('Helvetica');
    doc.text(String(idx), 53, y);
    doc.text(item.itemName, 73, y, { width: 120 });
    doc.text(item.purity, 200, y);
    doc.text(`${Number(item.netWeight).toFixed(3)}g`, 245, y);
    doc.text(`Rs.${this.formatAmount(Number(item.valuation))}`, 320, y);
    doc.y = y + 12;
  }

  private statementHeader(doc: PDFKit.PDFDocument, width: number): void {
    const y = doc.y;
    doc.rect(40, y, width, 16).fill('#e0e0e0').fillColor('black');
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('#', 43, y + 4);
    doc.text('Girvi No.', 60, y + 4, { width: 90 });
    doc.text('Customer', 155, y + 4, { width: 100 });
    doc.text('Due Date', 260, y + 4);
    doc.text('Status', 320, y + 4);
    doc.text('Principal', 380, y + 4);
    doc.y = y + 18;
  }

  private statementRow(doc: PDFKit.PDFDocument, idx: number, g: { girviNumber: string; customer: { name: string }; dueDate: Date; status: string; principalAmount: object }, width: number): void {
    const y = doc.y;
    doc.fontSize(8).font('Helvetica');
    doc.text(String(idx), 43, y);
    doc.text(g.girviNumber, 60, y, { width: 90 });
    doc.text(g.customer.name, 155, y, { width: 100 });
    doc.text(this.formatDate(g.dueDate), 260, y);
    doc.text(g.status, 320, y);
    doc.text(`Rs.${this.formatAmount(Number(g.principalAmount))}`, 380, y);
    doc.y = y + 14;
  }

  private formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
