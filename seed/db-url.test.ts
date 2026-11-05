import { describe, expect, it } from 'vitest';
import { parseDbUrl } from './db-url';

describe('parseDbUrl', () => {
  it('accepts postgres: and postgresql:', () => {
    expect(parseDbUrl('postgres://u:p@localhost:5432/db').hostname).toBe('localhost');
    expect(parseDbUrl('postgresql://u:p@localhost/db?schema=public').pathname).toBe('/db');
  });

  it('rejects other protocols with a clear message', () => {
    expect(() => parseDbUrl('mysql://u:p@localhost/db')).toThrow(
      /postgres:\/\/ or postgresql:\/\//,
    );
    expect(() => parseDbUrl('http://localhost/db')).toThrow(/got http:\/\//);
  });

  it('rejects text that is not a URL', () => {
    expect(() => parseDbUrl('not a url')).toThrow(/connection URL/);
  });
});
