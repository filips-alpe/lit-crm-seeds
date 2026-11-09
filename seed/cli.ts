import pg from 'pg';
import { seed } from './db';
import { parseDbUrl } from './db-url';
import {
  users,
  types,
  projects,
  records,
  groups,
  grants,
  hidden,
  amounts,
  jefferson,
} from './load';

const USAGE = `Usage: bun run seed --db <postgres-url>

Loads the Franklin and Jefferson demo data into a lit-crm database (lit_user, lit_type,
lit_project, lit_record, lit_project_record, and lit_record_mention, lit_group,
lit_group_member, lit_grant when the database has them). The schema must already be
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
    conn = parseDbUrl(url);
  } catch (e) {
    console.error((e as Error).message);
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
    const counts = await seed(client, {
      users,
      types,
      projects,
      records,
      groups,
      grants,
      hidden,
      amounts,
      jefferson,
    });
    console.log(
      `Seeded ${counts.users} users, ${counts.types} types, ${counts.projects} projects, ` +
        `${counts.records} records (${counts.jeffersonRecords} Jefferson), ${counts.links} project links.`,
    );
    console.log(
      `${counts.mentions} record mentions.` +
        (counts.mentions === 0 && jefferson.mentions.length > 0
          ? ' (This lit-crm has no lit_record_mention table: mentions skipped.)'
          : ''),
    );
    console.log(
      `${counts.groups} groups, ${counts.memberships} memberships, ${counts.grants} grants, ` +
        `${counts.hidden} hidden records, ${counts.amounts} records with amounts.` +
        (counts.groups === 0
          ? ' (This lit-crm has no grant tables: groups and grants skipped.)'
          : ''),
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
