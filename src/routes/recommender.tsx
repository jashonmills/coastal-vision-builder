import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/recommender")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-tent-planner" });
  },
});
