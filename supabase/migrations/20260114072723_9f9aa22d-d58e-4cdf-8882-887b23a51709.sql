-- Create link_codes table for code-based linking
CREATE TABLE public.link_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    creator_id uuid NOT NULL,
    creator_type text NOT NULL CHECK (creator_type IN ('parent', 'school')),
    used_by uuid,
    used_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.link_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Parents/Schools can create link codes
CREATE POLICY "Parents/Schools can create link codes"
ON public.link_codes
FOR INSERT
WITH CHECK (
    creator_id = auth.uid() 
    AND (
        (creator_type = 'parent' AND has_role(auth.uid(), 'parent'))
        OR (creator_type = 'school' AND has_role(auth.uid(), 'school'))
    )
);

-- Policy: Creators can view their own codes
CREATE POLICY "Creators can view own codes"
ON public.link_codes
FOR SELECT
USING (creator_id = auth.uid());

-- Policy: Anyone can view valid unused codes (for redemption)
CREATE POLICY "Anyone can view valid unused codes for redemption"
ON public.link_codes
FOR SELECT
USING (
    used_by IS NULL 
    AND expires_at > now()
);

-- Policy: Students can update codes (to redeem them)
CREATE POLICY "Students can redeem codes"
ON public.link_codes
FOR UPDATE
USING (
    used_by IS NULL 
    AND expires_at > now() 
    AND has_role(auth.uid(), 'student')
)
WITH CHECK (
    used_by = auth.uid()
);

-- Policy: Allow linked_accounts INSERT for code redemption
CREATE POLICY "Allow linked_accounts insert for code redemption"
ON public.linked_accounts
FOR INSERT
WITH CHECK (
    student_id = auth.uid()
    AND has_role(auth.uid(), 'student')
    AND EXISTS (
        SELECT 1 FROM public.link_codes
        WHERE link_codes.creator_id = linked_accounts.parent_or_school_id
        AND link_codes.used_by = auth.uid()
    )
);

-- Create index for faster code lookups
CREATE INDEX idx_link_codes_code ON public.link_codes(code);
CREATE INDEX idx_link_codes_creator ON public.link_codes(creator_id);