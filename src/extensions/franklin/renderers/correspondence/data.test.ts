import { describe, expect, it } from 'vitest';
import type { RendererFieldValue } from '$lib/render/props';
import { correspondenceData } from './data';

const f = (over: Partial<RendererFieldValue> & { writeTo: string }): RendererFieldValue => ({
  label: over.writeTo,
  kind: 'text',
  value: over.writeTo,
  raw: over.writeTo,
  ...over,
});

describe('correspondenceData', () => {
  it('degrades to empty endpoints and no route on a bare record', () => {
    const d = correspondenceData({});
    expect(d.sender).toEqual({ name: null, place: null });
    expect(d.recipient).toEqual({ name: null, place: null });
    expect(d.ocean).toBe(false);
    expect(d.fromPoint).toBeNull();
    expect(d.subject).toBe('');
  });
  it('uses a person field as the sender name and falls back to the text for the subject', () => {
    const d = correspondenceData({
      a: f({ writeTo: 'from', value: 'Benjamin Franklin, London' }),
      b: f({
        writeTo: 'creatorId',
        kind: 'user',
        value: 'Benjamin Franklin',
        relation: { id: '1', label: 'Benjamin Franklin' },
      }),
      c: f({ writeTo: 'text', kind: 'markdown', value: 'Dear Sir,\n\nI write to thank you.' }),
      d: f({ writeTo: 'to', value: 'Peter Collinson' }),
    });
    expect(d.sender).toEqual({ name: 'Benjamin Franklin', place: 'London' });
    expect(d.recipient.name).toBe('Peter Collinson');
    expect(d.subject).toBe('I write to thank you.');
  });
  it('flags a transatlantic route only with both points', () => {
    const geo = (col: string, raw: string) =>
      f({ writeTo: col, kind: 'location', value: raw, raw });
    const both = correspondenceData({
      a: geo('fromGeo', '39.95,-75.16'),
      b: geo('toGeo', '51.51,-0.13'),
    });
    expect(both.ocean).toBe(true);
    expect(correspondenceData({ a: geo('toGeo', '51.51,-0.13') }).ocean).toBe(false);
  });
});
