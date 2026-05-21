import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoDownloaderService {
  private readonly logger = new Logger(VideoDownloaderService.name);
  private readonly uploadDir: string;
  private readonly cookiesPath: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    this.cookiesPath = path.join(this.uploadDir, 'yt-cookies.txt');
    fs.mkdirSync(this.uploadDir, { recursive: true });
    this.writeCookies();
  }

  private writeCookies(): void {
    const b64 = this.config.get<string>('YOUTUBE_COOKIES_B64');
    this.logger.log(`YOUTUBE_COOKIES_B64 present: ${!!b64} | length: ${b64?.length ?? 0}`);
    if (b64) {
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      this.logger.log(`Decoded cookies preview: ${decoded.substring(0, 50)}`);
      fs.writeFileSync(this.cookiesPath, decoded, 'utf8');
      this.logger.log('YouTube cookies written from base64 env var');
      return;
    }
    this.logger.warn('YOUTUBE_COOKIES not set — YouTube bot-detection may trigger');
  }

  private get hasCookies(): boolean {
    return fs.existsSync(this.cookiesPath);
  }

  async download(url: string): Promise<string> {
    const outputPath = path.join(this.uploadDir, `video-${uuidv4()}.mp4`);
    this.logger.log(`Downloading video → ${outputPath}`);

   if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        await this.downloadYouTubeDirect(url, outputPath);
        this.logger.log(`YouTube ytdl-core download complete → ${outputPath}`);
        return outputPath;
      } catch (err) {
        this.logger.warn(`ytdl-core failed: ${err instanceof Error ? err.message : String(err)} — trying yt-dlp`);
      }
    }

    if (url.includes('rumble.com')) {
      try {
        const embedUrl = await this.resolveRumbleUrl(url);
        this.logger.log(`Rumble: using embed URL → ${embedUrl}`);
        await this.runYtDlp(this.buildArgs(embedUrl, outputPath));
        return outputPath;
      } catch (err) {
        this.logger.warn(`Rumble embed strategy failed: ${err instanceof Error ? err.message : String(err)}`);
      }
  }

  await this.runYtDlp(this.buildArgs(url, outputPath));
  this.logger.log(`Download complete → ${outputPath}`);
  return outputPath;
  }

  private async downloadYouTubeDirect(url: string, outputPath: string): Promise<void> {
    const ytdl = require('@distube/ytdl-core');
    
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { 
      quality: 'highestvideo',
      filter: (f: any) => f.container === 'mp4' && f.height <= 720
    });

    await new Promise<void>((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, { format });
      const writer = fs.createWriteStream(outputPath);
      stream.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
      stream.on('error', reject);
    });
  }

  private async resolveYouTubeUrl(url: string): Promise<string> {
    this.logger.log(`Resolving YouTube URL via cobalt → ${url}`);

    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        url,
        quality: '720',
        downloadMode: 'auto',
        filenameStyle: 'basic',
      }),
    });

    const raw = await res.text();
    this.logger.log(`Cobalt raw response (${res.status}): ${raw.substring(0, 200)}`);

    if (!res.ok) throw new Error(`Cobalt API returned ${res.status}: ${raw}`);

    const data = JSON.parse(raw) as { status: string; url?: string; tunnel?: string };
    const videoUrl = data.url ?? data.tunnel;
    if (!videoUrl) throw new Error(`No URL in Cobalt response: ${raw}`);

    return videoUrl;
  }

  // ── Rumble oEmbed resolver ─────────────────────────────────────────────────
  private async resolveRumbleUrl(pageUrl: string): Promise<string> {
    this.logger.log(`Resolving Rumble oEmbed → ${pageUrl}`);

    const oEmbedUrl = `https://rumble.com/api/Media/oembed.json?url=${encodeURIComponent(pageUrl)}`;
    const res = await fetch(oEmbedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`Rumble oEmbed returned ${res.status}`);

    const data = await res.json() as { html?: string };
    this.logger.log(`Rumble oEmbed response keys: ${Object.keys(data).join(', ')}`);

    // Extract embed URL from iframe html field
    const srcMatch = data.html?.match(/src="(https:\/\/rumble\.com\/embed\/[^"]+)"/);
    if (!srcMatch) throw new Error('No embed URL in Rumble oEmbed html field');

    // Return just the embed URL — caller will use yt-dlp on it
    return srcMatch[1];
  }

  private async scrapeRumbleEmbed(embedUrl: string): Promise<string> {
    this.logger.log(`Scraping Rumble embed page → ${embedUrl}`);

    const res = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://rumble.com',
      },
    });

    if (!res.ok) throw new Error(`Rumble embed page returned ${res.status}`);

    const html = await res.text();

    // Rumble embeds have a JSON blob with the mp4 URL
    const jsonMatch = html.match(/var\s+videoConfig\s*=\s*(\{[\s\S]*?\});/) ??
                      html.match(/"url"\s*:\s*"(https:[^"]+\.mp4[^"]*)"/);

    if (jsonMatch) {
      // Try full JSON parse first
      try {
        const config = JSON.parse(jsonMatch[1]);
        const mp4 = config?.media?.url ?? config?.u;
        if (mp4) return mp4;
      } catch {
        // Fall through to regex match
        if (jsonMatch[1].startsWith('http')) return jsonMatch[1].replace(/\\u0026/g, '&');
      }
    }

    // Fallback: find any .mp4 URL in the page
    const mp4Match = html.match(/(https:\/\/[^"'\s]+\.mp4[^"'\s]*)/);
    if (mp4Match) return mp4Match[1].replace(/\\u0026/g, '&');

    throw new Error('Could not extract MP4 URL from Rumble embed page');
  }

  // ── Direct URL download (for resolved Rumble URLs) ────────────────────────
  private async downloadDirectUrl(url: string, outputPath: string): Promise<void> {
    this.logger.log(`Downloading direct URL → ${outputPath}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://rumble.com',
      },
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

  // ── yt-dlp args builder ───────────────────────────────────────────────────
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

    if (this.hasCookies) {
      args.push('--cookies', this.cookiesPath);
    }

    if (url.includes('rumble.com')) {
      args.push('--add-header', 'Referer:https://rumble.com');
    }

    args.push(url);
    return args;
  }

  async cleanup(...paths: string[]): Promise<void> {
    for (const p of paths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {}
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