
CREATE POLICY "Students can unlink themselves"
ON public.linked_accounts
FOR DELETE
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Parents and schools can unlink students"
ON public.linked_accounts
FOR DELETE
TO authenticated
USING (parent_or_school_id = auth.uid());
