"use client";

import { useId, useRef, useState } from "react";
import type { ReelMedia } from "@/data/funnel-types";
import { mediaFromLink, thumbnailOf, UPLOAD_LIMITS } from "@/lib/media";

// Preview only: uploads become blob: links that last until the page closes.
// Saving them needs storage behind the admin login.

type MediaPickerProps = {
  value: ReelMedia | undefined;
  onChange: (media: ReelMedia | undefined) => void;
};

const MB = 1024 * 1024;

/** What an uploaded file becomes, or why it can't be used. */
function mediaFromFile(file: File): ReelMedia | string {
  if (file.type.startsWith("video/")) {
    if (file.size > UPLOAD_LIMITS.video) {
      return `That video is ${Math.round(file.size / MB)} MB. Trim it to under ${UPLOAD_LIMITS.video / MB} MB; reels work best under a minute.`;
    }
    return { kind: "video", src: URL.createObjectURL(file) };
  }
  if (file.type.startsWith("image/")) {
    if (file.size > UPLOAD_LIMITS.image) {
      return `That photo is ${Math.round(file.size / MB)} MB. Use one under ${UPLOAD_LIMITS.image / MB} MB.`;
    }
    if (file.type === "image/heic" || file.type === "image/heif") {
      return "HEIC photos don't show in most browsers. Export it as JPEG first (on iPhone: Settings, Camera, Formats, Most Compatible).";
    }
    return { kind: "image", src: URL.createObjectURL(file) };
  }
  return "Upload a video (MP4, MOV, WebM) or a photo (JPEG, PNG, WebP, GIF).";
}

/** The file or link behind media that has one (not YouTube). */
const srcOf = (media: ReelMedia | undefined) => (media && "src" in media ? media.src : undefined);

