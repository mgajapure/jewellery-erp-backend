import { Module } from '@nestjs/common';
import { ComplianceController } from './controllers/compliance.controller';
import { Form6Service } from './services/form6.service';
import { Form9Service } from './services/form9.service';
import { Form11Service } from './services/form11.service';
import { Form12Service } from './services/form12.service';
import { Form13Service } from './services/form13.service';
import { Section25Service } from './services/section25.service';

@Module({
  controllers: [ComplianceController],
  providers: [
    Form6Service,
    Form9Service,
    Form11Service,
    Form12Service,
    Form13Service,
    Section25Service,
  ],
  exports: [Form6Service, Form12Service, Form11Service, Section25Service],
})
export class ComplianceModule {}
