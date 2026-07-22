import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin | Pacific North Events & Tents" }] }),
  component: () => <Outlet />,
});
