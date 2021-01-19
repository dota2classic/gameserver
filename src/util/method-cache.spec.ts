import { cached } from './method-cache';

class Some {

  i = 0;

  @cached(10)
  async getValue(id: number) {
    return this.i++;
  }
}

describe('method-cache', () => {
  it('should cache requests', async () => {
    const tst = new Some();

    const val1 = await tst.getValue(5);
    await expect(val1).toEqual(0);
    await expect(tst.getValue(5)).resolves.toEqual(0);
    await expect(tst.getValue(123)).resolves.toEqual(1);
  });
});
