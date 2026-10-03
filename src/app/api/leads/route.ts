import { after } from "next/server";
import { site } from "@/config/site";
import type { Funnel } from "@/data/funnel-types";
import { funnelReel, getReel } from "@/data/reels";
import {
  isCaseType,
  isValidEmail,
  isValidPhone,
  LEAD_LIMITS,
  type LeadInput,
  type LeadIntent,
  type LeadSource,
} from "@/lib/leads";
import { getLiveFunnelById } from "@/lib/server/publications";
import { callRpc } from "@/lib/server/supabase";
import { normalizeSourceTag, sourceLabel } from "@/lib/source-tag";

const FORM_NAMES: Record<LeadSource, string> = {
  hero: "hero form",
  contact: "contact form",
  funnel: "video funnel",
};

const SOURCES: LeadSource[] = ["hero", "contact", "funnel"];
const INTENTS: LeadIntent[] = ["book", "text_later"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalString(value: unknown, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > max) return null;
  return value.trim() || undefined;
}

type ParsedLead = { lead: LeadInput; funnel?: Funnel };

// Returns the cleaned lead, or a message describing the first invalid field.
// The website forms ask for an email; a funnel asks for a mobile number,
// since its follow-ups are a call or a text.
// `liveFunnel` is the funnel named by body.funnelId, as published.
function parseLead(body: Record<string, unknown>, liveFunnel: Funnel | undefined): ParsedLead | string {
  const { source, name, caseType } = body;
  if (typeof source !== "string" || !SOURCES.includes(source as LeadSource)) {
    return "Unknown form";
  }
  const funnel = source === "funnel" ? liveFunnel : undefined;
  if (source === "funnel" && !funnel) return "Unknown form";
  const intent = body.intent ?? "book";
  if (
    typeof intent !== "string" ||
    !INTENTS.includes(intent as LeadIntent) ||
    (intent === "text_later" && source !== "funnel")
  ) {
    return "Unknown request";
  }
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > LEAD_LIMITS.name
  ) {
    return "Name is required";
  }

  const email = optionalString(body.email, LEAD_LIMITS.email);
  if (email === null || (email && !isValidEmail(email))) {
    return "Please enter a valid email";
  }
  if (!email && source !== "funnel") return "Please enter a valid email";

  if (
    typeof caseType !== "string" ||
    !(funnel ? funnel.brand.services.includes(caseType) : isCaseType(caseType))
  ) {
    return "Please select a case type";
  }

  const phone = optionalString(body.phone, LEAD_LIMITS.phone);
  const message = optionalString(body.message, LEAD_LIMITS.message);
  if (phone === null) return "Phone number is too long";
  if (message === null) return "Message is too long";
  if (source === "contact" && (!phone || !message)) {
    return "Phone number and message are required";
  }
  if (source === "funnel" && (!phone || !isValidPhone(phone))) {
    return "Please enter a mobile number with area code";
  }

  const smsConsent = body.smsConsent === true;
  if (intent === "text_later" && !smsConsent) {
    return "Please agree to receive texts, or call us instead";
  }

  const visitorId =
    typeof body.visitorId === "string" && UUID_PATTERN.test(body.visitorId)
      ? body.visitorId
      : undefined;
  const referringReelId =
    typeof body.referringReelId === "string" &&
    (funnel ? funnelReel(funnel, body.referringReelId) : getReel(body.referringReelId))
      ? body.referringReelId
      : undefined;

  return {
    funnel,
    lead: {
    source: source as LeadSource,
    funnelId: funnel?.id,
    intent: intent as LeadIntent,
    name: name.trim(),
    email,
    phone,
    caseType,
    message,
    visitorId,
    referringReelId,
    sourceTag: normalizeSourceTag(body.sourceTag),
    smsConsent,
    },
  };
}

async function notifyFirm(lead: LeadInput, funnel?: Funnel) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL;
  if (!apiKey || !to || !from) return;

  const reel = lead.referringReelId
    ? funnel
      ? funnelReel(funnel, lead.referringReelId)
      : getReel(lead.referringReelId)
    : undefined;
  const textLater = lead.intent === "text_later";
  const text = [
    textLater
      ? `Asked to be texted the next video (${FORM_NAMES[lead.source]})`
      : `New consultation request (${FORM_NAMES[lead.source]})`,
    funnel ? `Funnel: ${funnel.brand.name} (/f/${funnel.slug})` : null,
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email ?? "not given"}`,
    `Phone: ${lead.phone ?? "not given"}`,
    `Case type: ${lead.caseType}`,
    reel ? `Came from video: ${reel.title}` : null,
    lead.source === "funnel" ? `Link source: ${sourceLabel(lead.sourceTag)}` : null,
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
      ...(lead.email ? { reply_to: lead.email } : {}),
      subject: textLater
        ? `${lead.caseType}: text-me-later request`
        : `New ${lead.caseType} consultation request`,
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

  const liveFunnel =
    fields.source === "funnel" && typeof fields.funnelId === "string"
      ? await getLiveFunnelById(fields.funnelId)
      : undefined;
  const parsed = parseLead(fields, liveFunnel);
  if (typeof parsed === "string") {
    return Response.json({ error: parsed }, { status: 400 });
  }
  const { lead, funnel } = parsed;
  // A sample funnel's business doesn't exist, so it never collects details.
  if (funnel?.sample) {
    return Response.json(
      { error: "This sample funnel doesn't accept submissions." },
      { status: 403 }
    );
  }

  const result = await callRpc<string>("submit_lead_v3", {
    p_source: lead.source,
    p_name: lead.name,
    p_email: lead.email ?? null,
    p_phone: lead.phone ?? null,
    p_case_type: lead.caseType,
    p_message: lead.message ?? null,
    p_visitor_id: lead.visitorId ?? null,
    p_referring_reel_id: lead.referringReelId ?? null,
    p_intent: lead.intent ?? "book",
    p_source_tag: lead.sourceTag ?? null,
    // Saved word for word, as the record of what the person agreed to.
    p_sms_consent_text: lead.smsConsent && funnel ? funnel.brand.smsConsent : null,
    p_funnel_id: lead.funnelId ?? null,
  });
  if (!result.ok) {
    console.error("submit_lead_v3 failed", result.status, result.error);
    return Response.json(
      { error: "We couldn't send your request. Please call us instead." },
      { status: 503 }
    );
  }

  after(() =>
    notifyFirm(lead, funnel).catch((err) =>
      console.error("Lead notification email failed", err)
    )
  );

  return Response.json({ ok: true }, { status: 201 });
}
