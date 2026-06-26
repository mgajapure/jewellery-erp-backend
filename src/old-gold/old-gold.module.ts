import { Module } from '@nestjs/common';
import { OldGoldController } from './controllers/old-gold.controller';
import { OldGoldService } from './services/old-gold.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [OldGoldController],
  providers: [OldGoldService],
  exports: [OldGoldService],
})
export class OldGoldModule {}
