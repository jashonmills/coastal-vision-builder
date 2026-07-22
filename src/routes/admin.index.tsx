import { createFileRoute, redirect } from "@tanstack/react-router";

// The admin console now lands on the Dashboard. The former index page
// (pricing & content editor) lives at /admin/pricing.
export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});
