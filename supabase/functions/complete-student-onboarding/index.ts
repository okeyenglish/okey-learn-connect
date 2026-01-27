import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudentOnboardingRequest {
  token: string;
  first_name?: string;
  last_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: StudentOnboardingRequest = await req.json();
    const { token, first_name, last_name } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('student_invitations')
      .select('*, students(*), organizations(*)')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      console.error('Student invitation not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('student_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phone = invitation.phone;
    const studentName = first_name || invitation.first_name || invitation.students?.first_name;
    
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.phone === phone);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user with phone
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone: phone,
        phone_confirm: true,
        user_metadata: {
          first_name: studentName,
          last_name: last_name || invitation.students?.last_name,
          role: 'student'
        }
      });

      if (createError) {
        console.error('Error creating student user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;

      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        first_name: studentName,
        last_name: last_name || invitation.students?.last_name,
        phone,
        organization_id: invitation.organization_id
      });

      // Add student role
      await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'student'
      });
    }

    // Update student with user_id
    await supabase
      .from('students')
      .update({
        user_id: userId,
        portal_enabled: true,
        first_name: studentName || undefined,
        last_name: last_name || undefined
      })
      .eq('id', invitation.student_id);

    // Mark invitation as completed
    await supabase
      .from('student_invitations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Generate magic link for login
    const { data: magicLink } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `student_${phone.replace(/\D/g, '')}@portal.local`,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://newacademcrm.lovable.app'}/student-portal`
      }
    });

    console.log('Student onboarding completed:', {
      userId,
      studentId: invitation.student_id
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        student_id: invitation.student_id,
        organization: invitation.organizations,
        login_link: magicLink?.properties?.action_link
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in complete-student-onboarding:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
