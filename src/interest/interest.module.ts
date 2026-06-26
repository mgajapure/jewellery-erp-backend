import { Module } from '@nestjs/common';
import { InterestService } from './services/interest.service';

@Module({
  providers: [InterestService],
  exports: [InterestService],
})
export class InterestModule {}
