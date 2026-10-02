import { after } from "next/server";
import { site } from "@/config/site";
import { getReel } from "@/data/reels";
import {
  isCaseType,
  isValidEmail,
  LEAD_LIMITS,
  type LeadInput,
  type LeadSource,
} from "@/lib/leads";
import { callRpc } from "@/lib/server/supabase";

const SOURCES: LeadSource[] = ["hero", "contact"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalString(value: unknown, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) return null;
  return value.trim() || undefined;
}

// Returns the cleaned lead, or a message describing the first invalid field.
function parseLead(body: Record<string, unknown>): LeadInput | string {
  const { source, name, email, caseType } = body;
  if (typeof source !== "string" || !SOURCES.includes(source as LeadSource)) {
    return "Unknown form";
  }
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > LEAD_LIMITS.name
  ) {
    return "Name is required";
  }
  if (
    typeof email !== "string" ||
    email.length > LEAD_LIMITS.email ||
    !isValidEmail(email.trim())
  ) {
    return "Please enter a valid email";
  }
  if (typeof caseType !== "string" || !isCaseType(caseType)) {
    return "Please select a case type";
  }

  const phone = optionalString(body.phone, LEAD_LIMITS.phone);
  const message = optionalString(body.message, LEAD_LIMITS.message);
  if (phone === null) return "Phone number is too long";
  if (message === null) return "Message is too long";
  if (source === "contact" && (!phone || !message)) {
    return "Phone number and message are required";
  }

  const visitorId =
    typeof body.visitorId === "string" && UUID_PATTERN.test(body.visitorId)
      ? body.visitorId
      : undefined;
  const referringReelId =
    typeof body.referringReelId === "string" && getReel(body.referringReelId)
      ? body.referringReelId
      : undefined;

  return {
    source: source as LeadSource,
    name: name.trim(),
    email: email.trim(),
    phone,
    caseType,
    message,
    visitorId,
    referringReelId,
  };
}

async function notifyFirm(lead: LeadInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL;
  if (!apiKey || !to || !from) return;

  const reel = lead.referringReelId ? getReel(lead.referringReelId) : undefined;
  const text = [
    `New consultation request (${lead.source === "hero" ? "hero form" : "contact form"})`,
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone ?? "not given"}`,
    `Case type: ${lead.caseType}`,
    reel ? `Came from video: ${reel.title}` : null,
    "",
    lead.message ?? "(no message)",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: to.split(",").map((addr) => addr.trim()),
      reply_to: lead.email,
      subject: `New ${lead.caseType} consultation request`,
      text,
    }),
  });
  if (!res.ok) {
    console.error("Lead notification email failed", res.status, await res.text());
  }
}

export async function POST(request: Request) {
  // The concept site must not collect anyone's details, even if called directly.
  if (site.demoMode) {
    return Response.json(
      { error: "This concept site doesn't accept submissions." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const fields = body as Record<string, unknown>;

  // Honeypot: a hidden field people never see. Bots that fill it get a
  // success response, but nothing is saved.
  if (typeof fields.website === "string" && fields.website !== "") {
    return Response.json({ ok: true }, { status: 201 });
  }

  const lead = parseLead(fields);
  if (typeof lead === "string") {
    return Response.json({ error: lead }, { status: 400 });
  }

  const result = await callRpc<string>("submit_lead", {
    p_source: lead.source,
    p_name: lead.name,
    p_email: lead.email,
    p_phone: lead.phone ?? null,
    p_case_type: lead.caseType,
    p_message: lead.message ?? null,
    p_visitor_id: lead.visitorId ?? null,
    p_referring_reel_id: lead.referringReelId ?? null,
  });
  if (!result.ok) {
    console.error("submit_lead failed", result.status, result.error);
    return Response.json(
      { error: "We couldn't send your request. Please call us instead." },
      { status: 503 }
    );
  }

  after(() =>
    notifyFirm(lead).catch((err) =>
      console.error("Lead notification email failed", err)
    )
  );

  return Response.json({ ok: true }, { status: 201 });
}
