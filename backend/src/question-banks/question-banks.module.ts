import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionBank } from './entities/question-bank.entity';
import { QuestionBankItem } from './entities/question-bank-item.entity';
import { QuestionBanksService } from './question-banks.service';
import { QuestionBanksController } from './question-banks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionBank, QuestionBankItem])],
  controllers: [QuestionBanksController],
  providers: [QuestionBanksService],
})
export class QuestionBanksModule {}
