CREATE TABLE public.user_dismissed_hints (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hint_key text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hint_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_dismissed_hints TO authenticated;
GRANT ALL ON public.user_dismissed_hints TO service_role;

ALTER TABLE public.user_dismissed_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dismissed hints"
  ON public.user_dismissed_hints FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own dismissed hints"
  ON public.user_dismissed_hints FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own dismissed hints"
  ON public.user_dismissed_hints FOR DELETE TO authenticated
  USING (user_id = auth.uid());