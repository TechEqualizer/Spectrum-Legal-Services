"use client";

// The studio's state for one business: what's being edited (reels, funnels,
// opening scene, dates, look), saved in this browser as it changes, with
// Undo and Redo, compared with what's live, and published from here.

import { useEffect, useRef, useState } from "react";
import { useAdminBusiness } from "@/admin/AdminBusiness";
import { clearDraft, loadDraft, saveDraft, useDraftSavedAt, type HeroMediaEdit } from "@/admin/drafts";
import { initialEditorState } from "@/admin/editor-model";
import { fetchLive, publicationKey, publish, takeDown, type EditorState, type LiveState } from "@/admin/publish";
import { useAdminSession } from "@/admin/session";
import type { FunnelEvent } from "@/data/funnel-types";
import type { Look } from "@/lib/look";
import type { ScreenCopy } from "@/lib/publication";

export type Toast = { text: string; undo?: () => void; id: number };

/** For telling whether anything changed. Keeps "live background" (undefined) apart from "removed" (null). */
function snapshotOf({ reels, funnels, heroMedia, screen, events, look }: EditorState) {
  return JSON.stringify([reels, funnels, heroMedia === undefined ? "live" : heroMedia, screen ?? {}, events ?? "live", look ?? "built-in"]);
}

// Same dates in any order count as unchanged.
const byStart = (list?: FunnelEvent[]) => (list ? [...list].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)) : "live");

