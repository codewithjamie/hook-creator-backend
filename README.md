# OpenEdge NestJS — Video Hook Analysis API v2

> Production-grade NestJS backend that analyzes videos, identifies viral hooks, and produces seamless crossfade clips using FFmpeg xfade dissolve.

---

## Architecture Overview

```
POST /api/v1/analyze
        │
        ▼
 AnalyzeController
        │  (multipart/form-data: video_url OR videoFile)
        ▼
 AnalyzeService ──────────────────────────────────────────────────┐
        │                                                          │
        ├── Platform Detection                                     │
        │     ├── YoutubeService   (yt-dlp download)              │
        │     ├── RumbleService    (yt-dlp download)              │
        │     ├── GoogleDriveService (axios stream download)      │
        │     └── UploadService   (multer disk storage)           │
        │                                                          │
        ├── FfmpegService.probe()  ──► video metadata             │
        │                                                          │
        ├── TranscriptService                                      │
        │     ├── YouTube captions (youtube-transcript lib)       │
        │     └── WhisperService   (OpenAI Whisper fallback)      │
        │           └── OpenEdgeUtilsService.mergeWhisper...()    │
        │                                                          │
        ├── ClaudeService.selectHooks()  ──► 6 ranked hooks       │
        │     └── PromptService.buildHookPrompt()                 │
        │                                                          │
        ├── HookValidationService.validate()                      │
        │                                                          │
        └── VideoService.createCrossfadeClip()  ◄─────────────────┘
              ├── FfmpegService.extractClip()      [hook segment]
              ├── FfmpegService.ensureAudioTrack() [pad silence if needed]
              ├── FfmpegService.mergeWithCrossfade()
              │     └── xfade=dissolve + acrossfade (0.5s)
              └── CloudinaryService.uploadVideo()
```

---

## Crossfade Implementation

The key improvement over the original Python system is the **seamless xfade dissolve** between the hook clip and the full video.

### How it works

```bash
# 1. Extract hook clip (re-encoded for clean keyframes)
ffmpeg -ss {startTime} -i source.mp4 -t {duration} \
  -c:v libx264 -preset fast -crf 23 -c:a aac hook.mp4

# 2. Probe hook duration dynamically
ffprobe -v quiet -print_format json -show_format hook.mp4
# → durationSeconds = e.g. 8.234s

# 3. Compute offset
# xfadeOffset = hookDuration - 0.5
# → 8.234 - 0.5 = 7.734

# 4. Apply crossfade
ffmpeg -i hook.mp4 -i full_video.mp4 \
  -filter_complex \
    "[0:v][1:v]xfade=transition=dissolve:duration=0.5:offset=7.734[v];
     [0:a][1:a]acrossfade=d=0.5:c1=exp:c2=exp[a]" \
  -map [v] -map [a] \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  output.mp4
```

**Result:** A single MP4 where the hook naturally dissolves into the full video with no hard cut, no text overlay, no branding.

---

## Quick Start

### 1. Clone & configure

```bash
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, OPENAI_API_KEY, CLOUDINARY_*
```

### 2. Run with Docker

```bash
docker compose up --build
```

### 3. Run locally

```bash
# Prerequisites: Node 20+, FFmpeg, yt-dlp
npm install
npm run start:dev
```

---

## API Reference

### `POST /api/v1/analyze`

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `video_url` | string | ✓ or file | YouTube, Rumble, Google Drive, or generic video URL |
| `videoFile` | file | ✓ or url | Direct video upload (mp4, mov, avi, mkv, webm) |
| `min_hook_duration` | number | No | Min hook length in seconds (default: 6) |
| `max_hook_duration` | number | No | Max hook length in seconds (default: 12) |
| `transcript_source` | string | No | `auto` \| `youtube_captions` \| `whisper` |

**Response:**

