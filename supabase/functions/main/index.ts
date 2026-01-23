const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Main router for edge-runtime
// This handles incoming requests and routes them to the appropriate function
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Extract function name from path
  // /functions/v1/function-name -> function-name
  // /function-name -> function-name
  let functionName = pathParts[pathParts.length - 1];
  
  // Handle root/main endpoint
  if (!functionName || functionName === 'main' || functionName === 'v1' || functionName === 'functions') {
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'Edge Functions ready',
        timestamp: new Date().toISOString()
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[main] Routing request to: ${functionName}`);
  console.log(`[main] Method: ${req.method}, Path: ${url.pathname}`);

  try {
    // Dynamically import the function module
    // The module should have a default export that is a handler function
    const modulePath = `../${functionName}/index.ts`;
    const module = await import(modulePath);
    
    // Check if the module exports a handler we can call
    if (module.default && typeof module.default === 'function') {
      // Module exports a default handler function
      return await module.default(req);
    }
    
    // If no default export, the function might use Deno.serve directly
    // In that case, we need to handle it differently
    // For now, return an error suggesting the function format
    console.error(`[main] Function ${functionName} - no callable default export found`);
    console.error(`[main] Module keys: ${Object.keys(module).join(', ')}`);
    
    return new Response(
      JSON.stringify({ 
        error: `Function ${functionName} is not compatible with main router`,
        hint: 'Function should export default handler'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[main] Error routing to ${functionName}:`, errorMessage);
    
    // Check if it's a module not found error
    if (errorMessage.includes('Cannot find') || 
        errorMessage.includes('Module not found') ||
        errorMessage.includes('does not exist')) {
      return new Response(
        JSON.stringify({ error: `Function not found: ${functionName}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: `Error loading function: ${functionName}`,
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
