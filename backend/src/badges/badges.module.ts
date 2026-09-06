import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateBadge } from './entities/candidate-badge.entity';
import { Attempt } from '../attempts/entities/attempt.entity';
import { BadgesService } from './badges.service';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateBadge, Attempt])],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
