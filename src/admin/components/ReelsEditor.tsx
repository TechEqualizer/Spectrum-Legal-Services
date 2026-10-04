"use client";

import { useEffect, useState } from "react";
import DatesCard from "@/admin/components/DatesCard";
import HeroMediaCard from "@/admin/components/HeroMediaCard";
import ReelEditDialog, { type ReelEditResult } from "@/admin/components/ReelEditDialog";
import FunnelSettings from "@/admin/components/reels/FunnelSettings";
import FunnelTabs from "@/admin/components/reels/FunnelTabs";
import PublishBar from "@/admin/components/reels/PublishBar";
import ReelOrder from "@/admin/components/reels/ReelOrder";
import Toast from "@/admin/components/reels/Toast";
import StyleSheet from "@/admin/components/StyleSheet";
import { PathStrip, ResultsPanel, StoryStep, Studio, useWideScreen, type PathStop } from "@/admin/components/Studio";
import type { PreviewMoment } from "@/admin/components/PreviewFrame";
import { PlusIcon } from "@/admin/components/ui/icons";
import ReelViewer from "@/components/ReelViewer";
import {
  CTA_LABELS,
  TRIGGER_LABELS,
  reachable,
  removeFromFunnel,
  slugify,
  toPreviewFunnel,
  type EditorFunnel,
  type EditorReel,
  type PathTarget,
} from "@/admin/editor-model";
import { useAdminBusiness } from "@/admin/AdminBusiness";
import { clearImportRequest, importRequested } from "@/admin/import-request";
import { useAdminSession } from "@/admin/session";
import { useEditor } from "@/admin/use-editor";
import type { Look } from "@/lib/look";
import type { FunnelDraft } from "@/lib/funnel-draft";
import { HERO_PROMPT, keepPrompts, usePrompts } from "@/admin/prompts";
import { publishedFunnel, toPublication } from "@/admin/publish";
import type { FunnelEvent } from "@/data/funnel-types";
import type { ScreenCopy } from "@/lib/publication";
import { useResults } from "@/admin/results";
import type { ReelTotals } from "@/admin/sample-data";
import type { FunnelTrigger } from "@/data/reels";
import { sceneMediaOf, thumbnailOf } from "@/lib/media";

const blankReel: EditorReel = {
  id: "",
  title: "",
  summary: "",
  practiceArea: "Car Accident",
  cta: "funnel",
};

/** A date without a chosen reel (it opens the first reel that sells it). */
function withoutReel(event: FunnelEvent): FunnelEvent {
  const copy = { ...event };
  delete copy.reelId;
  return copy;
}

/**
 * The Reels studio for one business: the opening scene, dates and reels on
 * the left, the funnel playing in a phone, style and results on the right
 * (on phones, one column). State, saving and publishing live in useEditor;
 * this wires the steps to it.
 */
