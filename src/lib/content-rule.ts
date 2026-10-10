// The content rule for reels, written once: the organizer terms show it, and
// the fans-only switch (docs/plans/02-fans.md, step 3) shows it beside the switch.

export const CONTENT_RULE = {
  summary: "Suggestive yes, explicit no.",
  rules: [
    "No nudity and no sex acts, in any reel, fans-only or not.",
    "Nothing sexual involving anyone under 18, ever. We report it.",
    "Anyone people can recognize in a fans-only reel has agreed to be in it.",
    "AI-made footage is never presented as real footage of a real night or a real person.",
  ],
} as const;
