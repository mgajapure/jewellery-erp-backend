import { Module } from '@nestjs/common';
import { KarigarController } from './controllers/karigar.controller';
import { KarigarService } from './services/karigar.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [KarigarController],
  providers: [KarigarService],
  exports: [KarigarService],
})
export class KarigarModule {}
