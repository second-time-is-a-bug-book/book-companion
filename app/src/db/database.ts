// Opens the SQLite database and applies pending migrations, in
// file name order. Each migration file has a "-- migrate:up"
// and a "-- migrate:down" section; guards/migration-guard.ts
// makes sure every new file has both.
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export type Database = DatabaseSync;

const MIGRATIONS_DIR = new URL(
  './migrations/',
  import.meta.url,
);

export function openDatabase(path = ':memory:'): Database {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

export function migrate(db: Database): string[] {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations
       (name TEXT PRIMARY KEY)`,
  );
  const done = new Set(
    db
      .prepare('SELECT name FROM schema_migrations')
      .all()
      .map((row) => row.name),
  );
  const pending = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && !done.has(file))
    .sort();
  for (const file of pending) {
    const sql = readFileSync(
      new URL(file, MIGRATIONS_DIR),
      'utf8',
    );
    transaction(db, () => {
      db.exec(upSection(sql));
      db.prepare(
        'INSERT INTO schema_migrations (name) VALUES (?)',
      ).run(file);
    });
  }
  return pending;
}

export function upSection(sql: string): string {
  const start = sql.indexOf('-- migrate:up');
  const end = sql.indexOf('-- migrate:down');
  if (start === -1)
    throw new Error('Migration has no "-- migrate:up" section');
  return sql.slice(start, end === -1 ? undefined : end);
}

// Runs fn inside BEGIN/COMMIT and rolls back if it throws.
export function transaction<T>(db: Database, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
