"use client";

import { Eyebrow, headingClass, Swoosh } from "@/components/Brand";
import { requestConsultation } from "@/lib/consultation";

// Practice areas listed by the firm. `caseType` must match the intake form.
const practiceAreas = [
  { title: "Car Accidents", caseType: "Car Accident" },
  { title: "Truck Accidents", caseType: "Truck Accident" },
  { title: "Motorcycle Accidents", caseType: "Motorcycle Accident" },
  { title: "Uber & Lyft Accidents", caseType: "Uber / Lyft Accident" },
  { title: "Pedestrian Accidents", caseType: "Pedestrian Accident" },
  { title: "Bicycle Accidents", caseType: "Bicycle Accident" },
  { title: "Slip, Trip & Fall", caseType: "Slip, Trip & Fall" },
  { title: "Dog Bites", caseType: "Dog Bite" },
  { title: "Wrongful Death", caseType: "Wrongful Death" },
];

export default function PracticeAreas() {
  return (
    <section
      id="practice-areas"
      className="section-padding bg-white"
      aria-labelledby="practice-areas-heading"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="mb-10 grid gap-6 md:mb-14 lg:grid-cols-2 lg:items-end">
          <div>
            <Eyebrow>Practice Areas</Eyebrow>
            <h2
              id="practice-areas-heading"
              className={`${headingClass} mt-1 text-4xl text-deep-navy md:text-5xl`}
            >
              Cases We Handle
            </h2>
            <Swoosh className="mt-2 h-3 w-56 text-teal-accent md:w-72" />
          </div>
          <p className="text-base text-charcoal md:text-lg lg:text-right">
            Our injury attorneys handle all cases where serious injury and
            negligence are involved. We are a plaintiff&apos;s firm first. Our
            team knows how to examine what led up to your accident. Put our
            varied legal experience to work for you.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6" role="list">
          {practiceAreas.map((area) => (
            <li key={area.title}>
              <button
                type="button"
                onClick={() => requestConsultation(area.caseType)}
                className="group relative flex aspect-[4/3] w-full items-end overflow-hidden bg-gradient-to-br from-royal-blue to-deep-navy p-4 text-left md:p-7"
                aria-label={`${area.title}: start a free case evaluation`}
              >
                <span className="absolute inset-0 bg-deep-navy/0 transition-colors duration-300 group-hover:bg-teal-accent/30" />
                <span className="relative text-lg font-black uppercase leading-[1.05] tracking-wide text-white sm:text-2xl md:text-3xl">
                  {area.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
