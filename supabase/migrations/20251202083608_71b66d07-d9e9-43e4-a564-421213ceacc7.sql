
-- =============================================
-- PHASE 1: ENUMS
-- =============================================

CREATE TYPE public.education_level AS ENUM ('PLE', 'UCE', 'UACE');
CREATE TYPE public.app_role AS ENUM ('student', 'parent', 'school', 'admin');
CREATE TYPE public.exam_mode AS ENUM ('practice', 'simulation');
CREATE TYPE public.exam_type AS ENUM ('Past Paper', 'Practice Paper');
CREATE TYPE public.difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');
CREATE TYPE public.answer_type AS ENUM ('text', 'numeric', 'open-ended');
CREATE TYPE public.subscription_plan AS ENUM ('Free', 'Premium');
CREATE TYPE public.link_status AS ENUM ('pending', 'accepted', 'rejected');

-- =============================================
-- PHASE 2: CORE TABLES
-- =============================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  level education_level,
  school TEXT,
  dob DATE,
  phone TEXT,
  contact_person TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (security critical - separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- User progress table (gamification)
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_exam_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Achievements master list
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User achievements (earned badges)
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

-- =============================================
-- PHASE 3: EXAM CONTENT TABLES
-- =============================================

-- Exams table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  year INTEGER NOT NULL,
  level education_level NOT NULL,
  time_limit INTEGER NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  type exam_type NOT NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'Medium',
  description TEXT,
  pdf_summary TEXT,
  explanation_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  image_url TEXT,
  table_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Question parts (sub-questions)
CREATE TABLE public.question_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 1,
  answer TEXT NOT NULL,
  explanation TEXT,
  answer_type answer_type NOT NULL DEFAULT 'text',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 4: USER ACTIVITY TABLES
-- =============================================

-- Exam attempts
CREATE TABLE public.exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  mode exam_mode NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Question history (spaced repetition)
CREATE TABLE public.question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_part_id UUID NOT NULL REFERENCES public.question_parts(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_correct BOOLEAN NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ,
  UNIQUE (user_id, question_part_id)
);

-- Study reminders
CREATE TABLE public.study_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  reminder_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 5: SUBSCRIPTION TABLES
-- =============================================

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'Free',
  billing_cycle TEXT DEFAULT 'monthly',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Billing records
CREATE TABLE public.billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 6: SOCIAL/NOTIFICATION TABLES
-- =============================================

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link requests (parent-child, school-student)
CREATE TABLE public.link_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status link_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Linked accounts
CREATE TABLE public.linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_or_school_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_or_school_id, student_id)
);

