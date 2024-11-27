import { EventBus, IEvent } from '@nestjs/cqrs';
import { inspect } from 'util';
import { expect, jest } from '@jest/globals';


const toEmit = (
  bus: EventBus,
  ...events: IEvent[]
) => {
  if (events === undefined) {
    events = [];
  }

  const p = bus.publish as jest.Mock;

  // console.log(p.mock.calls)
  for (let i = 0; i < events.length; i++) {
    const expected = events[i];

    // for some reason they are emitted in reversed order
    // let actual = p.mock.calls[p.mock.calls.length - i - 1][0];
    if(p.mock.calls[i] === undefined){
      const message: () => string = () =>
        `No event received at [${i}], expected to be ${inspect(
          expected,
        )} but was undefined`;

      return {
        message,
        pass: false
      }
    }
    const actual = p.mock.calls[i][0];

    try {
      expect(actual).toEqual(expected)
    } catch (_) {
      const message: () => string = () =>
        `Received event at [${i}] expected to be ${inspect(
          expected,
        )} but was ${inspect(actual)}`;

      return {
        message,
        pass: false,
      };
    }
  }

  const actual = p.mock.calls.length;

  expect(actual).toEqual(events.length || 0);

  return {
    message: () => "",
    pass: true,
  };
};

expect.extend({
  toEmit,
  toEmitNothing: (bus: EventBus) => toEmit(bus),
});
