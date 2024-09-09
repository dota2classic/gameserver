import { ArgumentMetadata, PipeTransform } from '@nestjs/common';

export class NullableIntPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): any {
    const parsed = Number(value)
    if(Number.isNaN(parsed)) return undefined;

    return parsed;
  }

}
