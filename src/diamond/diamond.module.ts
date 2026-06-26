import { Module } from '@nestjs/common';
import { DiamondController } from './controllers/diamond.controller';
import { DiamondService } from './services/diamond.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DiamondController],
  providers: [DiamondService],
  exports: [DiamondService],
})
export class DiamondModule {}
