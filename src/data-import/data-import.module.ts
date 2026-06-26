import { Module } from '@nestjs/common';
import { DataImportController } from './controllers/data-import.controller';
import { DataImportService } from './services/data-import.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DataImportController],
  providers: [DataImportService],
  exports: [DataImportService],
})
export class DataImportModule {}
