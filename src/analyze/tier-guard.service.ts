import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { AnalysisEntity } from './entities/analysis.entity';
import { UserEntity, UserTier } from '../users/entities/user.entity';
import { getTierConfig } from './tier.config';

@Injectable()
export class TierGuardService {
  private readonly logger = new Logger(TierGuardService.name);

  constructor(
    @InjectRepository(AnalysisEntity)
    private readonly analyses: Repository<AnalysisEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async getUserTier(userId: string): Promise<UserTier> {
    const user = await this.users.findOne({ where: { id: userId } });
    return (user?.tier ?? 'free') as UserTier;
  }

  async checkFileUploadAllowed(userId: string): Promise<void> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);
    if (!config.fileUploadAllowed) {
      throw new ForbiddenException('File upload is not available on your current plan.');
    }
  }

  async checkRebuildAllowed(userId: string): Promise<void> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);
    if (!config.rebuildAllowed) {
      throw new ForbiddenException(
        'Rebuilding videos is not available on the Free plan. Upgrade to Creator or higher.',
      );
    }
  }

  // Only counts file uploads — URL analyses are unlimited
  async checkMonthlyUploadLimit(userId: string): Promise<void> {
    const tier = await this.getUserTier(userId);
    const config = getTierConfig(tier);
    if (config.monthlyUploadLimit === -1) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.analyses.count({
      where: {
        userId,
        platform: 'upload', // only count file uploads
        status: 'complete',
        createdAt: MoreThanOrEqual(startOfMonth),
      },
    });

    if (count >= config.monthlyUploadLimit) {
      throw new ForbiddenException(
        `Monthly upload limit of ${config.monthlyUploadLimit} reached. Upgrade your plan for more.`,
      );
    }
  }

  applyTierToHooks(hooks: any[], tier: UserTier): any[] {
    const config = getTierConfig(tier);

    return hooks
      .slice(0, config.maxVisibleHooks)
      .map((hook) => ({
        ...hook,
        hookScore: config.hookScoreVisible ? hook.hookScore : null,
        hookScoreLabel: config.hookScoreVisible ? hook.hookScoreLabel : null,
        hookScoreSummary: config.hookScoreVisible ? hook.hookScoreSummary : null,
        bridgeSentence: config.bridgeSentenceVisible ? hook.bridgeSentence : null,
        whySelected: config.bridgeSentenceVisible ? hook.whySelected : null,
      }));
  }
}

// import {
//   Injectable,
//   Logger,
//   ForbiddenException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { AnalysisEntity } from './entities/analysis.entity';
// import { UserEntity, UserTier } from '../users/entities/user.entity';
// import { getTierConfig } from './tier.config';

// @Injectable()
// export class TierGuardService {
//   private readonly logger = new Logger(TierGuardService.name);

//   constructor(
//     @InjectRepository(AnalysisEntity)
//     private readonly analyses: Repository<AnalysisEntity>,
//     @InjectRepository(UserEntity)
//     private readonly users: Repository<UserEntity>,
//   ) {}

//   async getUserTier(userId: string): Promise<UserTier> {
//     const user = await this.users.findOne({ where: { id: userId } });
//     return (user?.tier ?? 'free') as UserTier;
//   }

//   async checkUrlPasteAllowed(userId: string): Promise<void> {
//     const tier = await this.getUserTier(userId);
//     const config = getTierConfig(tier);
//     if (!config.urlPasteAllowed) {
//       throw new ForbiddenException(
//         'URL paste is not available on the Free plan. Upgrade to Creator or higher.',
//       );
//     }
//   }

//   async checkFileUploadAllowed(userId: string): Promise<void> {
//     const tier = await this.getUserTier(userId);
//     const config = getTierConfig(tier);
//     if (!config.fileUploadAllowed) {
//       throw new ForbiddenException('File upload is not available on your current plan.');
//     }
//   }

//   async checkRebuildAllowed(userId: string): Promise<void> {
//     const tier = await this.getUserTier(userId);
//     const config = getTierConfig(tier);
//     if (!config.rebuildAllowed) {
//       throw new ForbiddenException(
//         'Rebuilding videos is not available on the Free plan. Upgrade to Creator or higher.',
//       );
//     }
//   }

//   async checkMonthlyLimit(userId: string): Promise<void> {
//     const tier = await this.getUserTier(userId);
//     const config = getTierConfig(tier);
//     if (config.monthlyLimit === -1) return;

//     const startOfMonth = new Date();
//     startOfMonth.setDate(1);
//     startOfMonth.setHours(0, 0, 0, 0);

//     const count = await this.analyses.count({
//       where: {
//         userId,
//         status: 'complete',
//         createdAt: startOfMonth as any,
//       },
//     });

//     if (count >= config.monthlyLimit) {
//       throw new ForbiddenException(
//         `Monthly limit of ${config.monthlyLimit} extractions reached. Upgrade your plan for more.`,
//       );
//     }
//   }

//   // Filter and sanitize hooks based on tier rules
//   applyTierToHooks(
//     hooks: any[],
//     tier: UserTier,
//   ): any[] {
//     const config = getTierConfig(tier);

//     return hooks
//       .slice(0, config.maxVisibleHooks) // limit visible hooks
//       .map((hook) => ({
//         ...hook,
//         // Blur hook score for free tier
//         hookScore: config.hookScoreVisible ? hook.hookScore : null,
//         hookScoreLabel: config.hookScoreVisible ? hook.hookScoreLabel : null,
//         hookScoreSummary: config.hookScoreVisible ? hook.hookScoreSummary : null,
//         // Hide bridge sentence for free tier
//         bridgeSentence: config.bridgeSentenceVisible ? hook.bridgeSentence : null,
//         whySelected: config.bridgeSentenceVisible ? hook.whySelected : null,
//       }));
//   }
// }
