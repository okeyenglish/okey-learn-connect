import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  user_id: string;
  start_of_day: string;
  end_of_day: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { user_id, start_of_day, end_of_day } = body;

    if (!user_id || !start_of_day || !end_of_day) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count outgoing messages sent by this user today
    // Self-hosted schema uses message_type = 'manager' for outgoing messages
    const { count, error: countError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('message_type', 'manager')
      .gte('created_at', start_of_day)
      .lte('created_at', end_of_day);

    if (countError) {
      console.error('[get-today-messages-count] Count error:', countError);
      return new Response(
        JSON.stringify({ total: 0, lastMessageTime: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get last message time
    const { data: lastMessage, error: lastMessageError } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('message_type', 'manager')
      .gte('created_at', start_of_day)
      .lte('created_at', end_of_day)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastMessageError) {
      console.error('[get-today-messages-count] Last message error:', lastMessageError);
    }

    const lastMessageTime = lastMessage
      ? new Date(lastMessage.created_at).toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Europe/Moscow'
        })
      : null;

    return new Response(
      JSON.stringify({ total: count ?? 0, lastMessageTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-today-messages-count] Error:', error);
    return new Response(
      JSON.stringify({ total: 0, lastMessageTime: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});