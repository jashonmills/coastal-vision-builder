import { createFileRoute, redirect } from "@tanstack/react-router";

// Pricing editor lives inside the main /admin tabs. Keep /admin/pricing
// as a stable URL alias so it can be linked from navigation/docs.
export const Route = createFileRoute("/admin/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
