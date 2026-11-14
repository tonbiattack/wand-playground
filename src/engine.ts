export type Kind = 'projectile' | 'modifier' | 'multicast';
export type Spell = { id: string; name: string; kind: Kind; mana: number; color: number; description: string; speed?: number; damage?: number; bounce?: number; explosive?: boolean; count?: number; speedFactor?: number; damageAdd?: number; spreadAdd?: number };
export type Wand = { name: string; capacity: number; maxMana: number; regen: number; delay: number; recharge: number; spread: number; shuffle: boolean; slots: string[] };
export const spells: Spell[] = [
  {id:'spark',name:'火花弾',kind:'projectile',mana:5,color:0xffd36b,description:'軽くて速い基本の弾',speed:340,damage:10},
  {id:'orb',name:'蒼い弾',kind:'projectile',mana:12,color:0x83cfff,description:'大きく重い弾',speed:220,damage:25},
  {id:'bounce',name:'跳ね弾',kind:'projectile',mana:10,color:0xb1efad,description:'壁で跳ね返る',speed:280,damage:14,bounce:3},
  {id:'bomb',name:'爆裂弾',kind:'projectile',mana:25,color:0xff936e,description:'命中時に爆発する',speed:190,damage:18,explosive:true},
  {id:'blade',name:'近接刃',kind:'projectile',mana:4,color:0xe4edff,description:'射程の短い刃',speed:140,damage:32},
  {id:'needle',name:'針弾',kind:'projectile',mana:4,color:0xe6aaff,description:'細く速い弾',speed:460,damage:7},
  {id:'double',name:'二重詠唱',kind:'multicast',mana:2,color:0xf6cc82,description:'次の2つを同時に詠唱',count:2},
  {id:'triple',name:'三重詠唱',kind:'multicast',mana:4,color:0xf6cc82,description:'次の3つを同時に詠唱',count:3},
  {id:'speed',name:'速度上昇',kind:'modifier',mana:4,color:0x95dcff,description:'次の弾を速くする',speedFactor:1.6},
  {id:'power',name:'威力上昇',kind:'modifier',mana:8,color:0xffa38f,description:'次の弾の威力を上げる',damageAdd:15},
  {id:'scatter',name:'拡散',kind:'modifier',mana:2,color:0xcbb4ff,description:'次の弾の拡散を広げる',spreadAdd:18},
  {id:'slow',name:'低速化',kind:'modifier',mana:1,color:0x9fdac9,description:'次の弾を遅くする',speedFactor:0.55}
];
export const byId = Object.fromEntries(spells.map(s => [s.id, s])) as Record<string, Spell>;
export const presets: Wand[] = [
  {name:'はじめての杖',capacity:8,maxMana:100,regen:25,delay:180,recharge:350,spread:3,shuffle:false,slots:['spark','spark','bounce']},
  {name:'三連の火花',capacity:8,maxMana:150,regen:35,delay:260,recharge:500,spread:10,shuffle:false,slots:['triple','spark','spark','spark']},
  {name:'爆発実験',capacity:8,maxMana:150,regen:25,delay:400,recharge:700,spread:2,shuffle:false,slots:['power','bomb']}
];
export type CastEvent =
  | { type: 'mana'; spellId: string; amount: number }
  | { type: 'projectile'; spell: Spell }
  | { type: 'delay'; milliseconds: number };
export type Cast = { projectiles: Spell[]; events: CastEvent[]; mana: number; next: number; wrapped: boolean };
// Each slot is visited at most once per cast. Modifiers apply to the next projectile;
// multicast adds its remaining draws. Missing mana skips the unaffordable spell.
export function cast(wand: Wand, start: number, mana: number, seed = 1): Cast {
  const slots = wand.slots.slice(0, wand.capacity);
  if (wand.shuffle) {
    let random = seed >>> 0;
    for (let i = slots.length - 1; i > 0; i--) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const j = Math.floor((random / 4294967296) * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
  }
  if (!slots.length) return {projectiles:[],events:[],mana,next:0,wrapped:true};
  let index = Math.min(start, slots.length - 1), draws = 1, visited = 0, wrapped = false;
  let speed = 1, damage = 0, spread = 0;
  const projectiles: Spell[] = [];
  const events: CastEvent[] = [];
  while (draws > 0 && visited < slots.length) {
    const spell = Object.hasOwn(byId, slots[index]) ? byId[slots[index]] : undefined;
    index++; visited++;
    if (index >= slots.length) { index = 0; wrapped = true; }
    if (!spell || spell.mana > mana) { draws--; continue; }
    mana -= spell.mana;
    events.push({type:'mana',spellId:spell.id,amount:spell.mana});
    if (spell.kind === 'modifier') { speed *= spell.speedFactor ?? 1; damage += spell.damageAdd ?? 0; spread += spell.spreadAdd ?? 0; }
    else if (spell.kind === 'multicast') draws += (spell.count ?? 1) - 1;
    else {
      const projectile = {...spell,speed:(spell.speed ?? 0)*speed,damage:(spell.damage ?? 0)+damage,spreadAdd:spread};
      projectiles.push(projectile);
      events.push({type:'projectile',spell:projectile});
      speed = 1; damage = 0; spread = 0; draws--;
    }
  }
  events.push({type:'delay',milliseconds:wand.delay+(wrapped ? wand.recharge : 0)});
  return { projectiles, events, mana, next:index, wrapped };
}
