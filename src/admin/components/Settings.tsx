"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useAdminEvents } from "@/admin/AdminBusiness";
import Accounts from "@/admin/components/Accounts";
import OrganizerPhotos from "@/admin/components/OrganizerPhotos";
import Waitlist from "@/admin/components/Waitlist";
import PasswordSheet from "@/admin/components/PasswordSheet";
import Avatar from "@/admin/components/ui/Avatar";
import { CheckIcon } from "@/admin/components/ui/icons";
import { useAdminSession } from "@/admin/session";
import { squareJpeg } from "@/admin/square-photo";

/**
 * The signed-in admin's own settings: their photo and name (shown in the
 * sidebar), their account (email, password, sign out), what they can
 * edit, and the photo of each organizer they run.
 */
export default function Settings() {
  const id = useId();
  const router = useRouter();
  const session = useAdminSession();
  const events = useAdminEvents();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(session.name ?? "");
  const [busy, setBusy] = useState<"" | "photo" | "name">("");
  const [error, setError] = useState<{ field: "photo" | "name"; text: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [changing, setChanging] = useState(false);

  const fullAccess = session.slugs.includes("*");
  // The organizers this admin runs, each with the photo its reels show.
  const organizers = [...new Map(events.map((e) => [e.organizer.slug, { ...e.organizer, avatarUrl: e.funnel.brand.avatar }])).values()].filter(
    (o) => fullAccess || session.organizers.includes(o.slug)
  );

  const uploadPhoto = async (file: File) => {
    setError(null);
    if (!/^image\//.test(file.type)) return setError({ field: "photo", text: "Choose a photo (JPG, PNG or WebP)." });
    setBusy("photo");
    try {
      const body = await squareJpeg(file);
      const res = await fetch("/api/admin/avatar", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body });
      const out = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(out.error ?? "Couldn't upload the photo. Try again.");
      router.refresh();
    } catch (e) {
      setError({ field: "photo", text: e instanceof Error && e.message !== "encode" ? e.message : "Couldn't read that photo. Try another." });
    } finally {
      setBusy("");
    }
  };

  const removePhoto = async () => {
    setError(null);
    setBusy("photo");
    const res = await fetch("/api/admin/avatar", { method: "DELETE" }).catch(() => null);
    setBusy("");
    if (!res?.ok) return setError({ field: "photo", text: "Couldn't remove the photo. Try again." });
    router.refresh();
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("name");
    const res = await fetch("/api/admin/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const out = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy("");
    if (!res?.ok) return setError({ field: "name", text: out?.error ?? "Couldn't save your name. Try again." });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  };

  const nameChanged = name.trim() !== (session.name ?? "");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-deep-navy">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">{fullAccess ? "Your profile and account, and everyone's access." : "Your profile and account."}</p>
      </div>

      <section aria-labelledby={`${id}-profile`}>
        <h2 id={`${id}-profile`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Profile</h2>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
            {/* The circle sits on the night color, like it does in the sidebar. */}
            <span className="rounded-full bg-deep-navy">
              <Avatar name={session.name} email={session.email} url={session.avatarUrl} className="h-16 w-16 text-2xl" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-deep-navy">Photo</p>
              <p className="text-sm text-gray-600">Shown in your sidebar. Square photos look best.</p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Choose a photo"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadPhoto(file);
                }}
              />
              <button
                type="button"
                disabled={busy === "photo"}
                onClick={() => fileRef.current?.click()}
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-deep-navy hover:bg-soft-gray disabled:cursor-wait disabled:opacity-60"
              >
                {busy === "photo" ? "Uploading…" : session.avatarUrl ? "Change photo" : "Add photo"}
              </button>
              {session.avatarUrl && busy !== "photo" && (
                <button type="button" onClick={removePhoto} aria-label="Remove photo" className="min-h-11 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                  Remove
                </button>
              )}
            </div>
            {error?.field === "photo" && <p role="alert" className="basis-full text-sm font-semibold text-red-700">{error.text}</p>}
          </div>

          <form onSubmit={saveName} className="px-4 py-4 sm:px-5">
            <label htmlFor={`${id}-name`} className="text-sm font-semibold text-deep-navy">Name</label>
            <div className="mt-1 flex gap-2">
              <input
                id={`${id}-name`}
                className="form-input min-w-0 flex-1 text-base"
                maxLength={60}
                autoComplete="name"
                placeholder="Your name"
                value={name}
                aria-invalid={error?.field === "name"}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error?.field === "name") setError(null);
                }}
              />
              <button
                type="submit"
                disabled={busy === "name" || !nameChanged}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-deep-navy px-5 text-sm font-bold text-white hover:bg-royal-blue disabled:opacity-40"
              >
                {busy === "name" ? "Saving…" : saved ? <>Saved <CheckIcon /></> : "Save"}
              </button>
            </div>
            {error?.field === "name" && <p role="alert" className="mt-1.5 text-sm font-semibold text-red-700">{error.text}</p>}
            <p className="mt-1.5 text-xs text-gray-600">Shown in your sidebar instead of your email.</p>
            <span role="status" className="sr-only">{saved ? "Name saved" : ""}</span>
          </form>
        </div>
      </section>

      <section aria-labelledby={`${id}-account`}>
        <h2 id={`${id}-account`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Account</h2>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <span className="text-sm font-semibold text-deep-navy">Email</span>
            <span className="min-w-0 truncate text-sm text-gray-600">{session.email}</span>
          </div>
          <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <span className="text-sm font-semibold text-deep-navy">Password</span>
            <button type="button" onClick={() => setChanging(true)} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-deep-navy underline underline-offset-2 hover:bg-soft-gray">
              Change password
            </button>
          </div>
          <div className="flex min-h-14 items-center px-4 py-1 sm:px-5">
            <button type="button" onClick={signOut} className="min-h-11 rounded-lg px-0 text-sm font-semibold text-red-700 hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby={`${id}-access`}>
        <h2 id={`${id}-access`} className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-600">Your access</h2>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-sm text-gray-600 sm:px-5">
          {fullAccess ? (
            <p><span className="font-semibold text-deep-navy">Full access.</span> You can edit every organizer&apos;s events and the demos, and add events for anyone.</p>
          ) : organizers.length ? (
            <>
              <p>You run these organizers&apos; events: you can add, edit and publish them.</p>
              <ul className="mt-2 space-y-1" role="list">
                {organizers.map((o) => (
                  <li key={o.slug} className="font-semibold text-deep-navy">
                    {o.name} <span className="font-normal text-gray-600">/f/{o.slug}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>You can edit the events Event Reels shared with you. To run an organizer&apos;s events yourself, ask Event Reels.</p>
          )}
        </div>
      </section>

      <OrganizerPhotos organizers={organizers} />

      {/* Superadmin: full admins manage everyone's access. */}
      {fullAccess && <Accounts />}

      {/* Showlnk's own waitlist, from the home page. */}
      {fullAccess && <Waitlist />}

      {changing && <PasswordSheet onClose={() => setChanging(false)} />}
    </div>
  );
}
