import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitePage } from "./accept-invite";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset your password | Pacific North Rentals" }] }),
  component: AcceptInvitePage,
});
