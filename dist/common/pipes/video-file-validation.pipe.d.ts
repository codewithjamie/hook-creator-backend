import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare class VideoFileValidationPipe implements PipeTransform {
    transform(file: Express.Multer.File | undefined, _metadata: ArgumentMetadata): Express.Multer.File | undefined;
}
