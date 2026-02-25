
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  location TEXT DEFAULT '',
  interests TEXT[] DEFAULT '{}',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TIMESTAMPTZ NOT NULL,
  location TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Social',
  event_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Event questions (for restricted events)
CREATE TABLE public.event_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event questions" ON public.event_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Event owners can manage questions" ON public.event_questions FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));
CREATE POLICY "Event owners can update questions" ON public.event_questions FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));
CREATE POLICY "Event owners can delete questions" ON public.event_questions FOR DELETE TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));

-- RSVPs table
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  checked_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rsvps" ON public.rsvps FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));
CREATE POLICY "Users can create rsvps" ON public.rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users or hosts can update rsvps" ON public.rsvps FOR UPDATE TO authenticated 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own rsvps" ON public.rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RSVP answers (answers to event questions)
CREATE TABLE public.rsvp_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id UUID REFERENCES public.rsvps(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.event_questions(id) ON DELETE CASCADE NOT NULL,
  answer TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rsvp_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers or host can view" ON public.rsvp_answers FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM public.rsvps WHERE id = rsvp_id AND user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.rsvps r JOIN public.events e ON e.id = r.event_id 
      WHERE r.id = rsvp_id AND e.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own answers" ON public.rsvp_answers FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.rsvps WHERE id = rsvp_id AND user_id = auth.uid()));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rsvps_updated_at BEFORE UPDATE ON public.rsvps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
