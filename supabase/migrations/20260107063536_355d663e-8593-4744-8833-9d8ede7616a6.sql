-- Create forum_categories table
CREATE TABLE public.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text DEFAULT 'MessageSquare',
  created_at timestamptz DEFAULT now()
);

-- Create forum_posts table
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.forum_categories(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum_replies table
CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_reply_id uuid REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Forum Categories Policies (anyone can view, admins can manage)
CREATE POLICY "Anyone can view forum categories"
ON public.forum_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage forum categories"
ON public.forum_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Forum Posts Policies
CREATE POLICY "Authenticated users can view posts"
ON public.forum_posts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Parents can create posts"
ON public.forum_posts FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() AND 
  public.has_role(auth.uid(), 'parent')
);

CREATE POLICY "Authors can update own posts"
ON public.forum_posts FOR UPDATE
TO authenticated
USING (author_id = auth.uid() AND is_locked = false);

CREATE POLICY "Admins can manage all posts"
ON public.forum_posts FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Forum Replies Policies
CREATE POLICY "Authenticated users can view replies"
ON public.forum_replies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Parents can create replies"
ON public.forum_replies FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid() AND 
  public.has_role(auth.uid(), 'parent') AND
  EXISTS (SELECT 1 FROM public.forum_posts WHERE id = post_id AND is_locked = false)
);

CREATE POLICY "Authors can update own replies"
ON public.forum_replies FOR UPDATE
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Admins can manage all replies"
ON public.forum_replies FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_forum_posts_category ON public.forum_posts(category_id);
CREATE INDEX idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX idx_forum_posts_created ON public.forum_posts(created_at DESC);
CREATE INDEX idx_forum_replies_post ON public.forum_replies(post_id);
CREATE INDEX idx_forum_replies_parent ON public.forum_replies(parent_reply_id);

-- Trigger to update updated_at on posts
CREATE TRIGGER update_forum_posts_updated_at
BEFORE UPDATE ON public.forum_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default forum categories
INSERT INTO public.forum_categories (name, description, icon) VALUES
('General Discussion', 'General topics about education and parenting', 'MessageSquare'),
('Study Tips', 'Share and discover effective study strategies', 'Lightbulb'),
('School Selection', 'Discuss schools and admissions in Uganda', 'School'),
('PLE Preparation', 'Tips and resources for Primary Leaving Examinations', 'GraduationCap'),
('Platform Feedback', 'Suggestions and feedback for Msomesa', 'MessageCircle');