import { describe, expect, it } from 'vitest';
import { presets } from './engine';
import { decodeWand, encodeWand, fromShareHash } from './storage';

describe('build data', () => {
  it('round trips versioned data', () => expect(decodeWand(encodeWand(presets[0]))).toEqual(presets[0]));
  it('rejects unknown spells and malformed data', () => {
    expect(() => decodeWand(encodeWand({...presets[0], slots:['unknown']}))).toThrow();
    expect(() => decodeWand('{}')).toThrow();
    expect(() => decodeWand('x'.repeat(16001))).toThrow();
  });
  it('rejects invalid share data', () => expect(() => fromShareHash('#wand=%21')).toThrow());
});
