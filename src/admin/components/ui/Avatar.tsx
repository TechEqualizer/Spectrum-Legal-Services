/** The admin's photo, or their initial on a soft circle when there's none. */
export default function Avatar({ name, email, url, className = "h-7 w-7 text-xs" }: { name?: string; email: string; url?: string; className?: string }) {
  const initial = (name || email)[0]?.toUpperCase() ?? "?";
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- a small photo from the admin's own storage folder
    <img src={url} alt="" className={`flex-shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span aria-hidden="true" className={`flex flex-shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-white ${className}`}>
      {initial}
    </span>
  );
}
