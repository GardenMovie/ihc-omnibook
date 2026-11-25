/**
 * Where book files and covers live. For now they are blobs in IndexedDB, so a
 * book and its files can be written in one transaction. OPFS can replace this
 * later, but it cannot join an IndexedDB transaction: lib/db/books.ts would
 * then need a pending state and recovery on startup.
 */
import { db } from "@/lib/db/database";

export const fileStore = {
  async put(key: string, blob: Blob): Promise<void> {
    await db.files.put({ key, blob });
  },
  async get(key: string): Promise<Blob | undefined> {
    return (await db.files.get(key))?.blob;
  },
  async delete(keys: string[]): Promise<void> {
    await db.files.bulkDelete(keys);
  },
};
