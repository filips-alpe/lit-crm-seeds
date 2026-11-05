/** Parse the `--db` value. Throws a plain message unless it is a postgres:// or postgresql:// URL. */
export function parseDbUrl(url: string): URL {
  let conn: URL;
  try {
    conn = new URL(url);
  } catch {
    throw new Error('--db must be a postgres:// connection URL.');
  }
  if (conn.protocol !== 'postgres:' && conn.protocol !== 'postgresql:') {
    throw new Error(
      `--db must be a postgres:// or postgresql:// connection URL (got ${conn.protocol}//).`,
    );
  }
  return conn;
}
