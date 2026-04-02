import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

describe('shuffleWithFisherYates', () => {
  it('returns the same array reference (mutates in place)', () => {
    const array = [1, 2, 3, 4, 5];
    const result = shuffleWithFisherYates(array);
    expect(result).toBe(array);
  });

  it('output has same length as input', () => {
    const array = [1, 2, 3, 4, 5];
    shuffleWithFisherYates(array);
    expect(array).toHaveLength(array.length);
  });

  it('output contains all original elements', () => {
    const array = [1, 2, 3, 4, 5];
    shuffleWithFisherYates(array);
    expect(array.sort()).toEqual(array);
  });

  it('two-element array swaps when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const array = [1, 2];
    shuffleWithFisherYates(array);
    expect(array).toEqual([2, 1]);
  });

  it('two-element array stays same when Math.random returns 0.999', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const array = [1, 2];
    shuffleWithFisherYates(array);
    expect(array).toEqual([1, 2]);
  });

  it('with groupSize=2 swaps pairs of elements', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const array = [1, 2, 3, 4];
    shuffleWithFisherYates(array, 2);
    expect(array).toEqual([3, 4, 1, 2]);
  });

  it('with groupSize=3 swaps triples', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const array = [1, 2, 3, 4, 5, 6];
    shuffleWithFisherYates(array, 3);
    expect(array).toEqual([4, 5, 6, 1, 2, 3]);
  });

  it('groupSize larger than array returns array unchanged', () => {
    const array = [1, 2, 3];
    const original = [...array];
    shuffleWithFisherYates(array, 10);
    expect(array).toEqual(original);
  });
});
