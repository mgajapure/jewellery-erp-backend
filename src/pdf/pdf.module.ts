import { Module } from '@nestjs/common';
import { KfsPdfService } from './services/kfs-pdf.service';
import { ReceiptPdfService } from './services/receipt-pdf.service';

@Module({
  providers: [KfsPdfService, ReceiptPdfService],
  exports: [KfsPdfService, ReceiptPdfService],
})
export class PdfModule {}
