import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query } = req;
    const userId = (req as any).user?.id ?? 'anonymous';
    const userEmail = (req as any).user?.email ?? 'unauthenticated';
    const start = Date.now();

    this.logger.log(`${method} ${url} | user=${userEmail} | body=${this.sanitizeBody(body)} | query=${JSON.stringify(query)}`);

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${method} ${url} completed | user=${userEmail} | ${Date.now() - start}ms`);
      }),
      catchError((err) => {
        this.logger.error(
          `${method} ${url} failed | user=${userEmail} | ${Date.now() - start}ms | ${err.message}`,
        );
        return throwError(() => err);
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): string {
    if (!body || Object.keys(body).length === 0) return '(empty)';
    const safe = { ...body };
    if (safe['password']) safe['password'] = '***';
    if (safe['newPassword']) safe['newPassword'] = '***';
    return JSON.stringify(safe);
  }
}