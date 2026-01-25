import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { 
  corsHeaders, 
  handleCors, 
  successResponse, 
  errorResponse,
  getErrorMessage 
} from '../_shared/types.ts';

// Input validation
const CHAT_ID_REGEX = /^\d+@[cg]\.(us|net)$/; // WhatsApp chat ID format
const MAX_MESSAGE_ID_LENGTH = 200;

const validateChatId = (chatId: unknown): boolean => {
  return typeof chatId === 'string' && CHAT_ID_REGEX.test(chatId);
};

const validateMessageId = (idMessage: unknown): boolean => {
  return typeof idMessage === 'string' && 
         idMessage.length > 0 && 
         idMessage.length <= MAX_MESSAGE_ID_LENGTH;
};

// Verify user has access to the chat via organization
async function verifyUserAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  chatId: string
): Promise<{ hasAccess: boolean; error?: string }> {
  try {
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile?.organization_id) {
      console.error('Profile fetch error:', profileError);
      return { hasAccess: false, error: 'User profile not found' };
    }

    // Extract phone number from chatId (format: 79001234567@c.us)
    const phoneMatch = chatId.match(/^(\d+)@[cg]\.(us|net)$/);
    if (!phoneMatch) {
      return { hasAccess: false, error: 'Invalid chat ID format' };
    }
    const phone = phoneMatch[1];

    // Check if there's a client with this phone in user's organization
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, organization_id')
      .eq('organization_id', profile.organization_id)
      .or(`phone.eq.${phone},phone.eq.+${phone},phone.ilike.%${phone.slice(-10)}%`)
      .limit(1)
      .maybeSingle();

    if (clientError) {
      console.error('Client fetch error:', clientError);
      return { hasAccess: false, error: 'Failed to verify client access' };
    }

    if (!client) {
      console.warn(`No client found for phone ${phone} in org ${profile.organization_id}`);
      return { hasAccess: false, error: 'Client not found in your organization' };
    }

    return { hasAccess: true };
  } catch (error) {
    console.error('Access verification error:', error);
    return { hasAccess: false, error: 'Access verification failed' };
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized: Missing authorization header', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's token for authentication
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error('JWT verification failed:', claimsError);
      return errorResponse('Unauthorized: Invalid token', 401);
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    const body = await req.json();
    const { chatId, idMessage } = body;
    
    // Validate inputs
    if (!validateChatId(chatId)) {
      return errorResponse('Invalid chat ID format', 400);
    }
    
    if (!validateMessageId(idMessage)) {
      return errorResponse('Invalid message ID', 400);
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has access to this chat
    const accessCheck = await verifyUserAccess(supabase, userId, chatId);
    if (!accessCheck.hasAccess) {
      console.warn(`Access denied for user ${userId} to chat ${chatId}: ${accessCheck.error}`);
      return errorResponse(accessCheck.error || 'Access denied', 403);
    }
    
    console.log(`Downloading WhatsApp file for chatId: ${chatId}, messageId: ${idMessage}`);
    
    // Get Green API credentials from environment variables
    const greenApiUrl = Deno.env.get('GREEN_API_URL');
    const greenApiIdInstance = Deno.env.get('GREEN_API_ID_INSTANCE');
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN_INSTANCE');
    
    if (!greenApiUrl || !greenApiIdInstance || !greenApiToken) {
      return errorResponse('Service configuration error', 500);
    }

    // Call Green API downloadFile endpoint
    const downloadResponse = await fetch(`${greenApiUrl}/waInstance${greenApiIdInstance}/downloadFile/${greenApiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        idMessage
      })
    });

    if (!downloadResponse.ok) {
      const errorData = await downloadResponse.text();
      console.error('WhatsApp download file error:', errorData);
      return errorResponse('Failed to download file from WhatsApp', 500);
    }

    const downloadData = await downloadResponse.json();
    console.log('WhatsApp download response:', JSON.stringify(downloadData).slice(0, 200));

    if (!downloadData.downloadUrl) {
      return errorResponse('No download URL returned from WhatsApp API', 500);
    }

    // Return the download URL
    return successResponse({ 
      downloadUrl: downloadData.downloadUrl,
      success: true 
    });

  } catch (error: unknown) {
    console.error('Error downloading WhatsApp file:', error);
    return errorResponse('Server error', 500);
  }
});
