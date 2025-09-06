import { CommandBus, EventBus, EventPublisher, IEvent, ofType, QueryBus } from '@nestjs/cqrs';
import { Provider, Type } from '@nestjs/common';
import { RuntimeRepository } from 'util/runtime-repository';

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
  EventPublisher
];

export function clearRepositories() {
  // @ts-ignore
  RuntimeRepository.clearAll();
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
