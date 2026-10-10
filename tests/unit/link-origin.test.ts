// Links organizers copy never carry a Vercel address (src/admin/link-origin.ts).
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { linkOrigin, PUBLIC_ORIGIN } from "@/admin/link-origin";

test("a Vercel address becomes showlnk.com", () => {
  assert.equal(linkOrigin("https://spectrum-legal-services-git-claude-report-rev-a11682-trust-cd32.vercel.app"), PUBLIC_ORIGIN);
  assert.equal(linkOrigin("https://spectrum-legal-services-y39g3kor6-trust-cd32.vercel.app"), PUBLIC_ORIGIN);
});

test("showlnk.com and local servers keep their own", () => {
  assert.equal(linkOrigin("https://www.showlnk.com"), "https://www.showlnk.com");
  assert.equal(linkOrigin("http://localhost:3002"), "http://localhost:3002");
});
