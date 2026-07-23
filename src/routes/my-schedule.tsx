import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — the crew experience moved to /staff.
export const Route = createFileRoute("/my-schedule")({
  beforeLoad: () => {
    throw redirect({ to: "/staff" });
  },
});
