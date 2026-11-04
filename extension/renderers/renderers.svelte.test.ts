import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { RendererFieldValue, RendererProps } from '$lib/render/props';
import { renderers } from './index';

const ids = [
  'letter',
  'diary',
  'essay',
  'note',
  'instrument',
  'proceedings',
  'account',
  'petition',
  'life',
  'office',
  'membership',
];

function f(over: Partial<RendererFieldValue> & { writeTo: string }): RendererFieldValue {
  return { label: over.writeTo, kind: 'text', value: over.writeTo, raw: over.writeTo, ...over };
}

const date = (col: string, iso: string) => f({ writeTo: col, kind: 'date', value: iso, raw: iso });

function props(code: string, fields: Record<string, RendererFieldValue>): RendererProps {
  return {
    fields,
    createdAt: '2020-01-01T00:00:00Z',
    status: 'ACTIVE',
    creator: null,
    projects: [],
    type: { code, color: '#8a5a00', iconSeed: null },
  };
}

const full = (code: string) =>
  props(code, {
    title: f({ writeTo: 'title', value: `Title of ${code}` }),
    date: date('date', '1747-05-25'),
    from: f({ writeTo: 'from', value: 'Benjamin Franklin, Philadelphia' }),
    to: f({ writeTo: 'to', value: 'Peter Collinson' }),
    text: f({
      writeTo: 'text',
      kind: 'markdown',
      value: 'Dear Sir,\n\nI never was before engaged in any study so engrossing.',
    }),
    note: f({ writeTo: 'note', value: 'An editorial note' }),
    sum: f({ writeTo: 'sum', kind: 'number', value: '12', raw: 12 }),
    unit: f({ writeTo: 'unit', value: '£' }),
    toGeo: f({ writeTo: 'toGeo', kind: 'location', value: '51.51, -0.13', raw: '51.51,-0.13' }),
    fromGeo: f({
      writeTo: 'fromGeo',
      kind: 'location',
      value: '39.95, -75.16',
      raw: '39.95,-75.16',
    }),
    start: date('start', '1790-01-01'),
    end: date('end', '1797-03-04'),
  });

const span = (code: string) =>
  props(code, {
    title: f({ writeTo: 'title', value: `Span of ${code}` }),
    start: date('start', '1747-06-03'),
    end: date('end', '1747-08-05'),
  });

const sparse = (code: string) => props(code, {});

const titleOnly = (code: string) =>
  props(code, { title: f({ writeTo: 'title', value: `Only ${code}` }) });

const nullish = (code: string) =>
  props(code, {
    title: f({ writeTo: 'title', value: null, raw: null }),
    date: f({ writeTo: 'date', kind: 'date', value: null, raw: null }),
    creator: f({ writeTo: 'creatorId', kind: 'user', value: null, raw: null, relation: null }),
    text: f({ writeTo: 'text', kind: 'markdown', value: null, raw: null }),
    sum: f({ writeTo: 'sum', kind: 'number', value: null, raw: null }),
    toGeo: f({ writeTo: 'toGeo', kind: 'location', value: null, raw: null }),
  });

describe('franklin renderers registry', () => {
  it('exposes exactly the eleven bespoke renderers, each with card and row', () => {
    expect(renderers.map((r) => r.id).sort()).toEqual([...ids].sort());
    for (const r of renderers) {
      expect(r.name).toBeTruthy();
      expect(r.card).toBeTruthy();
      expect(r.row).toBeTruthy();
      expect(r.fullBleed).toBe(true);
    }
  });

  it('keeps the correspondence detail on letter and petition only', () => {
    const withDetail = renderers.filter((r) => r.detail).map((r) => r.id);
    expect(withDetail.sort()).toEqual(['letter', 'petition']);
  });
});

describe.each(ids)('%s renderer', (id) => {
  const r = () => renderers.find((x) => x.id === id)!;

  for (const part of ['card', 'row'] as const) {
    it(`${part} shows the title for full props`, async () => {
      render(r()[part]!, full(id));
      await expect.element(page.getByText(`Title of ${id}`).first()).toBeInTheDocument();
    });

    it(`${part} renders a title-only record`, async () => {
      render(r()[part]!, titleOnly(id));
      await expect.element(page.getByText(`Only ${id}`).first()).toBeInTheDocument();
    });

    it(`${part} renders a start/end span`, async () => {
      render(r()[part]!, span(id));
      await expect.element(page.getByText(`Span of ${id}`).first()).toBeInTheDocument();
    });

    it(`${part} survives an empty layout`, async () => {
      const screen = render(r()[part]!, sparse(id));
      await expect.element(screen.container.firstElementChild as HTMLElement).toBeInTheDocument();
    });

    it(`${part} survives fields that are all null`, async () => {
      const screen = render(r()[part]!, nullish(id));
      await expect.element(screen.container.firstElementChild as HTMLElement).toBeInTheDocument();
    });
  }
});

describe('type-specific content', () => {
  const card = (id: string) => renderers.find((x) => x.id === id)!.card!;

  it('letter card shows endpoints, salutation and the route when both geo exist', async () => {
    render(card('letter'), full('letter'));
    await expect.element(page.getByText('Dear Sir,')).toBeInTheDocument();
    await expect.element(page.getByText('Transatlantic').first()).toBeInTheDocument();
    await expect.element(page.getByRole('link', { name: 'Peter Collinson' })).toBeInTheDocument();
  });

  it('letter card omits the route without geo', async () => {
    const p = full('letter');
    delete p.fields.fromGeo;
    delete p.fields.toGeo;
    render(card('letter'), p);
    await expect.element(page.getByText('Transatlantic')).not.toBeInTheDocument();
  });

  it('letter card shows a span as a date range', async () => {
    render(card('letter'), span('letter'));
    await expect.element(page.getByText('3 Jun – 5 Aug 1747')).toBeInTheDocument();
  });

  it('account card shows the date, and no amount', async () => {
    const p = full('account');
    delete p.fields.start;
    delete p.fields.end;
    render(card('account'), p);
    await expect.element(page.getByText('25 May 1747')).toBeInTheDocument();
  });

  it('office card shows the tenure years and the body', async () => {
    render(card('office'), full('office'));
    await expect.element(page.getByText('1790–1797')).toBeInTheDocument();
    await expect.element(page.getByText('Peter Collinson')).toBeInTheDocument();
  });

  it('life card shows the place with a coordinates label', async () => {
    render(card('life'), full('life'));
    await expect.element(page.getByText('51.51° N, 0.13° W')).toBeInTheDocument();
  });

  it('petition card is addressed to the recipient', async () => {
    render(card('petition'), full('petition'));
    await expect.element(page.getByText('Peter Collinson')).toBeInTheDocument();
    await expect.element(page.getByText('To the Honourable')).toBeInTheDocument();
  });

  it('diary card falls back to Undated', async () => {
    render(card('diary'), sparse('diary'));
    await expect.element(page.getByText('Undated')).toBeInTheDocument();
  });
});
