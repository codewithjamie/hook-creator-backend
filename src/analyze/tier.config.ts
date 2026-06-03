import { UserTier } from '../users/entities/user.entity';

export interface TierConfig {
  maxVisibleHooks: number;
  hookScoreVisible: boolean;
  bridgeSentenceVisible: boolean;
  fileUploadAllowed: boolean;
  rebuildAllowed: boolean;
  watermark: boolean;
  maxResolution: '720p' | '1080p' | '4K';
  monthlyUploadLimit: number; // only counts file uploads, not URL
  historyDays: number;
}

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  free: {
    maxVisibleHooks: 1,
    hookScoreVisible: false,
    bridgeSentenceVisible: false,
    fileUploadAllowed: true,
    rebuildAllowed: false,
    watermark: true,
    maxResolution: '720p',
    monthlyUploadLimit: 10,
    historyDays: 0,
  },
  creator: {
    maxVisibleHooks: 6,
    hookScoreVisible: true,
    bridgeSentenceVisible: true,
    fileUploadAllowed: true,
    rebuildAllowed: true,
    watermark: false,
    maxResolution: '1080p',
    monthlyUploadLimit: 100,
    historyDays: 7,
  },
  pro: {
    maxVisibleHooks: 6,
    hookScoreVisible: true,
    bridgeSentenceVisible: true,
    fileUploadAllowed: true,
    rebuildAllowed: true,
    watermark: false,
    maxResolution: '4K',
    monthlyUploadLimit: 200,
    historyDays: 30,
  },
  agency: {
    maxVisibleHooks: 6,
    hookScoreVisible: true,
    bridgeSentenceVisible: true,
    fileUploadAllowed: true,
    rebuildAllowed: true,
    watermark: false,
    maxResolution: '4K',
    monthlyUploadLimit: 500,
    historyDays: 90,
  },
};

export function getTierConfig(tier: UserTier): TierConfig {
  return TIER_CONFIGS[tier] ?? TIER_CONFIGS['free'];
}