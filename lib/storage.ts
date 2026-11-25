/** Browser storage status and backup bookkeeping (SPEC 5.4). */

export const LAST_EXPORT_KEY = "omnibook-last-export";

export type StorageStatus = {
  /** The browser promised not to clear the data on its own. */
  persisted: boolean;
  usedBytes?: number;
  quotaBytes?: number;
};

/** Asks the browser to keep the data. Firefox may show a permission prompt. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (await navigator.storage.persisted()) return true;
    // Never wait on a prompt the user ignores: adding must go on.
    return await Promise.race([
      navigator.storage.persist(),
      new Promise<boolean>((resolve) => setTimeout(resolve, 1000, false)),
    ]);
  } catch {
    return false;
  }
}

export async function storageStatus(): Promise<StorageStatus> {
  try {
    const [persisted, estimate] = await Promise.all([
      navigator.storage.persisted(),
      navigator.storage.estimate(),
    ]);
    return { persisted, usedBytes: estimate.usage, quotaBytes: estimate.quota };
  } catch {
    return { persisted: false };
  }
}

export function getLastExportAt(): number | undefined {
  try {
    return Number(localStorage.getItem(LAST_EXPORT_KEY)) || undefined;
  } catch {
    return undefined;
  }
}

export function recordExport(): void {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
  } catch {
    // Only affects the backup reminder.
  }
}
