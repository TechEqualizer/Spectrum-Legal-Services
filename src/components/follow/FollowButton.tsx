"use client";

import { useState } from "react";
import FollowSheet from "@/components/follow/FollowSheet";
import { followLabel, useFollowTarget, useIsFollowing } from "@/components/follow/follow";

/** A Follow button for a page (the organizer's choose-a-night page); nothing where Follow is off. */
export default function FollowButton({ className }: { className?: string }) {
  const target = useFollowTarget();
  const isFollowing = useIsFollowing(target?.organizer);
  const [open, setOpen] = useState(false);
  if (!target) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {followLabel(isFollowing)}
      </button>
      {open && <FollowSheet target={target} fixed onClose={() => setOpen(false)} />}
    </>
  );
}
