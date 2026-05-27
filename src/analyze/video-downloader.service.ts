import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks', 
];

const INVIDIOUS_INSTANCES = [
  'https://invidious.jing.rocks',
  'https://inv.tux.pizza',
  'https://invidious.io.lol',
  'https://invidious.privacydev.net',
];


@Injectable()
export class VideoDownloaderService {
  private readonly logger = new Logger(VideoDownloaderService.name);
  private readonly uploadDir: string;
  private readonly cookiesPath: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    this.cookiesPath = path.join(this.uploadDir, 'yt-cookies.txt');
    fs.mkdirSync(this.uploadDir, { recursive: true });
    this.initCookies();
  }

  private initCookies(): void {
    const b64 = this.config.get<string>('YOUTUBE_COOKIES_B64');
    if (b64) {
      try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        fs.writeFileSync(this.cookiesPath, decoded, 'utf8');
        this.logger.log('YouTube cookies written from YOUTUBE_COOKIES_B64');
      } catch (err) {
        this.logger.warn(`Failed to write cookies from base64: ${String(err)}`);
      }
      return;
    }
    const raw = this.config.get<string>('YOUTUBE_COOKIES');
    if (raw) {
      try {
        fs.writeFileSync(this.cookiesPath, raw, 'utf8');
        this.logger.log('YouTube cookies written from YOUTUBE_COOKIES');
      } catch (err) {
        this.logger.warn(`Failed to write cookies from raw: ${String(err)}`);
      }
      return;
    }
    this.logger.warn('No YOUTUBE_COOKIES env var — will rely on secret file');
  }

  private getCookiesArgs(): string[] {
    const candidatePaths = [
      process.env.YTDLP_COOKIES_PATH,
      '/etc/secrets/cookies.txt',
      this.cookiesPath,
    ].filter(Boolean) as string[];

    for (const sourcePath of candidatePaths) {
      if (fs.existsSync(sourcePath)) {
        try {
          const writablePath = path.join(os.tmpdir(), 'yt_cookies.txt');
          fs.copyFileSync(sourcePath, writablePath);
          fs.chmodSync(writablePath, 0o600);
          this.logger.log(`Cookies loaded from: ${sourcePath}`);
          return ['--cookies', writablePath];
        } catch (err) {
          this.logger.warn(`Failed to copy cookies from ${sourcePath}: ${String(err)}`);
        }
      }
    }

    this.logger.warn('No cookies file found — bot detection may trigger');
    return [];
  }

  async download(url: string): Promise<string> {
    const outputPath = path.join(this.uploadDir, `video-${uuidv4()}.mp4`);
    this.logger.log(`Downloading video → ${outputPath}`);

    // ── YouTube ─────────────────────────────────────────────────────────────
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // 1. Try Piped
      const pipedUrl = await this.resolveViaPiped(url);
      if (pipedUrl) {
        try {
          await this.downloadDirectUrl(pipedUrl, outputPath);
          this.logger.log(`YouTube via Piped complete → ${outputPath}`);
          return outputPath;
        } catch (err) {
          this.logger.warn(`Piped stream failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 2. Try Invidious
      const invidiousUrl = await this.resolveViaInvidious(url);
      if (invidiousUrl) {
        try {
          await this.downloadDirectUrl(invidiousUrl, outputPath);
          this.logger.log(`YouTube via Invidious complete → ${outputPath}`);
          return outputPath;
        } catch (err) {
          this.logger.warn(`Invidious stream failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 3. yt-dlp with cookies last resort
      try {
        await this.runYtDlp(this.buildArgs(url, outputPath));
        this.logger.log(`YouTube via yt-dlp complete → ${outputPath}`);
        return outputPath;
      } catch (err) {
        throw new InternalServerErrorException(
          `YouTube download failed. Please upload the video directly instead.`,
        );
      }
    }

    // ── Rumble ──────────────────────────────────────────────────────────────
    if (url.includes('rumble.com')) {
      try {
        const embedUrl = await this.resolveRumbleUrl(url);
        this.logger.log(`Rumble: using embed URL → ${embedUrl}`);
        await this.runYtDlp(this.buildArgs(embedUrl, outputPath));
        this.logger.log(`Rumble download complete → ${outputPath}`);
        return outputPath;
      } catch (err) {
        this.logger.warn(`Rumble embed failed: ${err instanceof Error ? err.message : String(err)} — trying original URL`);
      }
    }

    // ── Generic yt-dlp fallback ──────────────────────────────────────────────
    await this.runYtDlp(this.buildArgs(url, outputPath));
    this.logger.log(`Download complete → ${outputPath}`);
    return outputPath;
  }

  // ── Piped resolver ─────────────────────────────────────────────────────────
  private async resolveViaPiped(url: string): Promise<string | null> {
    const videoId = url.match(/(?:v=|youtu\.be\/|live\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) return null;

    for (const instance of PIPED_INSTANCES) {
      try {
        this.logger.log(`Trying Piped: ${instance} | videoId=${videoId}`);
        const res = await fetch(`${instance}/streams/${videoId}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) { this.logger.warn(`Piped ${instance} returned ${res.status}`); continue; }

        const data = await res.json() as {
          videoStreams?: Array<{ url: string; quality: string; format: string; videoOnly: boolean }>;
          error?: string;
        };

        if (data.error) { this.logger.warn(`Piped ${instance} error: ${data.error}`); continue; }
        if (!data.videoStreams?.length) { this.logger.warn(`Piped ${instance}: no streams`); continue; }

        const stream =
          data.videoStreams.find(s => !s.videoOnly && s.quality === '720p' && s.format === 'MPEG_4') ??
          data.videoStreams.find(s => !s.videoOnly && s.format === 'MPEG_4') ??
          data.videoStreams.find(s => !s.videoOnly) ??
          data.videoStreams[0];

        if (!stream?.url) continue;

        this.logger.log(`Piped resolved | ${instance} | quality=${stream.quality}`);
        return stream.url;
      } catch (err) {
        this.logger.warn(`Piped ${instance} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.warn('All Piped instances failed');
    return null;
  }

  // ── Invidious resolver ─────────────────────────────────────────────────────
  private async resolveViaInvidious(url: string): Promise<string | null> {
    const videoId = url.match(/(?:v=|youtu\.be\/|live\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) return null;

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        this.logger.log(`Trying Invidious: ${instance} | videoId=${videoId}`);
        const res = await fetch(
          `${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats,formatStreams`,
          {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
          },
        );

        if (!res.ok) { this.logger.warn(`Invidious ${instance} returned ${res.status}`); continue; }

        const data = await res.json() as {
          formatStreams?: Array<{ url: string; qualityLabel: string; container: string }>;
          adaptiveFormats?: Array<{ url: string; qualityLabel: string; container: string; type: string }>;
          error?: string;
        };

        if (data.error) { this.logger.warn(`Invidious ${instance} error: ${data.error}`); continue; }

        // formatStreams = muxed audio+video (ideal)
        const stream =
          data.formatStreams?.find(s => s.qualityLabel === '720p' && s.container === 'mp4') ??
          data.formatStreams?.find(s => s.container === 'mp4') ??
          data.formatStreams?.[0];

        if (!stream?.url) { this.logger.warn(`Invidious ${instance}: no usable stream`); continue; }

        this.logger.log(`Invidious resolved | ${instance} | quality=${stream.qualityLabel}`);
        return stream.url;
      } catch (err) {
        this.logger.warn(`Invidious ${instance} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    this.logger.warn('All Invidious instances failed');
    return null;
  }

  // ── Direct URL download ────────────────────────────────────────────────────
  private async downloadDirectUrl(url: string, outputPath: string): Promise<void> {
    this.logger.log(`Streaming direct URL → ${outputPath}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.youtube.com',
      },
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) throw new Error(`Direct download failed: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const writer = fs.createWriteStream(outputPath);
    const reader = res.body.getReader();

    await new Promise<void>((resolve, reject) => {
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { writer.end(); break; }
            writer.write(Buffer.from(value));
          }
          writer.on('finish', resolve);
          writer.on('error', reject);
        } catch (err) {
          writer.destroy();
          reject(err);
        }
      };
      pump();
    });
  }

  // ── Rumble oEmbed resolver ─────────────────────────────────────────────────
  private async resolveRumbleUrl(pageUrl: string): Promise<string> {
    const oEmbedUrl = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(pageUrl)}`;
    const res = await fetch(oEmbedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Rumble oEmbed returned ${res.status}`);
    const data = await res.json() as { html?: string };
    const srcMatch = data.html?.match(/src="(https:\/\/rumble\.com\/embed\/[^"]+)"/);
    if (!srcMatch) throw new Error('No embed URL in Rumble oEmbed');
    return srcMatch[1];
  }

  // ── yt-dlp args builder ────────────────────────────────────────────────────
  // private buildArgs(url: string, outputPath: string): string[] {
  //   const args = [
  //     '--no-playlist',
  //     '--format', 'bv*[height<=720]+ba/b[height<=720]/bv*+ba/b',
  //     '--merge-output-format', 'mp4',
  //     '--output', outputPath,
  //     '--no-warnings',
  //     '--socket-timeout', '30',
  //     '--retries', '3',
  //     '--fragment-retries', '3',
  //     '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  //     '--add-header', 'Accept-Language:en-US,en;q=0.9',
  //   ];

  //   args.push(...this.getCookiesArgs());

  //   if (url.includes('rumble.com')) {
  //     args.push('--add-header', 'Referer:https://rumble.com');
  //   }

  //   const proxyUrl = this.config.get<string>('PROXY_URL');
  //   if (proxyUrl) args.push('--proxy', proxyUrl);

  //   args.push(url);
  //   return args;
  // }

  private buildArgs(url: string, outputPath: string): string[] {
    const args = [
      '--no-playlist',
      '--format', 'bv*[height<=720]+ba/b[height<=720]/bv*+ba/b',
      '--merge-output-format', 'mp4',
      '--output', outputPath,
      '--no-warnings',
      '--socket-timeout', '30',
      '--retries', '3',
      '--fragment-retries', '3',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      '--add-header', 'Accept-Language:en-US,en;q=0.9',
    ];

    // Use proxy for YouTube — this is the main bot bypass
    const proxyUrl = this.config.get<string>('PROXY_URL');
    if (proxyUrl && (url.includes('youtube.com') || url.includes('youtu.be'))) {
      args.push('--proxy', proxyUrl);
      // Tell yt-dlp to use web client which works better with proxies
      args.push('--extractor-args', 'youtube:player_client=web,mweb');
    }

    // Cookies as secondary fallback only
    args.push(...this.getCookiesArgs());
    
    const ytUser = this.config.get<string>('YT_USERNAME');
    const ytPass = this.config.get<string>('YT_PASSWORD');
    if (ytUser && ytPass) {
      args.push('--username', ytUser, '--password', ytPass);
    }

    if (url.includes('rumble.com')) {
      args.push('--add-header', 'Referer:https://rumble.com');
    }

    args.push(url);
    return args;
  }

  async cleanup(...paths: string[]): Promise<void> {
    for (const p of paths) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    }
  }

  private runYtDlp(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('yt-dlp', args);
      const err: Buffer[] = [];
      proc.stderr?.on('data', (d: Buffer) => err.push(d));
      proc.on('close', (code) => {
        if (code === 0) return resolve();
        const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
        reject(new InternalServerErrorException(`yt-dlp failed: ${msg}`));
      });
      proc.on('error', () =>
        reject(new InternalServerErrorException('yt-dlp not found. Install it in PATH.')),
      );
    });
  }
}
