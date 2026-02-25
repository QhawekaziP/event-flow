
-- Add qr_token to rsvps for unique QR codes
ALTER TABLE public.rsvps ADD COLUMN IF NOT EXISTS qr_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Create event_hosts table so creators can designate hosts who can scan
CREATE TABLE public.event_hosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_hosts ENABLE ROW LEVEL SECURITY;

-- Anyone can view hosts (needed to check if current user is a host)
CREATE POLICY "Anyone can view event hosts" ON public.event_hosts FOR SELECT USING (true);

-- Event owners can manage hosts
CREATE POLICY "Event owners can insert hosts" ON public.event_hosts FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_hosts.event_id AND events.user_id = auth.uid()));

CREATE POLICY "Event owners can delete hosts" ON public.event_hosts FOR DELETE
USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_hosts.event_id AND events.user_id = auth.uid()));

-- Update rsvps SELECT policy to also allow hosts to view
DROP POLICY IF EXISTS "Users can view own rsvps" ON public.rsvps;
CREATE POLICY "Users can view own rsvps or host/cohost can view" ON public.rsvps FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM events WHERE events.id = rsvps.event_id AND events.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM event_hosts WHERE event_hosts.event_id = rsvps.event_id AND event_hosts.user_id = auth.uid())
);

-- Update rsvps UPDATE policy to allow hosts to update (for check-in)
DROP POLICY IF EXISTS "Users or hosts can update rsvps" ON public.rsvps;
CREATE POLICY "Users or hosts can update rsvps" ON public.rsvps FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM events WHERE events.id = rsvps.event_id AND events.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM event_hosts WHERE event_hosts.event_id = rsvps.event_id AND event_hosts.user_id = auth.uid())
);
