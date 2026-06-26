import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import PDFDocument from 'pdfkit';

// Maharashtra Pawnbrokers Act — Form 12: Receipt to Debtor (issued at time of pledge)
@Injectable()
export class Form12Service {
  constructor(private readonly prisma: PrismaService) {}

  async generate(tenantId: string, girviId: string): Promise<Buffer> {
    const girvi = await this.prisma.girvi.findFirstOrThrow({
      where: { id: girviId, tenantId },
      include: {
        customer: true,
        tenant: true,
        items: true,
      },
    });

    const tenant = girvi.tenant;
    const customer = girvi.customer;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 60;

      // Statutory header
      doc.fontSize(11).font('Helvetica-Bold').text('FORM No. 12', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('[See Rule 16(1)]', { align: 'center' });
      doc.fontSize(11).font('Helvetica-Bold').text('RECEIPT TO DEBTOR', { align: 'center' });
      doc.fontSize(9).font('Helvetica').text('Maharashtra Pawnbrokers Act, 2014', { align: 'center' });
      doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
      doc.moveDown(0.5);

      // Pawnbroker details
      doc.fontSize(9).font('Helvetica-Bold').text('Pawnbroker:');
      doc.font('Helvetica');
      doc.text(`${tenant.name}`);
      doc.text(`${tenant.address ?? ''}`);
      if (tenant.gstin) doc.text(`GSTIN: ${tenant.gstin}`);
      doc.text(`Phone: ${tenant.phone}`);
      doc.moveDown(0.5);

      doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).dash(2, { space: 2 }).stroke().undash();
      doc.moveDown(0.3);

      // Pledge details
      doc.fontSize(9).font('Helvetica-Bold').text('Pledge Details:');
      doc.font('Helvetica');
      doc.text(`Girvi No: ${girvi.girviNumber}`);
      doc.text(`Date of Pledge: ${this.formatDate(girvi.startDate)}`);
      doc.text(`Repayment Due By: ${this.formatDate(girvi.dueDate)}`);
      doc.moveDown(0.5);

      // Debtor details
      doc.font('Helvetica-Bold').text('Debtor (Borrower):');
      doc.font('Helvetica');
      doc.text(`Name: ${customer.name}`);
      doc.text(`Mobile: ${customer.mobile}`);
      if (customer.address) doc.text(`Address: ${customer.address}`);
      if (customer.aadhaarNumber) doc.text(`Aadhaar: XXXX-XXXX-${customer.aadhaarNumber.slice(-4)}`);
      if (customer.panNumber) doc.text(`PAN: ${customer.panNumber}`);
      doc.moveDown(0.5);

      // Articles pledged table
      doc.font('Helvetica-Bold').text('Articles Pledged:');
      doc.moveDown(0.3);
      this.itemsTableHeader(doc, pageWidth);
      girvi.items.forEach((item, idx) => {
        this.itemsTableRow(doc, idx + 1, item, pageWidth);
      });
      doc.moveDown(0.3);

      // Loan terms
      doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').text('Loan Terms:');
      doc.font('Helvetica');
      doc.text(`Loan Amount (Principal): Rs. ${this.formatAmount(Number(girvi.principalAmount))}`);
      doc.text(`Rate of Interest: ${girvi.interestRate}% per month`);
      doc.text(`Interest Type: ${this.formatInterestType(girvi.interestType)}`);
      doc.text(`Gold Rate at Pledge: Rs. ${this.formatAmount(Number(girvi.goldRateAtCreation))}/gram (22K)`);
      doc.text(`LTV Ratio: ${girvi.ltv}%`);
      doc.text(`Tenure: ${girvi.tenureMonths} month(s)`);
      doc.moveDown(0.5);

      // Statutory notice
      doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).dash(2, { space: 2 }).stroke().undash();
      doc.moveDown(0.3);
      doc.fontSize(7).font('Helvetica');
      doc.text(
        'NOTICE: If the loan is not repaid within the period specified above, the pawnbroker shall be entitled ' +
        'to auction the pledged goods after giving 14 days\' notice as per Section 25(1) of the Maharashtra ' +
        'Pawnbrokers Act, 2014. The debtor has the right to inspect their pledged articles during business hours.',
      );
      doc.moveDown(1);

      // Signatures
      const sigY = doc.y;
      doc.fontSize(9).font('Helvetica');
      doc.text('___________________', 30, sigY);
      doc.text('___________________', 230, sigY);
      doc.moveDown(0.3);
      doc.text('Debtor Signature / Thumb', 30);
      doc.text('Pawnbroker Signature', 230);

      doc.end();
    });
  }

  private itemsTableHeader(doc: PDFKit.PDFDocument, width: number): void {
    const y = doc.y;
    doc.rect(30, y, width, 16).fill('#e8e8e8').fillColor('black');
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text('#', 33, y + 4);
    doc.text('Description', 50, y + 4, { width: 120 });
    doc.text('Purity', 175, y + 4);
    doc.text('Gross Wt', 215, y + 4);
    doc.text('Net Wt', 265, y + 4);
    doc.text('Value (₹)', 310, y + 4);
    doc.y = y + 18;
  }

  private itemsTableRow(doc: PDFKit.PDFDocument, idx: number, item: { itemName: string; purity: string; grossWeight: object; netWeight: object; valuation: object }, width: number): void {
    const y = doc.y;
    doc.fontSize(7).font('Helvetica');
    doc.text(String(idx), 33, y);
    doc.text(item.itemName, 50, y, { width: 120 });
    doc.text(item.purity, 175, y);
    doc.text(`${Number(item.grossWeight).toFixed(3)}g`, 215, y);
    doc.text(`${Number(item.netWeight).toFixed(3)}g`, 265, y);
    doc.text(this.formatAmount(Number(item.valuation)), 310, y);
    doc.y = y + 14;
  }

  private formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatAmount(n: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }

  private formatInterestType(t: string): string {
    const m: Record<string, string> = { SIMPLE: 'Simple', KATMITI: 'Katmiti (Compound)', DAILY: 'Daily' };
    return m[t] ?? t;
  }
}
