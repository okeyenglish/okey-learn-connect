import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OnlinePBXWebhookEvent {
  event: string;
  data: {
    call_id?: string;
    from?: string;
    to?: string;
    direction?: string;
    status?: string;
    duration?: number;
    started_at?: string;
    ended_at?: string;
    recording_url?: string;
    [key: string]: any;
  };
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('OnlinePBX webhook received:', req.method, req.url);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const body = await req.json() as OnlinePBXWebhookEvent;
      console.log('Webhook payload:', JSON.stringify(body, null, 2));

      // Сохраняем все события от OnlinePBX для логирования
      const { error: logError } = await supabase
        .from('webhook_logs')
        .insert({
          source: 'onlinepbx',
          event_type: body.event,
          payload: body,
          received_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Error logging webhook:', logError);
      }

      // Обрабатываем события звонков
      if (body.event === 'call.started' || body.event === 'call.ended' || body.event === 'call.answered') {
        await handleCallEvent(supabase, body);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook processed successfully',
          event: body.event 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // GET запрос для получения информации о webhook
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/onlinepbx-webhook`,
          status: 'active',
          supported_events: [
            'call.started',
            'call.answered', 
            'call.ended',
            'call.missed',
            'call.busy',
            'call.failed'
          ],
          description: 'OnlinePBX webhook для фиксации всех событий звонков'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function handleCallEvent(supabase: any, event: OnlinePBXWebhookEvent) {
  const { data, event: eventType } = event;
  
  try {
    // Находим клиента по номеру телефона
    let clientId = null;
    
    if (data.from || data.to) {
      const phoneNumber = data.direction === 'incoming' ? data.from : data.to;
      
      if (phoneNumber) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('phone', phoneNumber)
          .single();
          
        if (client) {
          clientId = client.id;
        }
      }
    }

    // Определяем статус звонка
    let status = 'initiated';
    if (eventType === 'call.answered') status = 'answered';
    else if (eventType === 'call.ended') status = data.duration > 0 ? 'answered' : 'missed';
    else if (eventType === 'call.missed') status = 'missed';
    else if (eventType === 'call.busy') status = 'busy';
    else if (eventType === 'call.failed') status = 'failed';

    // Проверяем, существует ли уже запись звонка
    let callLog = null;
    if (data.call_id) {
      const { data: existingCall } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', data.call_id)
        .single();
        
      callLog = existingCall;
    }

    if (callLog) {
      // Обновляем существующую запись
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      
      if (data.ended_at) updateData.ended_at = data.ended_at;
      if (data.duration !== undefined) updateData.duration_seconds = data.duration;
      
      const { error: updateError } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('id', data.call_id);
        
      if (updateError) {
        console.error('Error updating call log:', updateError);
      }
    } else {
      // Создаем новую запись звонка
      const insertData: any = {
        id: data.call_id || `call_${Date.now()}`,
        client_id: clientId,
        phone_number: data.direction === 'incoming' ? data.from : data.to,
        direction: data.direction || 'outgoing',
        status,
        started_at: data.started_at || new Date().toISOString(),
        ended_at: data.ended_at || null,
        duration_seconds: data.duration || null
      };

      const { error: insertError } = await supabase
        .from('call_logs')
        .insert(insertData);
        
      if (insertError) {
        console.error('Error inserting call log:', insertError);
      }
    }

    console.log(`Call event processed: ${eventType} for call ${data.call_id}`);
    
  } catch (error) {
    console.error('Error handling call event:', error);
  }
}