import { Module } from '@nestjs/common';
import { GstFilingController } from './controllers/gst-filing.controller';
import { GstFilingService } from './services/gst-filing.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [GstFilingController],
  providers: [GstFilingService],
  exports: [GstFilingService],
})
export class GstFilingModule {}
