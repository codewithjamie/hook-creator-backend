import { Module } from '@nestjs/common';
import { RumbleService } from './rumble.service';

@Module({
  providers: [RumbleService],
  exports: [RumbleService],
})
export class RumbleModule {}
