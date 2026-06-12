
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'physician', 'clinical_staff', 'billing');
CREATE TYPE public.auth_status AS ENUM ('draft', 'pending', 'submitted', 'under_review', 'approved', 'denied', 'appealed');
CREATE TYPE public.appeal_status AS ENUM ('drafted', 'submitted', 'under_review', 'approved', 'denied');
CREATE TYPE public.document_category AS ENUM ('clinical_note', 'physician_order', 'mri_report', 'ct_report', 'xray_report', 'lab_result', 'referral', 'other');
CREATE TYPE public.user_status AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE public.notification_kind AS ENUM ('auth_status_change', 'appeal_update', 'high_risk', 'mention', 'system');

-- ============ PROFILES + ROLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  title TEXT,
  department TEXT,
  npi TEXT,
  organization TEXT,
  status user_status NOT NULL DEFAULT 'active',
  theme TEXT DEFAULT 'system',
  notification_prefs JSONB DEFAULT '{"auth_status_change":true,"appeal_update":true,"high_risk":true,"mention":true}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() IS NOT NULL $$;

-- profiles policies
CREATE POLICY "auth users read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "admins update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles policies
CREATE POLICY "auth users read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ HANDLE NEW USER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
  default_role app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN default_role := 'admin'; ELSE default_role := 'clinical_staff'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, default_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PATIENTS ============
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  insurance_payer TEXT,
  insurance_member_id TEXT,
  insurance_group TEXT,
  plan_type TEXT,
  subscriber_relationship TEXT,
  effective_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage patients" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ AUTHORIZATIONS ============
CREATE TABLE public.authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  diagnosis TEXT,
  diagnosis_code TEXT,
  procedure_requested TEXT,
  procedure_code TEXT,
  payer TEXT,
  urgency TEXT DEFAULT 'routine',
  status auth_status NOT NULL DEFAULT 'draft',
  clinical_notes TEXT,
  referring_physician TEXT,
  -- risk fields
  approval_probability NUMERIC,
  denial_probability NUMERIC,
  documentation_risk NUMERIC,
  coding_risk NUMERIC,
  payer_complexity NUMERIC,
  risk_score NUMERIC,
  risk_rationale TEXT,
  risk_factors JSONB,
  recommended_actions JSONB,
  ai_confidence NUMERIC,
  ai_model TEXT,
  risk_generated_at TIMESTAMPTZ,
  -- ai extraction summary
  ai_summary JSONB,
  ai_scores JSONB,
  -- workflow timestamps
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.authorizations TO authenticated;
GRANT ALL ON public.authorizations TO service_role;
ALTER TABLE public.authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage authorizations" ON public.authorizations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_auth_patient ON public.authorizations(patient_id);
CREATE INDEX idx_auth_status ON public.authorizations(status);
CREATE INDEX idx_auth_created ON public.authorizations(created_at DESC);

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  authorization_id UUID REFERENCES public.authorizations(id) ON DELETE SET NULL,
  category document_category NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_docs_patient ON public.documents(patient_id);

-- ============ APPEALS ============
CREATE TABLE public.appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorization_id UUID NOT NULL REFERENCES public.authorizations(id) ON DELETE CASCADE,
  status appeal_status NOT NULL DEFAULT 'drafted',
  version INT NOT NULL DEFAULT 1,
  current BOOLEAN NOT NULL DEFAULT true,
  appeal_letter TEXT,
  clinical_justification TEXT,
  supporting_evidence TEXT,
  payer_response_draft TEXT,
  ai_model TEXT,
  ai_confidence NUMERIC,
  assigned_to UUID REFERENCES auth.users(id),
  outcome TEXT,
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeals TO authenticated;
GRANT ALL ON public.appeals TO service_role;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage appeals" ON public.appeals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_appeals_auth ON public.appeals(authorization_id);

CREATE TABLE public.appeal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID NOT NULL REFERENCES public.appeals(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  body TEXT NOT NULL,
  internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appeal_notes TO authenticated;
GRANT ALL ON public.appeal_notes TO service_role;
ALTER TABLE public.appeal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users manage appeal notes" ON public.appeal_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.appeal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id UUID NOT NULL REFERENCES public.appeals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.appeal_events TO authenticated;
GRANT ALL ON public.appeal_events TO service_role;
ALTER TABLE public.appeal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read appeal events" ON public.appeal_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth users insert appeal events" ON public.appeal_events FOR INSERT TO authenticated WITH CHECK (true);

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  authorization_id UUID REFERENCES public.authorizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read activity" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth users insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_activity_patient ON public.activity_log(patient_id, created_at DESC);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth users insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth users insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);

-- ============ APP SETTINGS ============
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  organization_name TEXT DEFAULT 'PriorFlow Health',
  default_payer TEXT,
  notification_prefs JSONB DEFAULT '{}'::jsonb,
  ai_insights JSONB,
  ai_insights_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_auth_updated BEFORE UPDATE ON public.authorizations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_appeals_updated BEFORE UPDATE ON public.appeals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
