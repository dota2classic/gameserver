import { performance } from 'perf_hooks';
import { Logger } from '@nestjs/common';

const logger = new Logger('Performance');

type PromiseOrT<T> = T extends Promise<infer B> ? B : T;

export async function measureN<T>(
  callback: () => Promise<T>,
  msg: string = '',
): Promise<T> {
  const start = performance.now();
  const result = callback();
  if (result instanceof Promise) {
    result.then(() => {
      const finish = performance.now();
      logger.verbose(
        `Promise execution time: ${finish - start} milliseconds, ` + msg,
      );
    });
  } else {
    const finish = performance.now();
    logger.verbose(`Execution time: ${finish - start} milliseconds, ` + msg);
  }

  return result;
}
export const measure = (msg: string) => (
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) => {
  const originalMethod = descriptor.value;

  descriptor.value = function(...args) {
    const start = performance.now();
    const result = originalMethod.apply(this, args);
    if (result instanceof Promise) {
      result.then(() => {
        const finish = performance.now();
        logger.verbose(
          `Promise execution time: ${finish - start} milliseconds [${msg}]`,
        );
      });
    } else {
      const finish = performance.now();
      logger.verbose(`Execution time: ${finish - start} milliseconds [${msg}]`);
    }

    return result;
  };
};
