// Import required modules
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PATH_METADATA } from '@nestjs/common/constants';
import * as path from 'path';
import { Request, Response } from 'express';
import { map } from 'rxjs/operators';

@Injectable()
export class ReqLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP_REQUEST");

  constructor()  {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Extract request and response objects
    const req: Request = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();

    const handler = context.getHandler();
    const controller = Reflect.getMetadata(PATH_METADATA, context.getClass());

    const requestPath = path.join(
      controller,
      Reflect.getMetadata(PATH_METADATA, handler),
    );
    //
    // let d0 = performance.now();
    //
    // res.on("finish", () => {
    //   const durationSeconds = (performance.now() - d0) / 1000;
    //   this.logger.log(
    //     `Request ${req.method} ${requestPath} took ${Math.round(durationSeconds * 1000)} ms`,
    //   );
    // });

    const start = performance.now();


    return next.handle().pipe(
      map((data) => {
        const beforeJson = performance.now();
        JSON.stringify(data); // measure serialization cost
        const afterJson = performance.now();
        this.logger.log(`Handler compute: ${(beforeJson - start).toFixed(2)} ms`);
        this.logger.log(
          `Serialization: ${(afterJson - beforeJson).toFixed(2)} ms`,
        );
        return data;
      }),
      tap(() => {
        this.logger.log(
          `Total (until response is flushed): ${(performance.now() - start).toFixed(
            2,
          )} ms`,
        );
      }),
    );
  }
}
