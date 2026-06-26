import { Module } from '@nestjs/common';
import { BarcodeController } from './controllers/barcode.controller';
import { BarcodeService } from './services/barcode.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [BarcodeController],
  providers: [BarcodeService],
  exports: [BarcodeService],
})
export class BarcodeModule {}