-- =============================================
-- PHASE 7: SECURITY FUNCTIONS
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Check if user has premium subscription
CREATE OR REPLACE FUNCTION public.has_premium(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id 
    AND plan = 'Premium'
    AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Check if users are linked
CREATE OR REPLACE FUNCTION public.is_linked_to(_parent_or_school_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.linked_accounts
    WHERE parent_or_school_id = _parent_or_school_id AND student_id = _student_id
  )
$$;

-- =============================================
-- PHASE 8: TRIGGERS
-- =============================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  -- Create user role (default to student)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  
  -- Create user progress
  INSERT INTO public.user_progress (user_id)
  VALUES (NEW.id);
  
  -- Create free subscription
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (NEW.id, 'Free');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_link_requests_updated_at
  BEFORE UPDATE ON public.link_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PHASE 9: ENABLE RLS
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 10: RLS POLICIES
-- =============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Parents/Schools can view linked students"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_linked_to(auth.uid(), id));

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES POLICIES
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER PROGRESS POLICIES
CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Parents/Schools can view linked student progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (public.is_linked_to(auth.uid(), user_id));

-- ACHIEVEMENTS POLICIES (public read)
CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER ACHIEVEMENTS POLICIES
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Parents/Schools can view linked student achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (public.is_linked_to(auth.uid(), user_id));

-- EXAMS POLICIES
CREATE POLICY "Authenticated users can view free exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (is_free = true);

CREATE POLICY "Premium users can view all exams"
  ON public.exams FOR SELECT
  TO authenticated
  USING (public.has_premium(auth.uid()));

CREATE POLICY "Admins can manage exams"
  ON public.exams FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- QUESTIONS POLICIES
CREATE POLICY "Users can view questions for accessible exams"
  ON public.questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id
      AND (e.is_free = true OR public.has_premium(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can manage questions"
  ON public.questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- QUESTION PARTS POLICIES
CREATE POLICY "Users can view question parts for accessible questions"
  ON public.question_parts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.exams e ON e.id = q.exam_id
      WHERE q.id = question_id
      AND (e.is_free = true OR public.has_premium(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can manage question parts"
  ON public.question_parts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- EXAM ATTEMPTS POLICIES
CREATE POLICY "Users can view own attempts"
  ON public.exam_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own attempts"
  ON public.exam_attempts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Parents/Schools can view linked student attempts"
  ON public.exam_attempts FOR SELECT
  TO authenticated
  USING (public.is_linked_to(auth.uid(), user_id));

-- QUESTION HISTORY POLICIES
CREATE POLICY "Users can manage own question history"
  ON public.question_history FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Parents/Schools can view linked student history"
  ON public.question_history FOR SELECT
  TO authenticated
  USING (public.is_linked_to(auth.uid(), user_id));

-- STUDY REMINDERS POLICIES
CREATE POLICY "Users can manage own reminders"
  ON public.study_reminders FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- SUBSCRIPTIONS POLICIES
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- BILLING RECORDS POLICIES
CREATE POLICY "Users can view own billing"
  ON public.billing_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage billing"
  ON public.billing_records FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can manage own notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- LINK REQUESTS POLICIES
CREATE POLICY "Users can view requests they sent or received"
  ON public.link_requests FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid());

CREATE POLICY "Parents/Schools can create link requests"
  ON public.link_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    requester_id = auth.uid() 
    AND (public.has_role(auth.uid(), 'parent') OR public.has_role(auth.uid(), 'school'))
  );

CREATE POLICY "Target users can update link requests"
  ON public.link_requests FOR UPDATE
  TO authenticated
  USING (target_id = auth.uid());

-- LINKED ACCOUNTS POLICIES
CREATE POLICY "Users can view their linked accounts"
  ON public.linked_accounts FOR SELECT
  TO authenticated
  USING (parent_or_school_id = auth.uid() OR student_id = auth.uid());

-- =============================================
-- PHASE 11: SEED DATA
-- =============================================

-- Insert achievements
INSERT INTO public.achievements (name, description, icon, xp_reward) VALUES
  ('First Steps', 'Complete your first exam', '🎯', 50),
  ('High Scorer', 'Score above 80% on any exam', '⭐', 100),
  ('Streak Master', 'Maintain a 7-day study streak', '🔥', 150),
  ('Subject Expert', 'Complete 10 exams in one subject', '📚', 200),
  ('Perfect Score', 'Score 100% on any exam', '🏆', 500),
  ('Early Bird', 'Study before 7 AM', '🌅', 25),
  ('Night Owl', 'Study after 10 PM', '🦉', 25),
  ('Consistency King', 'Study for 30 days straight', '👑', 300),
  ('Quick Learner', 'Complete an exam in under half the time limit', '⚡', 75),
  ('Explorer', 'Try exams from 5 different subjects', '🧭', 100);

-- Create indexes for better query performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_exams_level ON public.exams(level);
CREATE INDEX idx_exams_subject ON public.exams(subject);
CREATE INDEX idx_exams_is_free ON public.exams(is_free);
CREATE INDEX idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX idx_question_parts_question_id ON public.question_parts(question_id);
CREATE INDEX idx_exam_attempts_user_id ON public.exam_attempts(user_id);
CREATE INDEX idx_exam_attempts_exam_id ON public.exam_attempts(exam_id);
CREATE INDEX idx_question_history_user_id ON public.question_history(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_linked_accounts_parent_or_school_id ON public.linked_accounts(parent_or_school_id);
CREATE INDEX idx_linked_accounts_student_id ON public.linked_accounts(student_id);
