import { Module } from '@nestjs/common';
import { GirviController } from './controllers/girvi.controller';
import { GirviService } from './services/girvi.service';
import { KfsService } from './services/kfs.service';
import { ReceiptService } from './services/receipt.service';
import { RbiComplianceService } from './services/rbi-compliance.service';
import { CustomersModule } from '../customers/customers.module';
import { VaultModule } from '../vault/vault.module';
import { InterestModule } from '../interest/interest.module';
import { PdfModule } from '../pdf/pdf.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [CustomersModule, VaultModule, InterestModule, PdfModule, FilesModule],
  controllers: [GirviController],
  providers: [GirviService, KfsService, ReceiptService, RbiComplianceService],
  exports: [GirviService, KfsService, ReceiptService, RbiComplianceService],
})
export class GirviModule {}
