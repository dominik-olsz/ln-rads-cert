-- Create course_purchases table to track user course ownership
CREATE TABLE public.course_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_status TEXT NOT NULL DEFAULT 'completed',
  amount_paid INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view their own purchases"
ON public.course_purchases
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can insert their own purchases"
ON public.course_purchases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all purchases"
ON public.course_purchases
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));