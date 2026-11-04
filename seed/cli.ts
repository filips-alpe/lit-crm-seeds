import pg from 'pg';
import { seed } from './db';
import { users, types, projects, records } from './load';

const USAGE = `Usage: bun run seed --db <postgres-url>

Loads the Franklin demo data into a lit-crm database (lit_user, lit_type,
lit_project, lit_record, lit_project_record). The schema must already be
migrated (bunx prisma migrate deploy, in lit-crm).

WARNING: this DELETES every user, type, project and record in the target
database first. --db is required; there is no default and no env fallback.`;

function arg(name: string): string | undefined {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(name);
  if (i >= 0) return argv[i + 1];
  return argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function main() {
  const url = arg('--db');
  if (!url || url.startsWith('--')) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  let conn: URL;
  try {
    conn = new URL(url);
  } catch {
    console.error('--db must be a postgres:// connection URL.');
    process.exitCode = 1;
    return;
  }
  console.warn(
    `WARNING: deleting all users, types, projects and records in ${conn.hostname}${conn.port ? `:${conn.port}` : ''}${conn.pathname} ...`,
  );

  // Strip Prisma's `?schema=` parameter, which node-postgres does not understand.
  const schema = conn.searchParams.get('schema');
  conn.searchParams.delete('schema');
  const client = new pg.Client({ connectionString: conn.toString() });
  await client.connect();
  try {
    if (schema) await client.query(`SET search_path TO "${schema.replaceAll('"', '""')}"`);
    const counts = await seed(client, { users, types, projects, records });
    console.log(
      `Seeded ${counts.users} users, ${counts.types} types, ${counts.projects} projects, ` +
        `${counts.records} records, ${counts.links} project links.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
