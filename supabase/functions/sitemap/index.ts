import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем все опубликованные страницы
    const { data: pages, error } = await supabase
      .from('seo_pages')
      .select('slug, updated_at, type, priority')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching pages:', error);
      throw error;
    }

    const baseUrl = 'https://okeyenglish.ru';
    const now = new Date().toISOString();

    // Генерируем XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Главная страница
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/</loc>\n`;
    xml += `    <lastmod>${now.split('T')[0]}</lastmod>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>1.0</priority>\n';
    xml += '  </url>\n';

    // Основные статические страницы
    const staticPages = [
      { path: '/about', priority: '0.8', changefreq: 'monthly' },
      { path: '/contacts', priority: '0.8', changefreq: 'monthly' },
      { path: '/courses', priority: '0.9', changefreq: 'weekly' },
      { path: '/test', priority: '0.7', changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${now.split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Динамические страницы из SEO
    if (pages && pages.length > 0) {
      pages.forEach(page => {
        const lastmod = new Date(page.updated_at).toISOString().split('T')[0];
        
        // Определяем приоритет и частоту обновления по типу
        let priority = page.priority || 0.7;
        let changefreq = 'monthly';
        
        if (page.type === 'landing') {
          priority = 0.9;
          changefreq = 'weekly';
        } else if (page.type === 'local') {
          priority = 0.8;
          changefreq = 'weekly';
        } else if (page.type === 'article') {
          priority = 0.7;
          changefreq = 'monthly';
        }

        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/${page.slug}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>${changefreq}</changefreq>\n`;
        xml += `    <priority>${priority}</priority>\n`;
        xml += '  </url>\n';
      });
    }

    xml += '</urlset>';

    console.log(`[sitemap] Generated sitemap with ${(pages?.length || 0) + staticPages.length + 1} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Кэш на 1 час
      },
    });

  } catch (error) {
    console.error('[sitemap] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
