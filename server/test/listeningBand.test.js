const { rawScoreToBand } = require('../lib/listeningBand');

describe('rawScoreToBand', () => {
  it('maps the top of the scale to band 9', () => {
    expect(rawScoreToBand(40)).toBe(9);
    expect(rawScoreToBand(39)).toBe(9);
  });

  it('maps known boundary raw scores to their expected bands', () => {
    expect(rawScoreToBand(38)).toBe(8.5);
    expect(rawScoreToBand(30)).toBe(7);
    expect(rawScoreToBand(23)).toBe(6);
    expect(rawScoreToBand(16)).toBe(5);
  });

  it('never throws and returns a low band for 0', () => {
    expect(rawScoreToBand(0)).toBe(2);
  });

  it('is monotonic — a higher raw score never produces a lower band', () => {
    let prevBand = 0;
    for (let score = 0; score <= 40; score += 1) {
      const band = rawScoreToBand(score);
      expect(band).toBeGreaterThanOrEqual(prevBand);
      prevBand = band;
    }
  });
});
