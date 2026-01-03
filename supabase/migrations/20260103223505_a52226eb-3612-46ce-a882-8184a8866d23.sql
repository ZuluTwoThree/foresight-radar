-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Create horizon enum for signal time horizons
CREATE TYPE public.horizon_type AS ENUM ('0_5', '5_10', '10_plus');

-- Create certainty enum
CREATE TYPE public.certainty_type AS ENUM ('certain', 'uncertain', 'wildcard');

-- Create impact enum
CREATE TYPE public.impact_type AS ENUM ('low', 'medium', 'high');

-- Create source type enum
CREATE TYPE public.source_type AS ENUM ('domain', 'rss', 'alert', 'manual');

-- Create job type enum
CREATE TYPE public.job_type AS ENUM ('scan', 'reindex');

-- Create job status enum
CREATE TYPE public.job_status AS ENUM ('pending', 'running', 'done', 'error');

-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create members table (workspace membership)
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sources table
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type source_type NOT NULL DEFAULT 'manual',
  url_or_term TEXT NOT NULL,
  name TEXT,
  active BOOLEAN DEFAULT true,
  crawl_interval_minutes INTEGER DEFAULT 180,
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create signals table
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 180),
  url TEXT,
  content TEXT,
  summary TEXT CHECK (char_length(summary) <= 1200),
  lang TEXT DEFAULT 'en',
  ai_tags TEXT[] DEFAULT '{}',
  relevance INTEGER DEFAULT 50 CHECK (relevance >= 0 AND relevance <= 100),
  horizon horizon_type DEFAULT '5_10',
  certainty certainty_type DEFAULT 'uncertain',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trends table
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  description TEXT CHECK (char_length(description) <= 1800),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  impact impact_type DEFAULT 'medium',
  certainty certainty_type DEFAULT 'uncertain',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create signal_trend junction table
CREATE TABLE public.signal_trend (
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (signal_id, trend_id)
);

-- Create megatrends table
CREATE TABLE public.megatrends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 120),
  description TEXT CHECK (char_length(description) <= 1200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trend_megatrend junction table
CREATE TABLE public.trend_megatrend (
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  megatrend_id UUID NOT NULL REFERENCES public.megatrends(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trend_id, megatrend_id)
);

-- Create jobs table for background tasks
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type job_type NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_trend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.megatrends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_megatrend ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
  )
$$;

-- Create function to get user's role in workspace
CREATE OR REPLACE FUNCTION public.get_workspace_role(workspace_uuid UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.members
  WHERE workspace_id = workspace_uuid
  AND user_id = auth.uid()
$$;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they belong to"
  ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(id));

CREATE POLICY "Owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (public.get_workspace_role(id) IN ('owner', 'admin'));

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for members
CREATE POLICY "Users can view members of their workspaces"
  ON public.members FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can manage members"
  ON public.members FOR ALL
  USING (public.get_workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Users can insert themselves as owner when creating workspace"
  ON public.members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- RLS Policies for sources
CREATE POLICY "Users can view sources in their workspaces"
  ON public.sources FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can manage sources"
  ON public.sources FOR ALL
  USING (public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

-- RLS Policies for signals
CREATE POLICY "Users can view signals in their workspaces"
  ON public.signals FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can manage signals"
  ON public.signals FOR ALL
  USING (public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

-- RLS Policies for trends
CREATE POLICY "Users can view trends in their workspaces"
  ON public.trends FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can manage trends"
  ON public.trends FOR ALL
  USING (public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

-- RLS Policies for signal_trend
CREATE POLICY "Users can view signal_trend links"
  ON public.signal_trend FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.signals WHERE id = signal_id AND public.is_workspace_member(workspace_id))
  );

CREATE POLICY "Members can manage signal_trend links"
  ON public.signal_trend FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.signals s WHERE s.id = signal_id AND public.get_workspace_role(s.workspace_id) IN ('owner', 'admin', 'member'))
  );

-- RLS Policies for megatrends
CREATE POLICY "Users can view megatrends in their workspaces"
  ON public.megatrends FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can manage megatrends"
  ON public.megatrends FOR ALL
  USING (public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

-- RLS Policies for trend_megatrend
CREATE POLICY "Users can view trend_megatrend links"
  ON public.trend_megatrend FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.trends WHERE id = trend_id AND public.is_workspace_member(workspace_id))
  );

CREATE POLICY "Members can manage trend_megatrend links"
  ON public.trend_megatrend FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.trends t WHERE t.id = trend_id AND public.get_workspace_role(t.workspace_id) IN ('owner', 'admin', 'member'))
  );

-- RLS Policies for jobs
CREATE POLICY "Users can view jobs in their workspaces"
  ON public.jobs FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Members can manage jobs"
  ON public.jobs FOR ALL
  USING (public.get_workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_signals_updated_at BEFORE UPDATE ON public.signals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trends_updated_at BEFORE UPDATE ON public.trends FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_megatrends_updated_at BEFORE UPDATE ON public.megatrends FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_members_workspace ON public.members(workspace_id);
CREATE INDEX idx_members_user ON public.members(user_id);
CREATE INDEX idx_sources_workspace ON public.sources(workspace_id);
CREATE INDEX idx_signals_workspace ON public.signals(workspace_id);
CREATE INDEX idx_signals_created_at ON public.signals(created_at DESC);
CREATE INDEX idx_trends_workspace ON public.trends(workspace_id);
CREATE INDEX idx_jobs_workspace ON public.jobs(workspace_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);