// Following an organizer (docs/plans/02-fans.md), shared by the Follow form
// and the server: the words a fan agrees to are saved with their follow.

/** What a fan agrees to by following, word for word. */
export const followConsent = (organizer: string) =>
  `I'd like ${organizer} to email me about upcoming nights, presales and fans-only reels through Showlnk. I can unfollow any time.`;