export default function MediaPicker({ value, onChange }: MediaPickerProps) {
  const id = useId();
  const uploaded = Boolean(srcOf(value)?.startsWith("blob:"));
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"upload" | "link">(value && !uploaded ? "link" : "upload");
  const [link, setLink] = useState(
    value?.kind === "youtube" ? `https://youtu.be/${value.id}` : uploaded ? "" : srcOf(value) ?? ""
  );
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [broken, setBroken] = useState(false);

  // Upload links are kept for the whole visit: a saved reel keeps using
  // its link after this dialog closes, so they are never revoked here.

  const takeFile = (file: File | undefined) => {
    if (!file) return;
    const result = mediaFromFile(file);
    if (typeof result === "string") return setError(result);
    setError("");
    setBroken(false);
    setFileName(file.name);
    onChange(result);
  };

  const takeLink = () => {
    const result = mediaFromLink(link);
    if (typeof result === "string") return setError(result);
    setError("");
    setBroken(false);
    setFileName("");
    onChange(result);
  };

  const setVideoExtra = (patch: { poster?: string; captions?: string }) => {
    if (value?.kind === "video") onChange({ ...value, ...patch });
  };

  const thumb = thumbnailOf(value);
  const kindLabel =
    value?.kind === "youtube" ? "YouTube" : value?.kind === "image" ? "Photo" : value?.kind === "video" ? "Video" : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-deep-navy">Video or photo</span>
        <div className="flex rounded-md border border-gray-300 bg-white p-0.5 text-xs" role="group" aria-label="Add media by">
          {(["upload", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              aria-pressed={mode === m}
              className={`min-h-8 rounded px-3 font-semibold ${mode === m ? "bg-deep-navy text-white" : "text-gray-700 hover:bg-soft-gray"}`}
            >
              {m === "upload" ? "Upload" : "Paste a link"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Preview, in the reel's 9:16 shape */}
        <div className="relative aspect-[9/16] w-24 flex-shrink-0 overflow-hidden rounded-md bg-deep-navy" aria-hidden="true">
          {value?.kind === "video" && !value.poster ? (
            <video src={`${value.src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          ) : thumb && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element -- previews any file or link the admin adds
            <img src={thumb} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
          ) : null}
          {kindLabel && (
            <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{kindLabel}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {mode === "upload" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); takeFile(e.dataTransfer.files[0]); }}
              className={`flex min-h-28 flex-col items-center justify-center rounded-lg border-2 border-dashed px-3 py-4 text-center text-sm ${dragging ? "border-teal-accent bg-teal-accent/5" : "border-gray-300"}`}
            >
              <p className="text-gray-700">Drag a video or photo here, or</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 min-h-10 rounded-md bg-deep-navy px-4 text-sm font-semibold text-white hover:bg-royal-blue">
                Choose a file
              </button>
              <input
                ref={fileRef}
                id={`${id}-file`}
                type="file"
                accept="video/*,image/*"
                className="sr-only"
                aria-label="Upload a video or photo"
                onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ""; }}
              />
              <p className="mt-2 text-xs text-gray-500">MP4, MOV or WebM up to {UPLOAD_LIMITS.video / MB} MB; JPEG, PNG, WebP or GIF up to {UPLOAD_LIMITS.image / MB} MB.</p>
              {fileName && <p className="mt-1 truncate text-xs font-semibold text-deep-navy">{fileName}</p>}
            </div>
          ) : (
            <div>
              <label htmlFor={`${id}-link`} className="sr-only">Link</label>
              <div className="flex gap-2">
                <input
                  id={`${id}-link`}
                  className="form-input min-w-0 py-2 text-sm"
                  inputMode="url"
                  placeholder="https://youtube.com/shorts/... or https://.../reel.mp4"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onPaste={(e) => {
                    // Use a pasted link straight away.
                    const text = e.clipboardData.getData("text");
                    if (!text) return;
                    e.preventDefault();
                    setLink(text);
                    const result = mediaFromLink(text);
                    if (typeof result === "string") setError(result);
                    else { setError(""); setBroken(false); onChange(result); }
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); takeLink(); } }}
                />
                <button type="button" onClick={takeLink} className="min-h-10 flex-shrink-0 rounded-md bg-deep-navy px-3 text-sm font-semibold text-white hover:bg-royal-blue">
                  Use link
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-600">YouTube videos and Shorts, or a direct link to a video or photo.</p>
            </div>
          )}

          {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
          {broken && <p role="alert" className="text-xs font-semibold text-red-700">This didn&apos;t load. Check the file or link.</p>}
          {value?.kind === "youtube" && (
            <p className="text-xs text-gray-600">Plays in YouTube&apos;s privacy-enhanced player. Shorts fill the screen; wide videos are cropped to fit.</p>
          )}
          {uploaded && (
            <p className="text-xs text-gray-500">Preview: uploads stay in this browser until the admin has storage and a login.</p>
          )}
          {value && (
            <button type="button" onClick={() => { onChange(undefined); setFileName(""); setBroken(false); }} className="text-xs font-semibold text-red-700 hover:underline">
              Remove media
            </button>
          )}
        </div>
      </div>

      {value?.kind === "video" && (
        <div className="grid gap-3 md:grid-cols-2">
          <ExtraFile
            label="Cover image"
            hint="Shown before it plays and on its tile."
            accept="image/*"
            limit={UPLOAD_LIMITS.image}
            value={value.poster}
            onChange={(poster) => setVideoExtra({ poster })}
          />
          <ExtraFile
            label="Captions (WebVTT)"
            hint="Most people watch muted, so captions matter."
            accept=".vtt,text/vtt"
            limit={UPLOAD_LIMITS.captions}
            value={value.captions}
            onChange={(captions) => setVideoExtra({ captions })}
          />
        </div>
      )}
    </div>
  );
}

/** A cover image or captions file for a video: upload it, or paste a link. */
function ExtraFile({
  label,
  hint,
  accept,
  limit,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  accept: string;
  limit: number;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  const id = useId();
  const [error, setError] = useState("");
  return (
    <div>
      <label htmlFor={`${id}-url`} className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      <div className="flex gap-2">
        <input
          id={`${id}-url`}
          className="form-input min-w-0 py-2 text-sm"
          inputMode="url"
          placeholder="Link, or upload"
          value={value?.startsWith("blob:") ? "Uploaded file" : value ?? ""}
          readOnly={value?.startsWith("blob:")}
          onChange={(e) => onChange(e.target.value.trim() || undefined)}
        />
        <label className="flex min-h-10 flex-shrink-0 cursor-pointer items-center rounded-md border border-gray-300 px-3 text-xs font-semibold text-deep-navy hover:bg-soft-gray">
          Upload
          <input
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > limit) return setError(`Use a file under ${Math.round(limit / MB)} MB.`);
              setError("");
              onChange(URL.createObjectURL(file));
            }}
          />
        </label>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="min-h-10 px-1 text-xs font-semibold text-red-700 hover:underline">
            Clear
          </button>
        )}
      </div>
      <p className={`mt-1 text-xs ${error ? "font-semibold text-red-700" : "text-gray-500"}`}>{error || hint}</p>
    </div>
  );
}