```json
{
  "success": true,
  "data": {
    "clipUrl": "https://res.cloudinary.com/.../merged-clip.mp4",
    "startTime": 42.5,
    "endTime": 51.2,
    "bridgeSentence": "What happens next will change how you think about this forever.",
    "whySelected": "Opens with a counterintuitive claim that creates immediate curiosity...",
    "hookScore": 87,
    "transcriptSource": "youtube_captions",
    "fullHooks": [
      {
        "rank": 1,
        "startTime": 42.5,
        "endTime": 51.2,
        "bridgeSentence": "...",
        "whySelected": "...",
        "hookScore": 87,
        "startSentence": "What most people don't realize is...",
        "endSentence": "...and that's what changed everything."
      }
      // ... 5 more
    ],
    "meta": {
      "processingTimeMs": 45230,
      "videoTitle": "How I Built a $1M Business in 12 Months",
      "platform": "youtube",
      "videoDurationSeconds": 842.3
    }
  }
}
```

### `GET /api/v1/health`

Health check for Railway / Render / ECS probes.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | ✓ | — | Claude API key |
| `OPENAI_API_KEY` | ✓ | — | Whisper API key |
| `CLOUDINARY_CLOUD_NAME` | ✓ | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✓ | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✓ | — | Cloudinary API secret |
| `CLOUDINARY_FOLDER` | No | `openedge-clips` | Cloudinary upload folder |
| `PORT` | No | `3000` | HTTP port |
| `MAX_FILE_SIZE_MB` | No | `500` | Max upload size |
| `UPLOAD_DIR` | No | `/tmp/openedge-uploads` | Temp file directory |
| `THROTTLE_TTL` | No | `60` | Rate limit window (seconds) |
| `THROTTLE_LIMIT` | No | `20` | Requests per window |
| `DEFAULT_HOOK_MIN_DURATION` | No | `6` | Min hook seconds |
| `DEFAULT_HOOK_MAX_DURATION` | No | `12` | Max hook seconds |
| `WHISPER_CHUNK_DURATION_SECONDS` | No | `600` | Chunk size for large audio |
| `LOG_LEVEL` | No | `info` | Pino log level |

---

## Deployment

### Railway

```bash
# railway.toml is auto-detected
railway up
# Set env vars in Railway dashboard
```

### Render

1. New Web Service → Connect repo
2. Build Command: `npm run build`
3. Start Command: `node dist/main`
4. Add env vars
5. Render provides FFmpeg — add yt-dlp via Shell: `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp`

### AWS ECS / Fargate

Use the provided Dockerfile. Recommended: 2 vCPU, 4 GB RAM minimum (FFmpeg is CPU-intensive).

---

## Module Structure

```
src/
├── common/
│   ├── dto/analyze.dto.ts          # All TypeScript types/DTOs
│   ├── filters/http-exception.filter.ts
│   ├── interceptors/transform.interceptor.ts
│   ├── pipes/video-file-validation.pipe.ts
│   └── health/health.controller.ts
├── analyze/                        # Unified endpoint
│   ├── analyze.controller.ts       # POST /analyze
│   ├── analyze.service.ts          # Pipeline orchestration
│   └── analyze.module.ts
├── youtube/youtube.service.ts      # yt-dlp YouTube download
├── rumble/rumble.service.ts        # yt-dlp Rumble download
├── google-drive/google-drive.service.ts  # axios GDrive download
├── upload/upload.service.ts        # multer file handling
├── video-processing/
│   ├── ffmpeg.service.ts           # ★ xfade crossfade core
│   ├── cloudinary.service.ts       # Upload stream
│   └── video.service.ts            # Pipeline orchestrator
├── ai/
│   ├── claude.service.ts           # Anthropic API
│   └── prompt.service.ts           # Hook + caption prompts
├── transcript/
│   ├── transcript.service.ts       # YouTube captions + Whisper fallback
│   └── whisper.service.ts          # OpenAI Whisper + chunking
├── hooks/
│   ├── hook-validation.service.ts  # Port of validate_hooks()
│   └── openedge-utils.service.ts   # Port of openedge_utils.py
└── main.ts
```
