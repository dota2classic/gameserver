import { CallHandler, ExecutionContext, HttpException, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PATH_METADATA } from '@nestjs/common/constants';
import * as path from 'path';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class ReqLoggingInterceptor implements NestInterceptor {
  public static readonly SLOW_REQUEST_MS = 1000;

  private readonly logger = new Logger("HTTP_REQUEST");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req: FastifyRequest = context.switchToHttp().getRequest();
    const res: FastifyReply = context.switchToHttp().getResponse();

    const requestPath = path.posix.join(
      Reflect.getMetadata(PATH_METADATA, context.getClass()),
      Reflect.getMetadata(PATH_METADATA, context.getHandler()),
    );

    const start = performance.now();
    const line = (status: number) =>
      `${req.method} ${requestPath} ${status} ${Math.round(performance.now() - start)}ms`;

    return next.handle().pipe(
      tap({
        next: () => {
          if (res.statusCode >= 500) {
            this.logger.error(line(res.statusCode));
          } else if (performance.now() - start > ReqLoggingInterceptor.SLOW_REQUEST_MS) {
            this.logger.warn(`Slow request ${line(res.statusCode)}`);
          }
        },
        error: (e) => {
          const status = e instanceof HttpException ? e.getStatus() : 500;
          const message = `${line(status)} ${e?.message ?? e}`;
          if (status >= 500) {
            this.logger.error(message);
          } else {
            this.logger.warn(message);
          }
        },
      }),
    );
  }
}
