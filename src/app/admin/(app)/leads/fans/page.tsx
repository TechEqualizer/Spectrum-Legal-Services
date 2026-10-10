import Fans from "@/admin/components/Fans";

// Fans sit beside Leads (both are the people a link brought in), so the
// nav stays at its few places: /admin/leads/fans keeps Leads highlighted.
export default function Page() {
  return <Fans />;
}
