import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { AnalysisEntity } from '../analyze/entities/analysis.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisEntity])],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
