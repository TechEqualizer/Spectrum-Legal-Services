// Recognition listed on jlffirm.com, as text rather than the organizations'
// trademarked logos. Confirm each one with the firm before launch.
const awards = [
  "Featured in Forbes",
  "Featured in USA Today",
  "Consumer Attorneys Association of Los Angeles Member",
  "Rated by Super Lawyers",
  "The National Trial Lawyers Top 40 Under 40",
  "Multi-Million Dollar Advocates Forum",
];

export default function Awards() {
  return (
    <section className="bg-soft-gray py-10 md:py-12" aria-labelledby="awards-heading">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
        <h2
          id="awards-heading"
          className="flex-shrink-0 text-center text-2xl font-black uppercase leading-none tracking-wide text-deep-navy lg:text-left"
        >
          Highly
          <br className="hidden lg:block" /> Awarded
        </h2>
        <ul className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" role="list">
          {awards.map((award) => (
            <li
              key={award}
              className="flex min-h-20 items-center justify-center rounded-full border-2 border-deep-navy/15 bg-white px-4 py-3 text-center text-xs font-bold uppercase leading-snug tracking-wide text-deep-navy"
            >
              {award}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
