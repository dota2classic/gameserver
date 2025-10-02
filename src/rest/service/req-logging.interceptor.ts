// Import required modules
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PATH_METADATA } from '@nestjs/common/constants';
import * as path from 'path';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class ReqLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP_REQUEST");

  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Extract request and response objects
    const req: FastifyRequest = context.switchToHttp().getRequest();
    const res: FastifyReply = context.switchToHttp().getResponse();

    const handler = context.getHandler();
    const controller = Reflect.getMetadata(PATH_METADATA, context.getClass());

    const requestPath = path.join(
      controller,
      Reflect.getMetadata(PATH_METADATA, handler),
    );

    const start = performance.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          method: req.method,
          path: requestPath,
          duration: (performance.now() - start) / 1000,
        });
      }),
    );
  }
}
