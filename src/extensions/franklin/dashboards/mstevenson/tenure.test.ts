import { describe, expect, it } from 'vitest';
import { tenurePlot } from './tenure';

describe('tenurePlot', () => {
  it('splits counts into inside and outside the tenure', () => {
    const plot = tenurePlot(
      [
        { year: 1755, count: 1 },
        { year: 1760, count: 3 },
        { year: 1780, count: 2 },
      ],
      1757,
      1775,
    );
    expect(plot.inside).toBe(3);
    expect(plot.outside).toBe(3);
    expect(plot.years[0].year).toBe(1755);
    expect(plot.years.at(-1)?.year).toBe(1780);
    expect(plot.years.find((y) => y.year === 1760)?.inside).toBe(true);
  });

  it('still draws the tenure axis with no data', () => {
    const plot = tenurePlot([], 1757, 1775);
    expect(plot.years).toHaveLength(19);
    expect(plot.inside).toBe(0);
  });
});
