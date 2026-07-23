import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { getJobByQuote } from "@/lib/jobs.functions";

export function JobCrossLink({ quoteId }: { quoteId: string }) {
  const fn = useServerFn(getJobByQuote);
  const { data } = useQuery({
    queryKey: ["job-by-quote", quoteId],
    queryFn: () => fn({ data: { quote_id: quoteId } }),
    staleTime: 30_000,
  });
  if (!data?.id) return null;
  return (
    <Link
      to="/admin/jobs/$id"
      params={{ id: data.id }}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <Truck className="h-3 w-3" /> View job →
    </Link>
  );
}
