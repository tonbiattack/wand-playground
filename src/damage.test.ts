import { expect, it } from 'vitest';
import { damageSummary } from './damage';

it('calculates total, hits and five-second DPS', () => {
  expect(damageSummary([{time:1,amount:20},{time:6,amount:30},{time:8,amount:10}], 10)).toEqual({total:60,hits:3,dps:8});
  expect(damageSummary([], 10)).toEqual({total:0,hits:0,dps:0});
});
