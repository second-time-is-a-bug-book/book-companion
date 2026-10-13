// Client storage.
import type { Client } from '../domain/invoice.ts';
import type { Database } from './database.ts';

export function insertClient(
  db: Database,
  name: string,
  email: string,
): Client {
  const result = db
    .prepare('INSERT INTO clients (name, email) VALUES (?, ?)')
    .run(name, email);
  return { id: Number(result.lastInsertRowid), name, email };
}

export function listClients(db: Database): Client[] {
  return db
    .prepare(
      'SELECT id, name, email FROM clients ORDER BY name',
    )
    .all() as unknown as Client[];
}

export function getClient(
  db: Database,
  id: number,
): Client | undefined {
  return db
    .prepare('SELECT id, name, email FROM clients WHERE id = ?')
    .get(id) as Client | undefined;
}
