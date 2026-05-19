import { Module } from '@nestjs/common';
import { HookValidationService } from './hook-validation.service';
import { OpenEdgeUtilsService } from './openedge-utils.service';

@Module({
  providers: [HookValidationService, OpenEdgeUtilsService],
  exports: [HookValidationService, OpenEdgeUtilsService],
})
export class HooksModule {}
