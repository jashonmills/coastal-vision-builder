import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "./use-auth";
import { getMyStaffProfile } from "@/lib/staff.functions";

export function useIsStaff() {
  const { user, loading } = useAuth();
  const fn = useServerFn(getMyStaffProfile);

  const q = useQuery({
    queryKey: ["my-staff-profile", user?.id ?? "anon"],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: () => fn(),
  });

  return {
    isStaff: !!q.data,
    staff: q.data ?? null,
    loading: loading || (!!user && q.isLoading),
  };
}
