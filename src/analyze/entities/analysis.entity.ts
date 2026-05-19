import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

export type TranscriptSource = 'youtube_captions' | 'whisper';
export type AnalysisPlatform = 'youtube' | 'rumble' | 'google_drive' | 'upload';
export type AnalysisStatus = 'pending' | 'processing' | 'complete' | 'failed';

@Entity('analyses')
export class AnalysisEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'text', nullable: true })
  videoTitle: string | null;

  @Column({ type: 'enum', enum: ['youtube', 'rumble', 'google_drive', 'upload'] })
  platform: AnalysisPlatform;

  @Column({ type: 'enum', enum: ['pending', 'processing', 'complete', 'failed'], default: 'pending' })
  status: AnalysisStatus;

  @Column({ type: 'text', nullable: true })
  clipUrl: string | null;

  @Column({ type: 'float', nullable: true })
  startTime: number | null;

  @Column({ type: 'float', nullable: true })
  endTime: number | null;

  @Column({ type: 'text', nullable: true })
  bridgeSentence: string | null;

  @Column({ type: 'text', nullable: true })
  whySelected: string | null;

  @Column({ type: 'float', nullable: true })
  hookScore: number | null;

  @Column({ type: 'enum', enum: ['youtube_captions', 'whisper'], nullable: true })
  transcriptSource: TranscriptSource | null;

  @Column({ type: 'jsonb', nullable: true })
  fullHooks: object[] | null;

  @Column({ type: 'float', nullable: true })
  videoDurationSeconds: number | null;

  @Column({ type: 'int', default: 1 })
  creditsUsed: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (u: UserEntity) => u.analyses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'uuid' })
  userId: string;
}