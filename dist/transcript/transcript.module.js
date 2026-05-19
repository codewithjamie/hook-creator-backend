"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptModule = void 0;
const common_1 = require("@nestjs/common");
const transcript_service_1 = require("./transcript.service");
const whisper_service_1 = require("./whisper.service");
const hooks_module_1 = require("../hooks/hooks.module");
let TranscriptModule = class TranscriptModule {
};
exports.TranscriptModule = TranscriptModule;
exports.TranscriptModule = TranscriptModule = __decorate([
    (0, common_1.Module)({
        imports: [hooks_module_1.HooksModule],
        providers: [transcript_service_1.TranscriptService, whisper_service_1.WhisperService],
        exports: [transcript_service_1.TranscriptService],
    })
], TranscriptModule);
//# sourceMappingURL=transcript.module.js.map