export function useEditor() {
  const business = useAdminBusiness();
  const session = useAdminSession();
  const slug = business.funnel.slug;
  // The admin remounts the studio when the business changes, so this runs once per business.
  const [initial] = useState(() => initialEditorState(business));
  const [library, setLibrary] = useState(initial.reels);
  const [funnels, setFunnels] = useState(initial.funnels);
  // The opening screen's background (undefined: the live one).
  const [heroMedia, setHeroMedia] = useState<HeroMediaEdit>(undefined);
  // The opening screen's words that differ from the built-in ones, and the event dates (undefined: built-in).
  const [screen, setScreen] = useState<ScreenCopy | undefined>(undefined);
  const [events, setEvents] = useState<FunnelEvent[] | undefined>(undefined);
  // Brand colors and title typeface (undefined: the built-in ones).
  const [look, setLook] = useState<Look | undefined>(undefined);
  const [activeId, setActiveId] = useState(initial.funnels[0].id);
  // When the edits were last saved in this browser (null: nothing saved, showing the live funnel).
  const savedAt = useDraftSavedAt(slug);
  // A short confirmation near the bottom, with Undo when something was deleted.
  const [toast, setToastState] = useState<Toast | null>(null);
  const setToast = (text: string, undo?: () => void) => setToastState(text ? { text, undo, id: Date.now() } : null);
  // What's on the live link now (null while it loads).
  const [live, setLive] = useState<LiveState | null>(null);
  const [liveError, setLiveError] = useState("");
  // Publishing progress ("Uploading 1 of 2..."), or empty.
  const [publishing, setPublishing] = useState("");
  const [publishError, setPublishError] = useState("");

  const current: EditorState = { reels: library, funnels, heroMedia, screen, events, look };

  const show = (state: EditorState) => {
    setLibrary(state.reels);
    setFunnels(state.funnels);
    setHeroMedia(state.heroMedia);
    setScreen(state.screen);
    setEvents(state.events);
    setLook(state.look);
    setActiveId((id) => (state.funnels.some((f) => f.id === id) ? id : state.funnels[0].id));
  };

  // Undo and Redo: every saved change is a step.
  const past = useRef<EditorState[]>([]);
  const future = useRef<EditorState[]>([]);
  const lastStep = useRef<EditorState | null>(null);
  const restoring = useRef(false);
  const [, setSteps] = useState(0);

  // Start from what's live, then pick up where this browser left off.
  const loaded = useRef(false);
  const lastSaved = useRef("");
  useEffect(() => {
    let current = true;
    const builtIn: EditorState = { reels: initial.reels, funnels: initial.funnels, heroMedia: undefined };
    Promise.all([
      fetchLive(slug, builtIn).catch((e: Error) => {
        if (current) setLiveError(e.message);
        return null;
      }),
      loadDraft(slug),
    ]).then(([liveState, draft]) => {
      if (!current) return;
      const base = liveState ?? { ...builtIn, publishedAt: null, publishedBy: null };
      setLive(base);
      const start = draft ?? base;
      const state: EditorState = { reels: start.reels, funnels: start.funnels, heroMedia: start.heroMedia, screen: start.screen, events: start.events, look: start.look };
      show(state);
      lastSaved.current = snapshotOf(state);
      // Undo starts from here.
      lastStep.current = state;
      past.current = [];
      future.current = [];
      loaded.current = true;
    });
    return () => {
      current = false;
    };
  }, [slug, initial]);

  // Every change is saved as it happens.
  useEffect(() => {
    if (!loaded.current) return;
    const state: EditorState = { reels: library, funnels, heroMedia, screen, events, look };
    const snapshot = snapshotOf(state);
    if (snapshot === lastSaved.current) return;
    lastSaved.current = snapshot;
    saveDraft(slug, state);
  }, [slug, library, funnels, heroMedia, screen, events, look]);

  // A short "Saved" note where the person is looking.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToastState(null), toast.undo ? 6000 : 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!loaded.current) return;
    const state: EditorState = { reels: library, funnels, heroMedia, screen, events, look };
    if (restoring.current) {
      restoring.current = false;
    } else if (lastStep.current && snapshotOf(lastStep.current) !== snapshotOf(state)) {
      past.current = [...past.current.slice(-59), lastStep.current];
      future.current = [];
    }
    lastStep.current = state;
    setSteps((n) => n + 1);
  }, [library, funnels, heroMedia, screen, events, look]);
  const stepTo = (from: React.MutableRefObject<EditorState[]>, to: React.MutableRefObject<EditorState[]>) => {
    const state = from.current.at(-1);
    if (!state) return;
    from.current = from.current.slice(0, -1);
    to.current = [...to.current, current];
    restoring.current = true;
    show(state);
  };

  const unpublished = Boolean(live) && publicationKey(current) !== publicationKey(live!);
  // What differs from the live link, for the "Edited" marks on each card.
  const edited = {
    screen: Boolean(live) && JSON.stringify(screen ?? {}) !== JSON.stringify(live!.screen ?? {}),
    events: Boolean(live) && JSON.stringify(byStart(events)) !== JSON.stringify(byStart(live!.events)),
    hero: Boolean(live) && JSON.stringify(heroMedia ?? "live") !== JSON.stringify(live!.heroMedia ?? "live"),
    look: Boolean(live) && JSON.stringify(look ?? null) !== JSON.stringify(live!.look ?? null),
  };

  const resetToLive = () => {
    if (!live) return;
    clearDraft(slug);
    show(live);
    lastSaved.current = snapshotOf(live);
    setToast("Back to what's live");
  };

  const runPublish = async () => {
    setPublishError("");
    try {
      const result = await publish(slug, current, setPublishing);
      // Uploads now point at their public links.
      show(result.state);
      setLive({ ...result.state, publishedAt: result.publishedAt, publishedBy: session.email });
      setToast("Published. Your link is updated");
    } catch (e) {
      setPublishError((e as Error).message);
    } finally {
      setPublishing("");
    }
  };

  const restoreOriginal = async () => {
    setPublishError("");
    try {
      await takeDown(slug);
      const builtIn: EditorState = { reels: initial.reels, funnels: initial.funnels, heroMedia: undefined };
      setLive({ ...builtIn, publishedAt: null, publishedBy: null });
      setToast("Your link shows its original reels again");
    } catch (e) {
      setPublishError((e as Error).message);
    }
  };

  return {
    library,
    setLibrary,
    funnels,
    setFunnels,
    heroMedia,
    setHeroMedia,
    screen,
    setScreen,
    events,
    setEvents,
    look,
    setLook,
    activeId,
    setActiveId,
    current,
    savedAt,
    toast,
    setToast,
    dismissToast: () => setToastState(null),
    live,
    liveError,
    unpublished,
    edited,
    history: {
      undo: () => stepTo(past, future),
      redo: () => stepTo(future, past),
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    },
    publishing,
    publishError,
    runPublish,
    resetToLive,
    restoreOriginal,
  };
}
