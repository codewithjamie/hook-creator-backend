import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegStatic = require('ffmpeg-static') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffprobeStatic = require('ffprobe-static') as { path: string };
// sound path for the audio file
const TRANSITION_SOUND_PATH = path.join(process.cwd(), 'assets', 'transition.mp3');


@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly uploadDir: string;
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR', '/tmp/openedge-uploads');
    this.ffmpegPath = config.get<string>('FFMPEG_PATH', '') || ffmpegStatic;
    this.ffprobePath = config.get<string>('FFPROBE_PATH', '') || ffprobeStatic.path;
  }

  async getDuration(filePath: string): Promise<number> {
    const raw = await this.runCommand(this.ffprobePath, [
      '-v', 'quiet', '-print_format', 'json',
      '-show_format', filePath,
    ]);
    const data = JSON.parse(raw) as { format: { duration: string } };
    return parseFloat(data.format.duration ?? '0');
  }

  async extractClip(sourcePath: string, startTime: number, endTime: number): Promise<string> {
    const duration = endTime - startTime;
    const outputPath = path.join(this.uploadDir, `clip-${uuidv4()}.mp4`);

    this.logger.log(`Extracting clip [${startTime}s → ${endTime}s] duration=${duration.toFixed(2)}s`);

    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-ss', String(startTime),
      '-i', sourcePath,
      '-t', String(duration),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    return outputPath;
  }

  async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        videoPath,
      ]);
      const out: Buffer[] = [];
      proc.stdout?.on('data', (d: Buffer) => out.push(d));
      proc.on('close', (code) => {
        if (code !== 0) return resolve(0);
        try {
          const json = JSON.parse(Buffer.concat(out).toString());
          resolve(parseFloat(json.format?.duration ?? '0'));
        } catch {
          resolve(0);
        }
      });
      proc.on('error', () => resolve(0));
    });
  }

  // async mergeWithCrossfade(hookPath: string, fullVideoPath: string): Promise<string> {
  //   const outputPath = path.join(this.uploadDir, `merged-${uuidv4()}.mp4`);
  //   const hookDuration = await this.getDuration(hookPath);
  //   const crossfadeDuration = 0.5;
  //   const xfadeOffset = Math.max(0, hookDuration - crossfadeDuration);
  //   const flashStart = Math.max(0, xfadeOffset - 0.1);

  //   this.logger.log(
  //     `Crossfade merge | hookDuration=${hookDuration.toFixed(3)}s | offset=${xfadeOffset.toFixed(3)}s`,
  //   );

  //   // ── Step 1: Add flash + whoosh to hook clip ──────────────────────────────
  //   // Do this as a separate pass first — avoids complex filter graph failures
  //   // when running multiple merges in parallel
  //   const flashedHookPath = path.join(this.uploadDir, `flashed-${uuidv4()}.mp4`);
  //   const flashStartTime = Math.max(0, hookDuration - 0.1);
  //   const whooshStart = Math.max(0, flashStartTime - 1.0);

  //   await this.runCommand(this.ffmpegPath, [
  //     '-y',
  //     '-i', hookPath,
  //     '-filter_complex',
  //     [
  //       // Flash: longer 0.75s, fires at very end of hook
  //       `[0:v]curves=` +
  //         `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
  //         `:all='0/0 0.3/1 1/1'[vflash]`,

  //       // Impact hit sound — short sharp thud (low frequency punch)
  //       // 60Hz sine burst for 0.3s = deep cinematic impact hit
  //       `aevalsrc=` +
  //         `0.4*sin(2*PI*60*t)*exp(-8*t)` +   // deep thud that decays fast
  //         `+0.2*sin(2*PI*180*t)*exp(-12*t)` + // mid-frequency body
  //         `+0.1*sin(2*PI*440*t)*exp(-20*t)`+  // high transient click on attack
  //         `:s=44100:d=${hookDuration.toFixed(3)}` +
  //         `,volume=` +
  //           `enable='between(t,${whooshStart.toFixed(3)},${(whooshStart + 0.4).toFixed(3)})':` +
  //           `volume=1.0` +
  //         `[impact]`,

  //       // Mix impact under original audio
  //       `[0:a][impact]amix=inputs=2:duration=first:weights=1 0.5[amixed]`,
  //     ].join(';'),
  //     '-map', '[vflash]',
  //     '-map', '[amixed]',
  //     '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
  //     '-c:a', 'aac', '-b:a', '192k',
  //     flashedHookPath,
  //   ]);
  //   // await this.runCommand(this.ffmpegPath, [
  //   //   '-y',
  //   //   '-i', hookPath,
  //   //   '-filter_complex',
  //   //   [
  //   //     // Flash: brightness spike at transition point
  //   //     `[0:v]curves=` +
  //   //       `enable='between(t,${flashStart.toFixed(3)},${(flashStart + 0.5).toFixed(3)})'` +
  //   //       `:all='0/0 0.4/1 1/1'[vflash]`,

  //   //     // Whoosh: sine sweep tone
  //   //     `aevalsrc=0.3*sin(2*PI*(280-200*t)*t):s=44100:d=${hookDuration.toFixed(3)}` +
  //   //       `,volume=enable='between(t,${Math.max(0, xfadeOffset - 0.3).toFixed(3)},${hookDuration.toFixed(3)})':volume=1.0` +
  //   //       `[whoosh]`,

  //   //     // Mix whoosh under original audio
  //   //     `[0:a][whoosh]amix=inputs=2:duration=first:weights=1 0.35[amixed]`,
  //   //   ].join(';'),
  //   //   '-map', '[vflash]',
  //   //   '-map', '[amixed]',
  //   //   '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
  //   //   '-c:a', 'aac', '-b:a', '192k',
  //   //   flashedHookPath,
  //   // ]);


  //   // ── Step 2: xfade dissolve flashed hook into full video ──────────────────
  //   const flashedDuration = await this.getDuration(flashedHookPath);
  //   const finalOffset = Math.max(0, flashedDuration - crossfadeDuration);

  //   await this.runCommand(this.ffmpegPath, [
  //     '-y',
  //     '-i', flashedHookPath,
  //     '-i', fullVideoPath,
  //     '-filter_complex',
  //     [
  //       `[0:v][1:v]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${finalOffset.toFixed(3)}[vout]`,
  //       `[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[aout]`,
  //     ].join(';'),
  //     '-map', '[vout]',
  //     '-map', '[aout]',
  //     '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
  //     '-c:a', 'aac', '-b:a', '192k',
  //     '-movflags', '+faststart',
  //     outputPath,
  //   ]);

  //   // Cleanup intermediate flashed hook
  //   this.cleanup(flashedHookPath);

  //   this.logger.log(`Crossfade merge with whoosh+flash complete → ${outputPath}`);
  //   return outputPath;
  // }

  // working file before the final
  // async mergeWithCrossfade(hookPath: string, fullVideoPath: string): Promise<string> {
  //   const outputPath = path.join(this.uploadDir, `merged-${uuidv4()}.mp4`);
  //   const hookDuration = await this.getDuration(hookPath);
  //   const crossfadeDuration = 0.5;
  //   const xfadeOffset = Math.max(0, hookDuration - crossfadeDuration);
  //   const flashStartTime = Math.max(0, hookDuration - 0.1);
  //   const impactTime = Math.max(0, flashStartTime - 1.0);

  //   this.logger.log(
  //     `Crossfade merge | hookDuration=${hookDuration.toFixed(3)}s | impactAt=${impactTime.toFixed(3)}s | flashAt=${flashStartTime.toFixed(3)}s`,
  //   );

  //   // ── Step 1: Generate impact sound as a standalone WAV file ──────────────
  //   // A cinematic "sting" — sharp attack + low rumble + high shimmer
  //   // Generated as its own file so timing is guaranteed
  //   const impactAudioPath = path.join(this.uploadDir, `impact-${uuidv4()}.wav`);

  //   await this.runCommand(this.ffmpegPath, [
  //     '-y',
  //     '-f', 'lavfi',
  //     '-i',
  //     // Three layers mixed together:
  //     //  1. Low boom: 55Hz sine, sharp decay — the "thud" you feel
  //     //  2. Mid crack: 220Hz, very fast decay — the "snap"
  //     //  3. High shimmer: 1200Hz, medium decay — the "zing" that signals transition
  //     `aevalsrc=` +
  //       `0.6*sin(2*PI*55*t)*exp(-5*t)` +
  //       `+0.5*sin(2*PI*220*t)*exp(-15*t)` +
  //       `+0.35*sin(2*PI*1200*t)*exp(-10*t)` +
  //       `:s=44100:d=0.8`,
  //     '-c:a', 'pcm_s16le',
  //     impactAudioPath,
  //   ]);

  //   this.logger.log(`Impact sound generated → ${impactAudioPath}`);

  //   // ── Step 2: Add flash + impact sound to hook clip ────────────────────────
  //   const flashedHookPath = path.join(this.uploadDir, `flashed-${uuidv4()}.mp4`);

  //   await this.runCommand(this.ffmpegPath, [
  //     '-y',
  //     '-i', hookPath,
  //     '-i', impactAudioPath,
  //     '-filter_complex',
  //     [
  //       // Flash: 0.75s brightness spike at end of hook
  //       `[0:v]curves=` +
  //         `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
  //         `:all='0/0 0.3/1 1/1'[vflash]`,

  //       // Delay the impact audio to fire exactly 1 second before flash
  //       `[1:a]adelay=${Math.round(impactTime * 1000)}|${Math.round(impactTime * 1000)}[impactdelayed]`,

  //       // Mix impact with hook audio — impact at 60% volume
  //       `[0:a][impactdelayed]amix=inputs=2:duration=first:weights=1 0.6[amixed]`,
  //     ].join(';'),
  //     '-map', '[vflash]',
  //     '-map', '[amixed]',
  //     '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
  //     '-c:a', 'aac', '-b:a', '192k',
  //     flashedHookPath,
  //   ]);

  //   // ── Step 3: xfade dissolve flashed hook into full video ──────────────────
  //   const flashedDuration = await this.getDuration(flashedHookPath);
  //   const finalOffset = Math.max(0, flashedDuration - crossfadeDuration);

  //   await this.runCommand(this.ffmpegPath, [
  //     '-y',
  //     '-i', flashedHookPath,
  //     '-i', fullVideoPath,
  //     '-filter_complex',
  //     [
  //       `[0:v][1:v]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${finalOffset.toFixed(3)}[vout]`,
  //       `[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[aout]`,
  //     ].join(';'),
  //     '-map', '[vout]',
  //     '-map', '[aout]',
  //     '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
  //     '-c:a', 'aac', '-b:a', '192k',
  //     '-movflags', '+faststart',
  //     outputPath,
  //   ]);

  //   // Cleanup intermediates
  //   this.cleanup(flashedHookPath, impactAudioPath);

  //   this.logger.log(`Crossfade merge complete → ${outputPath}`);
  //   return outputPath;
  // }

  async mergeWithCrossfade(hookPath: string, fullVideoPath: string): Promise<string> {
    const outputPath = path.join(this.uploadDir, `merged-${uuidv4()}.mp4`);
    const hookDuration = await this.getDuration(hookPath);
    const crossfadeDuration = 0.5;
    const xfadeOffset = Math.max(0, hookDuration - crossfadeDuration);
    const flashStartTime = Math.max(0, hookDuration - 0.1);

    // Sound fires 1 second before the flash
    // const soundStartMs = Math.max(0, Math.round((flashStartTime - 1.0) * 1000));
    const soundStartMs = Math.max(0, Math.round(flashStartTime * 1000));


    this.logger.log(
      `Crossfade merge | hookDuration=${hookDuration.toFixed(3)}s | soundAt=${(soundStartMs / 1000).toFixed(3)}s | flashAt=${flashStartTime.toFixed(3)}s`,
    );

    // Verify transition sound exists
    if (!require('fs').existsSync(TRANSITION_SOUND_PATH)) {
      this.logger.warn(
        `Transition sound not found at ${TRANSITION_SOUND_PATH} — merging without sound`,
      );
      return this.mergeWithCrossfadeNoSound(hookPath, fullVideoPath, outputPath, hookDuration, xfadeOffset, flashStartTime);
    }

    // ── Step 1: Add flash + transition sound to hook clip ────────────────────
    const flashedHookPath = path.join(this.uploadDir, `flashed-${uuidv4()}.mp4`);

    this.logger.log(`Transition sound found at ${TRANSITION_SOUND_PATH}`);

    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-i', hookPath,
      '-i', TRANSITION_SOUND_PATH,
      '-filter_complex',
      [
        // Flash: 0.75s brightness spike at end of hook
        `[0:v]curves=` +
          `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
          `:all='0/0 0.3/1 1/1'[vflash]`,

        // Delay transition sound to fire 1s before flash
        `[1:a]adelay=${soundStartMs}|${soundStartMs}[sounddelayed]`,

        // Mix transition sound with hook audio at 80% volume
        `[0:a][sounddelayed]amix=inputs=2:duration=first:weights=1 1.5[amixed]`,
      ].join(';'),
      '-map', '[vflash]',
      '-map', '[amixed]',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      flashedHookPath,
    ]);

    this.logger.log(`Flash + transition sound applied → ${flashedHookPath}`);

    // ── Step 2: xfade dissolve flashed hook into full video ──────────────────
    const flashedDuration = await this.getDuration(flashedHookPath);
    const finalOffset = Math.max(0, flashedDuration - crossfadeDuration);

    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-i', flashedHookPath,
      '-i', fullVideoPath,
      '-filter_complex',
      [
        `[0:v][1:v]xfade=transition=dissolve:duration=${crossfadeDuration}:offset=${finalOffset.toFixed(3)}[vout]`,
        `[0:a][1:a]acrossfade=d=${crossfadeDuration}:c1=exp:c2=exp[aout]`,
      ].join(';'),
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    this.cleanup(flashedHookPath);
    this.logger.log(`Crossfade merge complete → ${outputPath}`);
    return outputPath;
  }

  // Fallback — no transition sound
  private async mergeWithCrossfadeNoSound(
    hookPath: string,
    fullVideoPath: string,
    outputPath: string,
    hookDuration: number,
    xfadeOffset: number,
    flashStartTime: number,
  ): Promise<string> {
    const flashedHookPath = path.join(this.uploadDir, `flashed-${uuidv4()}.mp4`);

    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-i', hookPath,
      '-filter_complex',
      `[0:v]curves=` +
        `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
        `:all='0/0 0.3/1 1/1'[vflash]`,
      '-map', '[vflash]',
      '-map', '0:a',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      flashedHookPath,
    ]);

    const flashedDuration = await this.getDuration(flashedHookPath);
    const finalOffset = Math.max(0, flashedDuration - 0.5);

    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-i', flashedHookPath,
      '-i', fullVideoPath,
      '-filter_complex',
      [
        `[0:v][1:v]xfade=transition=dissolve:duration=0.5:offset=${finalOffset.toFixed(3)}[vout]`,
        `[0:a][1:a]acrossfade=d=0.5:c1=exp:c2=exp[aout]`,
      ].join(';'),
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    this.cleanup(flashedHookPath);
    return outputPath;
  }

  async extractAudioMp3(videoPath: string): Promise<string> {
    const outputPath = path.join(this.uploadDir, `audio-${uuidv4()}.mp3`);
    await this.runCommand(this.ffmpegPath, [
      '-y', '-i', videoPath,
      '-vn', '-ar', '16000', '-ac', '1', '-b:a', '64k',
      outputPath,
    ]);
    return outputPath;
  }

  cleanup(...paths: string[]): void {
    for (const p of paths) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    }
  }

  async extractHookOnly(hookPath: string): Promise<string> {
    const outputPath = path.join(this.uploadDir, `hook-only-${uuidv4()}.mp4`);
    const hookDuration = await this.getDuration(hookPath);
    const flashStartTime = Math.max(0, hookDuration - 0.1);
    const soundStartMs = Math.max(0, Math.round(flashStartTime * 1000));

    this.logger.log(`Extracting hook-only clip | duration=${hookDuration.toFixed(3)}s`);

    const fs = require('fs') as typeof import('fs');

    if (!fs.existsSync(TRANSITION_SOUND_PATH)) {
      // No sound — just return the hook clip as-is with flash
      await this.runCommand(this.ffmpegPath, [
        '-y',
        '-i', hookPath,
        '-filter_complex',
        `[0:v]curves=` +
          `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
          `:all='0/0 0.3/1 1/1'[vflash]`,
        '-map', '[vflash]',
        '-map', '0:a',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        outputPath,
      ]);
      return outputPath;
    }

    await this.runCommand(this.ffmpegPath, [
      '-y',
      '-i', hookPath,
      '-i', TRANSITION_SOUND_PATH,
      '-filter_complex',
      [
        `[0:v]curves=` +
          `enable='between(t,${flashStartTime.toFixed(3)},${(flashStartTime + 0.75).toFixed(3)})'` +
          `:all='0/0 0.3/1 1/1'[vflash]`,
        `[1:a]adelay=${soundStartMs}|${soundStartMs}[sounddelayed]`,
        `[0:a][sounddelayed]amix=inputs=2:duration=first:weights=1 0.8[amixed]`,
      ].join(';'),
      '-map', '[vflash]',
      '-map', '[amixed]',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    this.logger.log(`Hook-only clip ready → ${outputPath}`);
    return outputPath;
  }

  private runCommand(binary: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(binary, args);
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      proc.stdout?.on('data', (d: Buffer) => out.push(d));
      proc.stderr?.on('data', (d: Buffer) => err.push(d));
      proc.on('close', (code) => {
        if (code === 0) return resolve(Buffer.concat(out).toString());
        const msg = Buffer.concat(err).toString().split('\n').slice(-3).join('\n');
        reject(new InternalServerErrorException(`FFmpeg error: ${msg}`));
      });
      proc.on('error', (e) => reject(new InternalServerErrorException(`FFmpeg spawn error: ${e.message}`)));
    });
  }
}