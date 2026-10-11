import Image from "next/image";

/**
 * Showlnk's logo (the gold S and the name in cream), for its night
 * backgrounds. Sized by height through className; the width follows.
 */
export default function ShowlnkLogo({ className = "h-8 w-auto", eager = false }: { className?: string; eager?: boolean }) {
  return (
    <Image
      src="/showlnk/logo.png"
      alt="Showlnk"
      width={438}
      height={86}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      className={className}
    />
  );
}
