import {
  CommandBus,
  EventBus,
  EventPublisher,
  IEvent,
  IQueryHandler,
  ofType,
  QueryBus,
  QueryHandler,
} from "@nestjs/cqrs";
import { Provider, Type } from "@nestjs/common";
import { RuntimeRepository } from 'util/runtime-repository';
import { TestDataService } from '@test/test-util';

const ebusProvider: Provider = {
  provide: EventBus,
  useFactory: () => ({
    publish: jest.fn(),
  }),
};

const qbusProvider: Provider = {
  provide: QueryBus,
  useFactory: () => ({
    execute: jest.fn(),
  }),
};

const TestEventBus = () => ebusProvider;
const TestQueryBus = () => ({
  provide: QueryBus,
  useClass: QueryBus,
});

const TestCommandBus = () => ({
  provide: CommandBus,
  useClass: CommandBus,
});

export const TestEnvironment = () => [
  TestEventBus(),
  TestCommandBus(),
  TestQueryBus(),
  EventPublisher,
  TestDataService
];

export function clearRepositories() {
  // @ts-ignore
  RuntimeRepository.clearAll();
}

export function mockQuery<T, B>(type: Type<T>, callback: (t: T) => B) {
  const ClassName = `${type.name}Handler`;
  const context = {
    [ClassName]: class implements IQueryHandler<T, B> {
      constructor() {}

      async execute(query: T): Promise<B> {
        return callback(query);
      }
    },
  };

  QueryHandler(type)(context[ClassName]);


  return context[ClassName]
  // return {
  //   provide: `${type.name}Handler`,
  //   useClass: context[ClassName],
  // };
}

export function waitFor<T = any>(ebus: EventBus, event: Type<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(`Event ${event.name} won't come :(`);
    }, 500);
    const unsub = ebus.pipe(ofType(event)).subscribe(e => {
      unsub.unsubscribe();
      resolve(e);
    });
  });
}

declare global {
  namespace jest {
    // noinspection JSUnusedGlobalSymbols
    interface Matchers<R> {
      toEmit(...events: IEvent[]): CustomMatcherResult;
      toEmitNothing(): CustomMatcherResult;
    }
  }
}
