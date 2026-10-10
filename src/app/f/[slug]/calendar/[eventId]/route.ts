import { calendarFile } from "@/lib/server/ics";
import { getLiveFunnel } from "@/lib/server/publications";

// "Add to calendar" for an event date: a calendar file (.ics) that phones
// and computers open in their own calendar app. Uses the published date.

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; eventId: string }> }) {
  const { slug, eventId } = await params;
  const funnel = await getLiveFunnel(slug);
  const event = funnel?.events?.find((e) => e.id === eventId);
  if (!event) return new Response("Not found", { status: 404 });

  const filename = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "event"}.ics`;
  return new Response(calendarFile([{ slug, event }]), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