export default function ReelsEditor() {
  const business = useAdminBusiness();
  const session = useAdminSession();
  const liveFunnel = business.funnel;
  const slug = liveFunnel.slug;
  const editor = useEditor();
  const { library, setLibrary, funnels, setFunnels, heroMedia, setHeroMedia, screen, setScreen, events, setEvents, look, setLook, activeId, setActiveId, live, setToast } = editor;
  // Sample results for the last 30 days, keyed by reel.
  const { results, real: realResults } = useResults(30);
  const stats = new Map((results?.reels ?? []).map((t) => [t.reel.id, t]));
  const [editing, setEditing] = useState<EditorReel | null>(null);
  // Plays the funnel as edited, from one of its reels.
  const [preview, setPreview] = useState<{ reelId: string; key: number } | null>(null);
  // Read out after a move, for keyboard and screen reader users.
  const [announcement, setAnnouncement] = useState("");
  // Video prompts from a drafted funnel, by reel id.
  const prompts = usePrompts(slug);
  // A new event opens on Import flyer, once (see Events).
  const [openImport] = useState(() => importRequested(slug));
  useEffect(() => {
    if (openImport) clearImportRequest();
  }, [openImport]);

  // The studio: three columns on wide screens, with the funnel live in a phone.
  const wide = useWideScreen();
  const [go, setGo] = useState<{ reelId?: string; end?: boolean; key: number }>({ key: 0 });
  // What's on screen in the studio's phone, for the path strip.
  const [moment, setMoment] = useState<PreviewMoment>({ reelId: null, ended: false });
  /** Plays a reel: in the studio's phone, or full screen. */
  const play = (reelId: string) => (wide ? setGo((g) => ({ reelId, key: g.key + 1 })) : setPreview({ reelId, key: Date.now() }));
  // The event's dates, for linking reels ("Sells tickets for", and the chip on each row).
  const allDates = events ?? liveFunnel.events;
  const dateLabel = (e: FunnelEvent) =>
    `${new Date(e.startsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}: ${e.name}`;
  const dateOptions = allDates
    ? [...allDates].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).map((e) => ({ id: e.id, label: dateLabel(e) }))
    : undefined;
  const shortDateOf = (eventId?: string) => {
    const e = eventId ? allDates?.find((d) => d.id === eventId) : undefined;
    return e ? new Date(e.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : undefined;
  };

  /** A look matched to a flyer, optionally with the flyer behind the opening screen. Undo puts both back. */
  const applyLook = (next: Look, flyer?: string, asBackground = false) => {
    const before = { look, heroMedia };
    // The flyer stays with the look, so Style can put it behind the title later.
    setLook(flyer ? { ...next, flyer } : next);
    if (flyer && asBackground) setHeroMedia({ kind: "image", src: flyer, fit: "poster" });
    setToast(flyer && asBackground ? "Look and background matched to your flyer" : "Look matched to your flyer", () => {
      setLook(before.look);
      setHeroMedia(before.heroMedia);
      setToast("Look put back");
    });
  };

  /**
   * A funnel drafted from a flyer: its reels (new, each with its video
   * prompt, marked Needs video) become the published funnel's order, and
   * its words go on the opening screen. The old reels stay in the library,
   * and Undo puts everything back.
   */
  const applyDraft = (draft: FunnelDraft) => {
    const before = { library, funnels, screen };
    const dates = events ?? liveFunnel.events ?? [];
    const dayOf = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const taken = new Set(library.map((r) => r.id));
    const prompts: Record<string, string> = { [HERO_PROMPT]: draft.heroPrompt };
    const reels = draft.reels.map((d): EditorReel => {
      const id = slugify(d.title, taken);
      taken.add(id);
      prompts[id] = d.videoPrompt;
      // The date it sells; with only one date, every reel sells that one.
      const event = d.date ? dates.find((e) => dayOf(e.startsAt) === d.date) : dates.length === 1 ? dates[0] : undefined;
      return {
        id,
        title: d.title,
        summary: d.summary,
        practiceArea: liveFunnel.brand.services[0],
        cta: "funnel",
        ...(event ? { eventId: event.id } : {}),
        ...(d.role === "last_call" ? { emphasis: "bold" as const } : {}),
      };
    });
    const target = publishedFunnel(funnels);
    keepPrompts(slug, prompts);
    setLibrary([...reels, ...library]);
    setFunnels(funnels.map((f) => (f.id === target.id ? { ...f, order: reels.map((r) => r.id), paths: {}, topics: {} } : f)));
    setActiveId(target.id);
    const words: ScreenCopy = liveFunnel.cover.hero
      ? { title: draft.screen.title, tagline: draft.screen.tagline, watchLabel: draft.screen.watchLabel, heading: draft.screen.heading }
      : { heading: draft.screen.title || draft.screen.heading, intro: draft.screen.tagline };
    const next: ScreenCopy = { ...screen };
    for (const [k, v] of Object.entries(words) as [keyof ScreenCopy, string | undefined][]) if (v) next[k] = v;
    setScreen(next);
    setToast(`Funnel drafted: ${reels.length} reels, each with a video prompt`, () => {
      setLibrary(before.library);
      setFunnels(before.funnels);
      setScreen(before.screen);
      setToast("Draft taken back");
    });
  };

  const funnel = funnels.find((f) => f.id === activeId)!;
  const byId = new Map(library.map((r) => [r.id, r]));
  // Each date's circle opens a reel: its chosen one, else the first that sells it.
  const dateOpener = (f: EditorFunnel, e: FunnelEvent) =>
    e.reelId && f.order.includes(e.reelId) ? e.reelId : f.order.find((id) => library.find((r) => r.id === id)?.eventId === e.id);
  const dateStarts = (f: EditorFunnel) =>
    (events ?? liveFunnel.events ?? []).map((e) => dateOpener(f, e)).filter((id): id is string => Boolean(id));
  const reach = reachable(funnel, funnel.id === publishedFunnel(funnels).id ? dateStarts(funnel) : []);

  const updateFunnel = (patch: Partial<EditorFunnel> | ((f: EditorFunnel) => EditorFunnel)) =>
    setFunnels((all) =>
      all.map((f) => {
        if (f.id !== activeId) {
          // Only one funnel can be the default.
          return typeof patch !== "function" && patch.isDefault ? { ...f, isDefault: false } : f;
        }
        return typeof patch === "function" ? patch(f) : { ...f, ...patch };
      })
    );

  const moveTo = (reelId: string, index: number) => {
    updateFunnel((f) => {
      const order = f.order.filter((id) => id !== reelId);
      order.splice(Math.max(0, Math.min(index, order.length)), 0, reelId);
      return { ...f, order };
    });
    setAnnouncement(`${byId.get(reelId)?.title} moved to position ${index + 1}.`);
  };

  const save = ({ reel, paths, topic }: ReelEditResult) => {
    const isNew = reel.id === "";
    const id = isNew ? slugify(reel.title, new Set(library.map((r) => r.id))) : reel.id;
    const saved = { ...reel, id };
    setLibrary((all) => (isNew ? [...all, saved] : all.map((r) => (r.id === id ? saved : r))));
    updateFunnel((f) => {
      const topics = { ...f.topics };
      if (topic) topics[id] = topic;
      else delete topics[id];
      const nextPaths = { ...f.paths };
      if (Object.keys(paths).length) nextPaths[id] = paths;
      else delete nextPaths[id];
      return { ...f, order: isNew ? [...f.order, id] : f.order, topics, paths: nextPaths };
    });
    // A new reel made for a date (or given one) becomes what that date opens, unless it already opens another.
    if (isNew && saved.eventId) {
      setEvents((list) =>
        (list ?? liveFunnel.events)?.map((e) => (e.id === saved.eventId && !e.reelId ? { ...e, reelId: id } : e))
      );
    }
    setEditing(null);
    setToast(isNew ? "Reel added" : "Reel saved");
  };

  /**
   * Saves a date and links its reel: the chosen reel opens it and sells its
   * tickets (moving it off any other date), or a new reel is started for it.
   */
  const saveDate = (event: FunnelEvent, choice: string, isNew: boolean) => {
    const all = events ?? liveFunnel.events ?? [];
    const saved: FunnelEvent = choice && choice !== "new" ? { ...withoutReel(event), reelId: choice } : withoutReel(event);
    // A reel opens one date: the date it moved from falls back to its other reels.
    const fix = (e: FunnelEvent) => (e.id === saved.id ? saved : choice && e.reelId === choice ? withoutReel(e) : e);
    setEvents(isNew ? [...all.map(fix), saved] : all.map(fix));
    if (choice && choice !== "new") {
      setLibrary((reels) => reels.map((r) => (r.id === choice ? { ...r, eventId: saved.id } : r)));
    }
    if (choice === "new") {
      // New reels go into the funnel that gets published.
      setActiveId(publishedFunnel(funnels).id);
      setEditing({ ...blankReel, practiceArea: liveFunnel.brand.services[0], title: saved.name, eventId: saved.id });
      setToast(isNew ? "Date added. Now add its reel" : "Date saved. Now add its reel");
    } else {
      setToast(isNew ? "Date added" : "Date saved");
    }
  };

  const newFunnel = () => {
    const f: EditorFunnel = {
      id: `funnel-${Date.now()}`,
      name: "New funnel",
      isDefault: false,
      entry: "returning",
      primaryCta: "call",
      order: [],
      topics: {},
      paths: {},
    };
    setFunnels((all) => [...all, f]);
    setActiveId(f.id);
  };

  const pathLabel = (target: PathTarget) => {
    if (target === "end") return "End card";
    const i = funnel.order.indexOf(target);
    return i === -1 ? "End card" : `${i + 1}. ${byId.get(target)?.title}`;
  };

  const headerEl = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Reels</h1>
          <p className="text-sm text-gray-600">Three reels sell the night: The Night makes them want it, Your People shows it&apos;s for them, Last Call gives the reason to buy now. Each one plays the next.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/f/${liveFunnel.slug}`}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50"
          >
            Open live link
          </a>
          <button
            type="button"
            disabled={funnel.order.length === 0}
            onClick={() => setPreview({ reelId: funnel.order[0], key: Date.now() })}
            className="min-h-11 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-gray-50 disabled:opacity-40"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setEditing({ ...blankReel, practiceArea: liveFunnel.brand.services[0] })}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-deep-navy px-4 text-sm font-bold text-white hover:bg-royal-blue"
          >
            <PlusIcon />
            Add reel
          </button>
        </div>
      </div>
    </>
  );

  const heroEl = (
    <>
      <HeroMediaCard
        funnel={liveFunnel}
        live={sceneMediaOf(liveFunnel)}
        value={heroMedia}
        screen={screen}
        look={look}
        videoPrompt={prompts[HERO_PROMPT]}
        edited={editor.edited.hero || editor.edited.screen || editor.edited.look}
        inStudio={wide}
        onStyle={(nextLook, media) => {
          const before = { look, heroMedia };
          setLook(nextLook);
          setHeroMedia(media);
          setToast(nextLook ? "Style saved" : "Original style", () => {
            setLook(before.look);
            setHeroMedia(before.heroMedia);
            setToast("Style put back");
          });
        }}
        onChange={(change, message, undo) => {
          setHeroMedia(change.media);
          setScreen(change.screen);
          setToast(message, undo);
        }}
      />
    </>
  );

  const datesEl = (
    <>
      {liveFunnel.events && (
        <DatesCard
          slug={slug}
          events={events ?? liveFunnel.events}
          reels={publishedFunnel(funnels)
            .order.map((id) => byId.get(id))
            .filter((r): r is EditorReel => Boolean(r))}
          edited={editor.edited.events}
          onChange={(next, message, undo) => {
            setEvents(next);
            setToast(message, undo);
          }}
          onSave={saveDate}
          onLook={applyLook}
          onDraft={applyDraft}
          inStudio={wide}
          openImport={openImport}
        />
      )}
    </>
  );

  const funnelsEl = <FunnelTabs funnels={funnels} activeId={activeId} liveId={liveFunnel.id} onSelect={setActiveId} onNew={newFunnel} />;

  const orderEl = (
    <ReelOrder
      funnel={funnel}
      library={library}
      reach={reach}
      stats={stats}
      realResults={realResults}
      prompts={prompts}
      announcement={announcement}
      live={live}
      email={session.email}
      savedAt={editor.savedAt}
      unpublished={editor.unpublished}
      pathLabel={pathLabel}
      shortDateOf={shortDateOf}
      moveTo={moveTo}
      onAdd={(id) => updateFunnel((f) => ({ ...f, order: [...f.order, id] }))}
      onEdit={setEditing}
      onPlay={play}
      onRemove={(id) => updateFunnel((f) => removeFromFunnel(f, id))}
    />
  );

  const settingsInner = <FunnelSettings funnel={funnel} live={live} updateFunnel={updateFunnel} onTakeDown={editor.restoreOriginal} />;

  const settingsEl = (
    <>
      {/* Settings for the selected funnel */}
      <details className="group rounded-xl border border-gray-200 bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 text-base font-bold text-deep-navy">
          Funnel settings
          <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M19 9l-7 7-7-7" /></svg>
        </summary>
        {settingsInner}
      </details>
    </>
  );

  const liveErrorEl = (
    <>
      {editor.liveError && (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Couldn&apos;t check what&apos;s live ({editor.liveError}). Edits still save here; reload to try again.
        </p>
      )}
    </>
  );

  const showBar = editor.unpublished || Boolean(editor.publishing) || Boolean(editor.publishError);
  const publishBarEl = showBar && (
    <PublishBar
      publishing={editor.publishing}
      publishError={editor.publishError}
      unpublished={editor.unpublished}
      onDiscard={editor.resetToLive}
      onPublish={editor.runPublish}
    />
  );

  const overlaysEl = (
    <>
      {preview && (
        <ReelViewer
          key={preview.key}
          funnel={toPreviewFunnel(liveFunnel, funnel, library)}
          startReelId={preview.reelId}
          onClose={() => setPreview(null)}
        />
      )}
      <Toast toast={editor.toast} raised={showBar} onDismiss={editor.dismissToast} />
      {editing && (
        <ReelEditDialog
          key={editing.id || "new"}
          reel={editing}
          funnel={funnel}
          library={library}
          services={liveFunnel.brand.services}
          topicLabel={business.terms.topic}
          dates={dateOptions}
          videoPrompt={prompts[editing.id]}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );

  const shownMedia = heroMedia === undefined ? sceneMediaOf(liveFunnel) : heroMedia ?? undefined;

  // The path strip follows the funnel the preview (and the live link) shows.
  const shown = publishedFunnel(funnels);
  const shownReach = reachable(shown, dateStarts(shown));
  const stepLabel = (target: PathTarget) => (target === "end" ? "End" : String(shown.order.indexOf(target) + 1));
  /** Dates whose circle opens this reel: its chosen reel, else the first that sells it. */
  const datesOpening = (reelId: string) =>
    (allDates ?? [])
      .filter((e) => dateOpener(shown, e) === reelId)
      .map((e) => new Date(e.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const stops: PathStop[] = [
    { id: "opening", kind: "opening", title: "Opening" },
    ...shown.order.flatMap((id, i): PathStop[] => {
      const reel = byId.get(id);
      if (!reel) return [];
      const detours = Object.entries(shown.paths[id] ?? {}) as [FunnelTrigger, PathTarget][];
      const dates = datesOpening(id);
      return [{
        id,
        kind: "reel",
        n: i + 1,
        title: reel.title,
        thumb: thumbnailOf(reel.media),
        ...(dates.length ? { date: dates.join(", ") } : {}),
        ...(detours.length ? { notes: detours.map(([t, target]) => `${TRIGGER_LABELS[t]} → ${stepLabel(target)}`) } : {}),
        ...(!shownReach.has(id) ? { unreachable: true } : {}),
      }];
    }),
    { id: "end", kind: "end", title: `End: ${CTA_LABELS[shown.primaryCta]}` },
  ];
  const goTo = (stop: PathStop) =>
    setGo((g) =>
      stop.kind === "opening"
        ? { key: g.key + 1 }
        : stop.kind === "end"
          ? { reelId: shown.order.at(-1), end: true, key: g.key + 1 }
          : { reelId: stop.id, key: g.key + 1 }
    );
  const onScreen = moment.ended ? "end" : moment.reelId ?? "opening";

  if (wide) {
    return (
      <Studio
        slug={slug}
        title={liveFunnel.brand.name}
        publication={toPublication(editor.current)}
        go={go}
        onRestart={() => setGo((g) => ({ key: g.key + 1 }))}
        onMoment={setMoment}
        strip={shown.order.length > 0 ? <PathStrip stops={stops} current={onScreen} onGo={goTo} /> : undefined}
        canUndo={editor.history.canUndo}
        canRedo={editor.history.canRedo}
        onUndo={editor.history.undo}
        onRedo={editor.history.redo}
        unpublished={editor.unpublished}
        publishing={editor.publishing}
        publishError={editor.publishError}
        onPublish={editor.runPublish}
        onDiscard={editor.resetToLive}
        liveHref={`/f/${liveFunnel.slug}`}
        story={
          <>
            <StoryStep n={1} title="Opening scene" hint="What people see first" onShow={() => setGo((g) => ({ key: g.key + 1 }))}>
              {heroEl}
            </StoryStep>
            {liveFunnel.events && (
              <StoryStep n={2} title="Dates" hint="Each is a circle that opens its reel" onShow={() => setGo((g) => ({ key: g.key + 1 }))}>
                {datesEl}
              </StoryStep>
            )}
            <StoryStep n={liveFunnel.events ? 3 : 2} title="Reels" hint="The Night, Your People, Last Call" onShow={() => funnel.order[0] && setGo((g) => ({ reelId: funnel.order[0], key: g.key + 1 }))}>
              {funnelsEl}
              {orderEl}
              <button
                type="button"
                onClick={() => setEditing({ ...blankReel, practiceArea: liveFunnel.brand.services[0] })}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-400 text-sm font-semibold text-deep-navy hover:bg-white"
              >
                <PlusIcon />
            Add reel
              </button>
            </StoryStep>
            {liveErrorEl}
          </>
        }
        design={
          <StyleSheet
            panel
            funnel={liveFunnel}
            title={liveFunnel.cover.hero ? screen?.title ?? liveFunnel.cover.hero.title : screen?.heading ?? liveFunnel.cover.heading}
            look={look}
            media={shownMedia}
            onDone={(nextLook, media) => {
              setLook(nextLook);
              // The background only changes when Background was tapped.
              if (media !== (shownMedia ?? null)) setHeroMedia(media);
            }}
          />
        }
        results={<ResultsPanel real={realResults} rows={funnel.order.map((id) => stats.get(id)).filter((r): r is ReelTotals => Boolean(r))} onPlay={(id) => setGo((g) => ({ reelId: id, key: g.key + 1 }))} />}
        settings={settingsInner}
      >
        {overlaysEl}
      </Studio>
    );
  }

  return (
    <div className="space-y-6">
      {headerEl}
      {heroEl}
      {datesEl}
      {funnelsEl}
      {orderEl}
      {settingsEl}
      {liveErrorEl}
      {publishBarEl}
      {overlaysEl}
    </div>
  );
}
