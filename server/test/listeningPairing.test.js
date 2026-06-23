const { pairFiles } = require('../lib/listeningPairing');

describe('pairFiles', () => {
  it('pairs audio and question files that share the same filename stem', () => {
    const files = [
      { originalname: 'section1.mp3', path: '/tmp/a' },
      { originalname: 'section1.pdf', path: '/tmp/b' },
    ];
    const { pairs, unpaired } = pairFiles(files);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].audioFile.originalname).toBe('section1.mp3');
    expect(pairs[0].questionFile.originalname).toBe('section1.pdf');
    expect(unpaired).toHaveLength(0);
  });

  it('is case-insensitive and extension-agnostic across audio/question types', () => {
    const files = [
      { originalname: 'Section2.M4A', path: '/tmp/a' },
      { originalname: 'section2.txt', path: '/tmp/b' },
    ];
    const { pairs } = pairFiles(files);
    expect(pairs).toHaveLength(1);
  });

  it('leaves files with no matching counterpart in the unpaired list', () => {
    const files = [
      { originalname: 'orphan.wav', path: '/tmp/a' },
      { originalname: 'other.pdf', path: '/tmp/b' },
    ];
    const { pairs, unpaired } = pairFiles(files);
    expect(pairs).toHaveLength(0);
    expect(unpaired).toHaveLength(2);
    expect(unpaired.find((f) => f.originalname === 'orphan.wav').kind).toBe('audio');
    expect(unpaired.find((f) => f.originalname === 'other.pdf').kind).toBe('question');
  });

  it('treats ambiguous groups (two audio files sharing one stem) as unpaired rather than guessing', () => {
    const files = [
      { originalname: 'dup.mp3', path: '/tmp/a' },
      { originalname: 'dup.wav', path: '/tmp/b' },
      { originalname: 'dup.pdf', path: '/tmp/c' },
    ];
    const { pairs, unpaired } = pairFiles(files);
    expect(pairs).toHaveLength(0);
    expect(unpaired).toHaveLength(3);
  });

  it('ignores files with unrecognised extensions entirely', () => {
    const files = [
      { originalname: 'readme.doc', path: '/tmp/a' },
      { originalname: 'sec.mp3', path: '/tmp/b' },
      { originalname: 'sec.pdf', path: '/tmp/c' },
    ];
    const { pairs, unpaired } = pairFiles(files);
    expect(pairs).toHaveLength(1);
    expect(unpaired).toHaveLength(0);
  });
});
