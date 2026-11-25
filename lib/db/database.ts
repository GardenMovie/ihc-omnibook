import Dexie, { type EntityTable } from "dexie";
import type { Book, Collection } from "./types";

export type StoredFile = { key: string; blob: Blob };

export class OmnibookDB extends Dexie {
  books!: EntityTable<Book, "id">;
  collections!: EntityTable<Collection, "id">;
  files!: EntityTable<StoredFile, "key">;

  constructor(name = "omnibook") {
    super(name);
    // Never edit a released version: add version(2) with an upgrade instead.
    this.version(1).stores({
      books: "id, hash, status",
      collections: "id",
      files: "key",
    });
  }
}

export const db = new OmnibookDB();
