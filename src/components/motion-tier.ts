// How much the flyer video draws on this device (docs/plans/09-flyer-to-video.md,
// gap 8). A modest phone (4 GB of memory or less, as Android's Chrome reports
// it, or 2 cores or fewer) or one saving data gets the lite cut: the same shots and words, without bloom,
// light leak, grain or motion blur, and fewer specks in the air.

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Whether to play the lite cut here. Decided once per page; false on the server and in renders. */
export function prefersLiteMotion(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Nav;
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4) return true;
  // Safari doesn't report memory; its core count is the only sign, and iPhones have plenty.
  return typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 2;
}
