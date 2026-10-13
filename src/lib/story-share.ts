"use client";

// Handing the Stories video over (docs/plans/07-story-export.md and
// 10-mobile-shell.md), kept apart from the renderer so it loads with the
// page: a phone opens its share sheet only straight after a tap, and Safari
// refuses it if anything is awaited first. So the video is kept on this
// device once made (IndexedDB, one per file name) and read before the tap,
// and the share sheet opens with nothing awaited in between.

import type { StoryInput } from "@/lib/story-export";

const DB = "showlnk-stories";
const STORE = "videos";

type Kept = { input: string; video: Blob };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** The video made earlier on this device for exactly this input, or null (none, stale, or no storage here). */
export async function keptStory(name: string, input: StoryInput): Promise<Blob | null> {
  try {
    const db = await open();
    const kept = await new Promise<Kept | undefined>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(name);
      req.onsuccess = () => resolve(req.result as Kept | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return kept && kept.input === JSON.stringify(input) && kept.video instanceof Blob ? kept.video : null;
  } catch {
    return null;
  }
}

/** Keeps a made video for next time, replacing the one before it under this name. Best effort. */
export async function keepStory(name: string, input: StoryInput, video: Blob): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ input: JSON.stringify(input), video } satisfies Kept, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Private browsing or full storage: they make it again next time.
  }
}

/** True when this device can hand a video to its share sheet (a phone), false when it saves it instead. */
export const canShareVideo = (name: string) =>
  typeof navigator !== "undefined" && Boolean(navigator.canShare?.({ files: [new File([], name, { type: "video/mp4" })] }));

/**
 * Posts it: copies the link for Instagram's Link sticker, then the share
 * sheet where there is one (Instagram, TikTok, Save Video), else a
 * download. Call it straight from a tap, with nothing awaited before.
 * "blocked" means the phone refused the share sheet (the tap was too long
 * ago); offer a button to tap again.
 */
export function postStory(video: Blob, name: string, link?: string): Promise<"shared" | "saved" | "canceled" | "blocked"> {
  // Neither waits for the other: the share sheet must open within the tap.
  if (link) navigator.clipboard?.writeText(link).catch(() => {});
  const file = new File([video], name, { type: "video/mp4" });
  if (navigator.canShare?.({ files: [file] })) {
    return navigator.share({ files: [file] }).then(
      () => "shared" as const,
      (e) => {
        if (e instanceof DOMException && e.name === "AbortError") return "canceled" as const;
        if (e instanceof DOMException && e.name === "NotAllowedError") return "blocked" as const;
        // Some browsers can share files but refuse this one: save it instead.
        save(file);
        return "saved" as const;
      },
    );
  }
  save(file);
  return Promise.resolve("saved");
}

function save(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
