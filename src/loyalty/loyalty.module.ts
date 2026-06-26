import { Module } from '@nestjs/common';
import { LoyaltyController } from './controllers/loyalty.controller';
import { LoyaltyService } from './services/loyalty.service';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
