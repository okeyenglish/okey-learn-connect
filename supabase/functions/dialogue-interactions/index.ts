import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'get' | 'toggle_favorite' | 'add_comment' | 'delete_comment' | 'get_user_data';
  dialogue_id?: string;
  comment_text?: string;
  comment_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Необходима авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Недействительный токен' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { action, dialogue_id, comment_text, comment_id } = body;

    console.log(`[dialogue-interactions] Action: ${action}, User: ${user.id}, Dialogue: ${dialogue_id}`);

    switch (action) {
      case 'get_user_data': {
        // Get all favorites and comments for the user
        const [favoritesResult, commentsResult] = await Promise.all([
          supabase
            .from('dialogue_favorites')
            .select('dialogue_id')
            .eq('user_id', user.id),
          supabase
            .from('dialogue_comments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        const favoriteIds = (favoritesResult.data || []).map(f => f.dialogue_id);
        const comments = commentsResult.data || [];

        return new Response(
          JSON.stringify({ success: true, favoriteIds, comments }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle_favorite': {
        if (!dialogue_id) {
          return new Response(
            JSON.stringify({ error: 'dialogue_id обязателен' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if already favorited
        const { data: existing } = await supabase
          .from('dialogue_favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('dialogue_id', dialogue_id)
          .maybeSingle();

        if (existing) {
          // Remove from favorites
          await supabase
            .from('dialogue_favorites')
            .delete()
            .eq('id', existing.id);

          return new Response(
            JSON.stringify({ success: true, isFavorite: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Add to favorites
          const { error: insertError } = await supabase
            .from('dialogue_favorites')
            .insert({ user_id: user.id, dialogue_id });

          if (insertError) {
            console.error('[dialogue-interactions] Insert favorite error:', insertError);
            return new Response(
              JSON.stringify({ error: 'Ошибка добавления в избранное' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ success: true, isFavorite: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'add_comment': {
        if (!dialogue_id || !comment_text?.trim()) {
          return new Response(
            JSON.stringify({ error: 'dialogue_id и comment_text обязательны' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: comment, error: commentError } = await supabase
          .from('dialogue_comments')
          .insert({
            user_id: user.id,
            dialogue_id,
            comment_text: comment_text.trim()
          })
          .select()
          .single();

        if (commentError) {
          console.error('[dialogue-interactions] Insert comment error:', commentError);
          return new Response(
            JSON.stringify({ error: 'Ошибка добавления комментария' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, comment }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_comment': {
        if (!comment_id) {
          return new Response(
            JSON.stringify({ error: 'comment_id обязателен' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await supabase
          .from('dialogue_comments')
          .delete()
          .eq('id', comment_id)
          .eq('user_id', user.id); // Ensure user can only delete their own

        if (deleteError) {
          console.error('[dialogue-interactions] Delete comment error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Ошибка удаления комментария' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Неизвестное действие' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[dialogue-interactions] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Внутренняя ошибка', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
