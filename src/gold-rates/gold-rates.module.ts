import { Module } from '@nestjs/common';
import { GoldRateController } from './controllers/gold-rate.controller';
import { GoldRateService } from './services/gold-rate.service';

@Module({
  controllers: [GoldRateController],
  providers: [GoldRateService],
  exports: [GoldRateService],
})
export class GoldRatesModule {}
