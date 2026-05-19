import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface PlatformInfo {
  platform: string;
  label: string;
  supported: boolean;
  videoId?: string;
}

const YOUTUBE_RE = /(?:youtube\.com|youtu\.be)/;
const RUMBLE_RE = /rumble\.com/;
const GDRIVE_RE = /drive\.google\.com/;
const YOUTUBE_ID_RE = /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  detect(url: string): PlatformInfo {
    if (!url?.trim()) return { platform: 'unknown', label: 'Unknown', supported: false };

    if (YOUTUBE_RE.test(url)) {
      return {
        platform: 'youtube',
        label: 'YouTube',
        supported: true,
        videoId: url.match(YOUTUBE_ID_RE)?.[1],
      };
    }
    if (RUMBLE_RE.test(url)) return { platform: 'rumble', label: 'Rumble', supported: true };
    if (GDRIVE_RE.test(url)) return { platform: 'google_drive', label: 'Google Drive', supported: true };

    return { platform: 'generic', label: 'Video URL', supported: true };
  }

  async fetchVideoTitle(url: string, platform: string): Promise<string | null> {
    try {
      if (platform === 'youtube') {
        const id = url.match(YOUTUBE_ID_RE)?.[1];
        if (!id) return null;
        const res = await axios.get(
          `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${id}&format=json`,
          { timeout: 5000 },
        );
        return (res.data as { title?: string }).title ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }
}