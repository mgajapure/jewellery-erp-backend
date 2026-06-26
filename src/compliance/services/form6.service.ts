import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import PDFDocument from 'pdfkit';

// Maharashtra Pawnbrokers Act — Form 6: Daily Cash Book
@Injectable()
export class Form6Service {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, date: Date): Promise<Buffer> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [tenant, girvis, payments] = await Promise.all([
      this.prisma.tenant.findFirstOrThrow({ where: { id: tenantId } }),
      this.prisma.girvi.findMany({
        where: { tenantId, startDate: { gte: dayStart, lte: dayEnd }, deletedAt: null },
        include: { customer: { select: { name: true, mobile: true } } },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.girviPayment.findMany({
        where: { tenantId, paymentDate: { gte: dayStart, lte: dayEnd } },
        include: {
          girvi: {
            select: { girviNumber: true, customer: { select: { name: true } } },
          },
        },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    const totalLoaned = girvis.reduce((s, g) => s + Number(g.principalAmount), 0);
    const totalReceived = payments.reduce((s, p) => s + Number(p.totalPaid), 0);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;

      // Header
      doc.fontSize(11).font('Helvetica-Bold').text('FORM No. 6', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('[See Rule 7(2)]', { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').text('Cash Book', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Name of Pawnbroker: ${tenant.name}`);
      doc.text(`Address: ${tenant.address ?? ''}, ${tenant.city ?? ''}`);
      doc.text(`Date: ${this.formatDate(date)}`);
      doc.moveDown(1);

      // Loans section
      doc.fontSize(10).font('Helvetica-Bold').text('PART A — LOANS GRANTED');
      doc.moveDown(0.3);
      this.tableHeader5Col(doc, ['Sr.', 'Girvi No.', 'Customer', 'Amount (₹)', 'Remarks'], pageWidth);

      let srNo = 1;
      for (const g of girvis) {
        this.tableRow5Col(doc, [
          String(srNo++),
          g.girviNumber,
          g.customer.name,
          this.formatAmount(Number(g.principalAmount)),
          '',
        ], pageWidth);
      }

      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').text(
        `Total Loans Granted: Rs. ${this.formatAmount(totalLoaned)}`,
        { align: 'right' },
      );
      doc.moveDown(1);

      // Repayments section
      doc.fontSize(10).font('Helvetica-Bold').text('PART B — REPAYMENTS RECEIVED');
      doc.moveDown(0.3);
      this.tableHeader5Col(doc, ['Sr.', 'Receipt No.', 'Girvi No.', 'Customer', 'Amount (₹)'], pageWidth);

      srNo = 1;
      for (const p of payments) {
        this.tableRow5Col(doc, [
          String(srNo++),
          p.receiptNumber ?? '',
          p.girvi.girviNumber,
          p.girvi.customer?.name ?? '',
          this.formatAmount(Number(p.totalPaid)),
        ], pageWidth);
      }

      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold').text(
        `Total Repayments Received: Rs. ${this.formatAmount(totalReceived)}`,
        { align: 'right' },
      );
      doc.moveDown(1);

      // Net cash
      doc.moveTo(40, doc.y).lineTo(40 + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`Net Cash Out (Loans − Repayments): Rs. ${this.formatAmount(totalLoaned - totalReceived)}`);
      doc.moveDown(2);

      // Signature
      doc.fontSize(9).font('Helvetica').text('___________________________', 40);
      doc.text('Signature of Pawnbroker / Authorised Person');
      doc.text(`Date: ${this.formatDate(date)}`);

      doc.end();
    });
  }

  private tableHeader5Col(doc: PDFKit.PDFDocument, cols: string[], width: number): void {
    const y = doc.y;
    const colWidths = this.getColWidths(width);
    doc.rect(40, y, width, 16).fill('#e8e8e8').fillColor('black');
    doc.fontSize(8).font('Helvetica-Bold');
    let x = 40;
    cols.forEach((col, i) => {
      doc.text(col, x + 3, y + 4, { width: colWidths[i] - 6 });
      x += colWidths[i];
    });
    doc.y = y + 18;
  }

  private tableRow5Col(doc: PDFKit.PDFDocument, cols: string[], width: number): void {
    const y = doc.y;
    const colWidths = this.getColWidths(width);
    doc.fontSize(8).font('Helvetica');
    let x = 40;
    cols.forEach((col, i) => {
      doc.text(col, x + 3, y, { width: colWidths[i] - 6 });
      x += colWidths[i];
    });
    doc.y = y + 14;
  }

  private getColWidths(width: number): number[] {
    return [30, width * 0.22, width * 0.30, width * 0.22, width * 0.18];
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
