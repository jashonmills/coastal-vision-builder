import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { dismissHint, listMyDismissedHints } from "@/lib/hints.functions";

export function useDismissedHints() {
  const { user } = useAuth();
  const fn = useServerFn(listMyDismissedHints);
  const q = useQuery({
    queryKey: ["dismissed-hints"],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => (await fn()) as string[],
  });
  const set = new Set<string>(q.data ?? []);
  return { isDismissed: (key: string) => set.has(key), isLoading: q.isLoading };
}

export function HelpTip({
  hintKey,
  title,
  children,
  className,
}: {
  hintKey: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { isDismissed, isLoading } = useDismissedHints();
  const dismissFn = useServerFn(dismissHint);
  const dismiss = useMutation({
    mutationFn: () => dismissFn({ data: { hint_key: hintKey } }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["dismissed-hints"] });
      const prev = qc.getQueryData<string[]>(["dismissed-hints"]) ?? [];
      qc.setQueryData<string[]>(["dismissed-hints"], [...prev, hintKey]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["dismissed-hints"], ctx.prev);
    },
  });

  if (!user || isLoading || isDismissed(hintKey)) return null;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-3 text-sm text-foreground ${className ?? ""}`}
      role="note"
    >
      <Lightbulb className="mt-0.5 h-4 w-4 flex-none text-[color:var(--gold)]" />
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 font-semibold text-primary">{title}</p>}
        <div className="text-[13px] leading-snug text-foreground/90">{children}</div>
      </div>
      <button
        type="button"
        onClick={() => dismiss.mutate()}
        aria-label="Dismiss tip"
        className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
