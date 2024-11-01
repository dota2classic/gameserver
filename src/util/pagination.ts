import { Page } from 'rest/dto/page';

export function makePage<R, T = R>(items: R[], total: number, page: number, perPage: number, mapper: (R) => T = x => x): Page<T> {

  return {
    data: items.map(mapper),
    page,
    perPage: perPage,
    pages: Math.ceil(total / perPage),
  }
}
