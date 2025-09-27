// achievement.decorator.ts
import { Injectable } from '@nestjs/common';

export const ACHIEVEMENT_METADATA_KEY = 'ACHIEVEMENT';

export function Achievement(): ClassDecorator {
  return (target: Function) => {
    // Mark as NestJS Injectable
    Injectable()(target);

    // Add custom metadata
    Reflect.defineMetadata(ACHIEVEMENT_METADATA_KEY, true, target);
  };
}
