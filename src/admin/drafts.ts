// Saved reel edits, kept in this browser until the admin has a login and a
// database. Each business has its own draft. Uploaded files are kept too:
// in IndexedDB, since a file's blob: link only lasts for one visit.

import { useSyncExternalStore } from "react";
import type { EditorFunnel, EditorReel } from "@/admin/editor-model";
import type { FunnelEvent, ReelMedia } from "@/data/funnel-types";
import type { Look } from "@/lib/look";
import type { ScreenCopy } from "@/lib/publication";

/**
 * The opening screen's background: media to show, null for none (the
 * brand glow), or undefined to keep the live one.
 */
export type HeroMediaEdit = ReelMedia | null | undefined;

export type DraftData = {
  reels: EditorReel[];
  funnels: EditorFunnel[];
  heroMedia?: ReelMedia | null;
  /** The opening screen's words, where they differ from the built-in ones. */
  screen?: ScreenCopy;
  /** Event dates (undefined: the built-in ones). */
  events?: FunnelEvent[];
  /** Brand colors and title typeface (undefined: the built-in ones). */
  look?: Look;
};
export type Draft = DraftData & { savedAt: number };

const draftKey = (business: string) => `admin_draft_${business}`;
const UPLOAD_PREFIX = "upload:";

// ---------------------------------------------------------------------------
// Uploaded files

/** Upload links made this visit, and the stored file each one came from. */
const uploadKeys = new Map<string, string>();

function openFiles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("admin_uploads", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function fileStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openFiles();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction("files", mode).objectStore("files"));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * A link to show an uploaded file now, with the file kept so a saved reel
 * still has it after a reload. If the browser can't store files (private
 * mode), the link still works for this visit.
 */
export function keepUpload(file: File): string {
  const url = URL.createObjectURL(file);
  const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  uploadKeys.set(url, key);
  fileStore("readwrite", (s) => s.put(file, key)).catch(() => uploadKeys.delete(url));
  return url;
}

/** Swaps every string in `value` with `swap`, deeply. */
function mapStrings<T>(value: T, swap: (s: string) => string): T {
  if (typeof value === "string") return swap(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, swap)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, swap)])) as T;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Drafts

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function savedAtOf(business: string): number | null {
  try {
    const raw = localStorage.getItem(draftKey(business));
    return raw ? (JSON.parse(raw).savedAt ?? null) : null;
  } catch {
    return null;
  }
}

/** When this business's edits were last saved here, or null (showing the live funnel). */
export function useDraftSavedAt(business: string): number | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => savedAtOf(business),
    () => null
  );
}

export function saveDraft(business: string, data: DraftData): boolean {
  // Upload links become references to the stored file.
  const stored = mapStrings(data, (s) =>
    s.startsWith("blob:") && uploadKeys.has(s) ? UPLOAD_PREFIX + uploadKeys.get(s) : s
  );
  try {
    localStorage.setItem(draftKey(business), JSON.stringify({ ...stored, savedAt: Date.now() }));
    notify();
    return true;
  } catch {
    return false;
  }
}

/** The saved draft, with its uploaded files ready to show, or null. */
export async function loadDraft(business: string): Promise<Draft | null> {
  let draft: Draft;
  try {
    const raw = localStorage.getItem(draftKey(business));
    if (!raw) return null;
    draft = JSON.parse(raw);
  } catch {
    return null;
  }
  const keys = new Set<string>();
  mapStrings(draft, (s) => {
    if (s.startsWith(UPLOAD_PREFIX)) keys.add(s.slice(UPLOAD_PREFIX.length));
    return s;
  });
  const urls = new Map<string, string>();
  for (const key of keys) {
    try {
      const file = await fileStore<File | undefined>("readonly", (s) => s.get(key));
      if (!file) continue;
      const url = URL.createObjectURL(file);
      uploadKeys.set(url, key);
      urls.set(key, url);
    } catch {
      // Storage blocked: the reel shows "No video yet" until it's uploaded again.
    }
  }
  const restored = mapStrings(draft, (s) => {
    if (!s.startsWith(UPLOAD_PREFIX)) return s;
    return urls.get(s.slice(UPLOAD_PREFIX.length)) ?? "";
  });
  // A file the browser no longer has: the reel goes back to "No video yet",
  // and the opening screen to its live background.
  const usable = (media: ReelMedia | undefined) => {
    if (media && "src" in media && !media.src) return undefined;
    if (media?.kind === "video") {
      if (media.poster === "") delete media.poster;
      if (media.captions === "") delete media.captions;
    }
    return media;
  };
  for (const reel of restored.reels) {
    reel.media = usable(reel.media);
    if (!reel.media) delete reel.media;
  }
  if (restored.heroMedia) {
    restored.heroMedia = usable(restored.heroMedia);
    if (!restored.heroMedia) delete restored.heroMedia;
  }
  return restored;
}

export function clearDraft(business: string) {
  try {
    localStorage.removeItem(draftKey(business));
  } catch {
    // Nothing saved to clear.
  }
  notify();
}
