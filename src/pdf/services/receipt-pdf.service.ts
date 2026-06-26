import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface ReceiptData {
  receiptNumber: string;
  date: Date;
  // Shop
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopGstin?: string;
  // Customer
  customerName: string;
  customerMobile: string;
  // Girvi
  girviNumber: string;
  startDate: Date;
  dueDate: Date;
  originalPrincipal: number;
  // Payment
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  totalPaid: number;
  paymentMode: string;
  // Balances after payment
  principalBalance: number;
  notes?: string;
}

@Injectable()
export class ReceiptPdfService {
  async generate(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A5', margin: 30 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.render(doc, data);
      doc.end();
    });
  }

  // Thermal 80mm receipt format for WhatsApp sharing
  async generateThermal(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [226.77, 500], margin: 10 }); // 80mm wide
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderThermal(doc, data);
      doc.end();
    });
  }

  private render(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const pageWidth = doc.page.width - 60;

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text(data.shopName, { align: 'center' });
    doc.fontSize(9).font('Helvetica').text(data.shopAddress, { align: 'center' });
    doc.text(`Ph: ${data.shopPhone}`, { align: 'center' });
    if (data.shopGstin) doc.text(`GSTIN: ${data.shopGstin}`, { align: 'center' });
    doc.moveDown(0.5);

    // Receipt title
    doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);

    // Receipt meta
    const metaY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text(`Receipt No: ${data.receiptNumber}`, 30, metaY);
    doc.text(`Date: ${this.formatDate(data.date)}`, 250, metaY);
    doc.moveDown(0.8);

    // Customer & Girvi info
    doc.fontSize(9).font('Helvetica-Bold').text('Customer Details');
    doc.font('Helvetica');
    doc.text(`Name: ${data.customerName}   Mobile: ${data.customerMobile}`);
    doc.text(`Girvi No: ${data.girviNumber}`);
    doc.text(`Loan Date: ${this.formatDate(data.startDate)}   Due: ${this.formatDate(data.dueDate)}`);
    doc.moveDown(0.5);

    // Payment breakdown table
    doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).dash(2, { space: 2 }).stroke().undash();
    doc.moveDown(0.3);

    doc.fontSize(9).font('Helvetica-Bold').text('Payment Breakdown');
    doc.moveDown(0.3);
    this.paymentRow(doc, 'Principal Paid', data.principalPaid, pageWidth);
    this.paymentRow(doc, 'Interest Paid', data.interestPaid, pageWidth);
    if (data.penaltyPaid > 0) this.paymentRow(doc, 'Penalty Paid', data.penaltyPaid, pageWidth);

    doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
    doc.moveDown(0.3);
    this.paymentRow(doc, 'TOTAL PAID', data.totalPaid, pageWidth, true);
    doc.moveDown(0.3);
    doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).stroke();
    doc.moveDown(0.5);

    // Payment mode
    doc.fontSize(9).font('Helvetica').text(`Payment Mode: ${this.formatPaymentMode(data.paymentMode)}`);
    doc.moveDown(0.3);

    // Balance info
    doc.rect(30, doc.y, pageWidth, 30).fill('#f5f5f5').fillColor('black');
    const balY = doc.y + 8;
    doc.fontSize(9).font('Helvetica').text(`Principal Balance: Rs. ${this.formatAmount(data.principalBalance)}`, 35, balY);
    doc.y = balY + 20;

    if (data.notes) {
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica').text(`Note: ${data.notes}`);
    }

    doc.moveDown(1);
    doc.moveTo(30, doc.y).lineTo(30 + pageWidth, doc.y).dash(2, { space: 2 }).stroke().undash();
    doc.moveDown(0.5);

    // Signature
    doc.fontSize(8).font('Helvetica').text('___________________________', 30);
    doc.text('Authorised Signatory');
    doc.moveDown(0.5);
    doc.fontSize(7).text('This is a computer-generated receipt.', { align: 'center' });
    doc.text('Thank you for your payment!', { align: 'center' });
  }

  private renderThermal(doc: PDFKit.PDFDocument, data: ReceiptData): void {
    const w = doc.page.width - 20;

    doc.fontSize(10).font('Helvetica-Bold').text(data.shopName, { align: 'center' });
    doc.fontSize(7).font('Helvetica').text(data.shopAddress, { align: 'center' });
    doc.text(`Ph: ${data.shopPhone}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(10, doc.y).lineTo(10 + w, doc.y).stroke();
    doc.fontSize(9).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
    doc.moveTo(10, doc.y).lineTo(10 + w, doc.y).stroke();
    doc.moveDown(0.3);

    doc.fontSize(7).font('Helvetica');
    doc.text(`Receipt: ${data.receiptNumber}`);
    doc.text(`Date: ${this.formatDate(data.date)}`);
    doc.text(`Customer: ${data.customerName}`);
    doc.text(`Mobile: ${data.customerMobile}`);
    doc.text(`Girvi: ${data.girviNumber}`);
    doc.moveDown(0.3);
    doc.moveTo(10, doc.y).lineTo(10 + w, doc.y).dash(2, { space: 2 }).stroke().undash();
    doc.moveDown(0.3);

    this.thermalRow(doc, 'Principal Paid', data.principalPaid, w);
    this.thermalRow(doc, 'Interest Paid', data.interestPaid, w);
    if (data.penaltyPaid > 0) this.thermalRow(doc, 'Penalty', data.penaltyPaid, w);

    doc.moveTo(10, doc.y).lineTo(10 + w, doc.y).stroke();
    doc.moveDown(0.2);
    this.thermalRow(doc, 'TOTAL', data.totalPaid, w, true);
    doc.moveDown(0.2);
    doc.moveTo(10, doc.y).lineTo(10 + w, doc.y).stroke();
    doc.moveDown(0.3);

    doc.fontSize(7).font('Helvetica').text(`Mode: ${this.formatPaymentMode(data.paymentMode)}`);
    doc.text(`Balance: Rs. ${this.formatAmount(data.principalBalance)}`);
    doc.moveDown(0.5);
    doc.fontSize(7).text('Thank you!', { align: 'center' });
    doc.fontSize(6).text('Computer generated receipt.', { align: 'center' });
  }

  private paymentRow(
    doc: PDFKit.PDFDocument,
    label: string,
    amount: number,
    width: number,
    bold = false,
  ): void {
    const y = doc.y;
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.fontSize(9).font(font).text(label, 30, y, { width: width - 100 });
    doc.text(`Rs. ${this.formatAmount(amount)}`, 30 + width - 100, y, { width: 100, align: 'right' });
    doc.moveDown(0.3);
  }

  private thermalRow(
    doc: PDFKit.PDFDocument,
    label: string,
    amount: number,
    width: number,
    bold = false,
  ): void {
    const y = doc.y;
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.fontSize(7).font(font).text(label, 10, y, { width: width - 70 });
    doc.text(`Rs.${this.formatAmount(amount)}`, 10 + width - 70, y, { width: 70, align: 'right' });
    doc.moveDown(0.2);
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private formatPaymentMode(mode: string): string {
    const map: Record<string, string> = {
      CASH: 'Cash',
      UPI: 'UPI',
      CARD: 'Card',
      CHEQUE: 'Cheque',
      BANK_TRANSFER: 'Bank Transfer',
      ONLINE: 'Online',
    };
    return map[mode] ?? mode;
  }
}
