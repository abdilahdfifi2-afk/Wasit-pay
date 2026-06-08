
CREATE TABLE public.admin_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_actions_log TO authenticated;
GRANT ALL ON public.admin_actions_log TO service_role;

ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view admin actions log"
  ON public.admin_actions_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert admin actions log"
  ON public.admin_actions_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = admin_id);

CREATE INDEX idx_admin_actions_log_admin_id ON public.admin_actions_log(admin_id);
CREATE INDEX idx_admin_actions_log_created_at ON public.admin_actions_log(created_at DESC);
