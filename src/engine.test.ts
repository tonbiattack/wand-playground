import { describe, expect, it } from 'vitest';
import { cast, presets } from './engine';

describe('cast', () => {
  it('applies modifiers and consumes mana', () => {
    const result = cast({...presets[0],slots:['power','spark']},0,100);
    expect(result.projectiles[0].damage).toBe(25);
    expect(result.mana).toBe(87);
  });
  it('casts several projectiles', () => {
    expect(cast(presets[1],0,150).projectiles).toHaveLength(3);
  });
  it('skips unaffordable spells and terminates', () => {
    expect(cast({...presets[0],slots:['power','bomb']},0,0).projectiles).toHaveLength(0);
  });
  it('emits repeatable events with a fixed shuffle seed', () => {
    const wand = {...presets[0], shuffle:true, slots:['spark','bounce','orb','needle']};
    expect(cast(wand,0,100,42)).toEqual(cast(wand,0,100,42));
    expect(cast(wand,0,100,42).events.at(-1)).toEqual({type:'delay',milliseconds:wand.delay});
  });
  it('handles unknown spell ids safely', () => {
    expect(cast({...presets[0],slots:['not-a-spell']},0,100).projectiles).toEqual([]);
    expect(cast({...presets[0],slots:['__proto__']},0,100).projectiles).toEqual([]);
  });
});
