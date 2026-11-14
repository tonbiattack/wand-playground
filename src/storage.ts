import { byId, type Wand } from './engine';

const limits = {
  capacity: [1, 20], maxMana: [1, 1000], regen: [0, 500],
  delay: [0, 3000], recharge: [0, 3000], spread: [0, 180],
} as const;

export function encodeWand(wand: Wand): string {
  return JSON.stringify({ schemaVersion: 1, wand });
}

export function decodeWand(text: string): Wand {
  if (text.length > 16000) throw new Error('データが大きすぎます');
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== 'object' || !('schemaVersion' in data) || data.schemaVersion !== 1 || !('wand' in data) || !data.wand || typeof data.wand !== 'object') throw new Error('対応していないデータ形式です');
  const wand = data.wand as Record<string, unknown>;
  if (typeof wand.name !== 'string' || wand.name.length < 1 || wand.name.length > 100 || typeof wand.shuffle !== 'boolean' || !Array.isArray(wand.slots)) throw new Error('杖のデータが不正です');
  for (const [key, [min, max]] of Object.entries(limits)) {
    const value = wand[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (key === 'capacity' && !Number.isInteger(value))) throw new Error('杖のパラメータが不正です');
  }
  if (wand.slots.length > (wand.capacity as number) || wand.slots.some(id => typeof id !== 'string' || !Object.hasOwn(byId, id))) throw new Error('呪文のデータが不正です');
  return {
    name: wand.name, shuffle: wand.shuffle, slots: [...wand.slots] as string[],
    capacity: wand.capacity as number, maxMana: wand.maxMana as number, regen: wand.regen as number,
    delay: wand.delay as number, recharge: wand.recharge as number, spread: wand.spread as number,
  };
}

export function toShareUrl(wand: Wand): string {
  const bytes = new TextEncoder().encode(encodeWand(wand));
  const encoded = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const url = new URL(location.href);
  url.hash = `wand=${encoded}`;
  if (url.href.length > 4000) throw new Error('共有データが大きすぎます');
  return url.href;
}

export function fromShareHash(hash: string): Wand | null {
  const encoded = new URLSearchParams(hash.replace(/^#/, '')).get('wand');
  if (!encoded) return null;
  if (encoded.length > 3500 || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('共有データが不正です');
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return decodeWand(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
