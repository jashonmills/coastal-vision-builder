import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StaffLayout } from "@/components/staff/StaffLayout";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Crew | Pacific North Events & Tents" },
      { name: "description", content: "Staff dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <StaffLayout>
      <Outlet />
    </StaffLayout>
  ),
});
