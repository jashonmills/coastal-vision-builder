import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route. The category-based image library now lives inside the unified
// Site Content hub as the "Media Library" tab.
export const Route = createFileRoute("/admin/site-images")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/content", search: { tab: "media" } as never });
  },
});
