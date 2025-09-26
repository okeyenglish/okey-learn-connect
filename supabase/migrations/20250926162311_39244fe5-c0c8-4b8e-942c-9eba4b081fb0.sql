-- Fix RLS policies for clients table to allow proper access
-- First, let's update the clients RLS policy to be more permissive for authenticated users

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view clients from their branches" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients to their branches" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients from their branches" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients from their branches" ON public.clients;

-- Create more permissive policies for clients table
CREATE POLICY "Authenticated users can view all active clients"
ON public.clients
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage clients"
ON public.clients
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Also fix chat_messages policies to be more accessible
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON public.chat_messages;

CREATE POLICY "Authenticated users can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update chat messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));