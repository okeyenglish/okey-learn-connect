import { 
  corsHeaders, 
  successResponse, 
  errorResponse, 
  getErrorMessage,
  handleCors 
} from '../_shared/types.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { keyword, keywords, regionIds = [225] } = await req.json();
    
    const directToken = Deno.env.get('YANDEX_DIRECT_TOKEN');
    if (!directToken) {
      return errorResponse('YANDEX_DIRECT_TOKEN not configured', 500);
    }

    // Batch или single запрос
    const keywordsToProcess = keywords || [keyword];
    
    // Формируем запрос к Wordstat через API Директа
    const wordstatResponse = await fetch('https://api.direct.yandex.com/json/v5/keywordsresearch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${directToken}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'ru'
      },
      body: JSON.stringify({
        method: 'get',
        params: {
          Keywords: keywordsToProcess,
          GeoIds: regionIds
        }
      })
    });

    if (!wordstatResponse.ok) {
      const errorText = await wordstatResponse.text();
      console.error('Wordstat API error:', errorText);
      return errorResponse(`Wordstat API error: ${wordstatResponse.status}`, wordstatResponse.status);
    }

    const wordstatData = await wordstatResponse.json();
    
    // Обрабатываем ответ
    const results: Record<string, any> = {};
    
    if (wordstatData.result?.SearchVolume) {
      wordstatData.result.SearchVolume.forEach((item: any, index: number) => {
        const kw = keywordsToProcess[index];
        
        // Определяем конкуренцию на основе данных
        let competition: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
        if (item.Competition) {
          const compValue = parseFloat(item.Competition);
          if (compValue < 0.3) competition = 'LOW';
          else if (compValue > 0.7) competition = 'HIGH';
        }
        
        results[kw] = {
          keyword: kw,
          shows: item.SearchVolume || 0,
          competition: competition,
          relatedKeywords: item.RelatedKeywords?.map((rk: any) => ({
            keyword: rk.Keyword,
            shows: rk.SearchVolume || 0
          })) || []
        };
      });
    }

    // Возвращаем single или batch результат
    const responseData = keywords ? results : results[keyword];
    
    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    console.error('Wordstat function error:', error);
    return errorResponse(getErrorMessage(error), 500);
  }
});
