"use client";

/** React access to the database: results update when the data changes. */
import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { listBooks, listCollections, listDrafts } from "@/lib/db/books";
import { fileStore } from "@/lib/files/store";

export type LiveResult<T> = { data: T | undefined; error: unknown };

/** `query` must be stable (a module function), or the subscription restarts. */
function useLive<T>(query: () => Promise<T>): LiveResult<T> {
  const [result, setResult] = useState<LiveResult<T>>({ data: undefined, error: undefined });
  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (data) => setResult({ data, error: undefined }),
      error: (error) => {
        console.error(error);
        setResult({ data: undefined, error });
      },
    });
    return () => subscription.unsubscribe();
  }, [query]);
  return result;
}

/** `data` is undefined while loading. */
export const useBooks = () => useLive(listBooks);
export const useDrafts = () => useLive(listDrafts);
export const useCollections = () => useLive(listCollections);

/** An object URL for a stored cover, revoked when no longer shown. */
export function useCoverUrl(coverKey: string | undefined): string | undefined {
  const [cover, setCover] = useState<{ key: string; url: string }>();
  useEffect(() => {
    if (!coverKey) return;
    let url: string | undefined;
    let cancelled = false;
    fileStore.get(coverKey).then(
      (blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setCover({ key: coverKey, url });
      },
      () => {}, // the generated cover stays
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [coverKey]);
  return cover && cover.key === coverKey ? cover.url : undefined;
}
