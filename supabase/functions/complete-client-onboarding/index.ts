import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingRequest {
  token: string;
  first_name: string;
  last_name?: string;
  email?: string;
  children?: {
    first_name: string;
    last_name?: string;
    phone?: string;
    date_of_birth?: string;
    enable_portal?: boolean;
  }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: OnboardingRequest = await req.json();
    const { token, first_name, last_name, email, children } = body;

    if (!token || !first_name) {
      return new Response(
        JSON.stringify({ error: 'Token and first_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('client_invitations')
      .select('*, clients(*), organizations(*)')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invitation) {
      console.error('Invitation not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('client_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ error: 'Invitation has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const phone = invitation.phone;
    
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
          first_name,
          last_name,
          role: 'parent'
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;

      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        first_name,
        last_name,
        phone,
        email,
        organization_id: invitation.organization_id
      });

      // Add parent role
      await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'parent'
      });
    }

    // Update client with user_id
    await supabase
      .from('clients')
      .update({
        user_id: userId,
        portal_enabled: true,
        first_name,
        last_name,
        email: email || invitation.clients?.email
      })
      .eq('id', invitation.client_id);

    // Process children if provided
    const studentInvitations: { student_id: string; token: string; phone: string }[] = [];

    if (children && children.length > 0) {
      for (const child of children) {
        // Check if student already exists for this client
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('parent_id', invitation.client_id)
          .eq('first_name', child.first_name)
          .maybeSingle();

        let studentId: string;

        if (existingStudent) {
          studentId = existingStudent.id;
          // Update student
          await supabase
            .from('students')
            .update({
              last_name: child.last_name,
              date_of_birth: child.date_of_birth,
              phone: child.phone
            })
            .eq('id', studentId);
        } else {
          // Create new student
          const { data: newStudent, error: studentError } = await supabase
            .from('students')
            .insert({
              organization_id: invitation.organization_id,
              parent_id: invitation.client_id,
              first_name: child.first_name,
              last_name: child.last_name,
              date_of_birth: child.date_of_birth,
              phone: child.phone,
              status: 'active',
              is_active: true
            })
            .select()
            .single();

          if (studentError) {
            console.error('Error creating student:', studentError);
            continue;
          }

          studentId = newStudent.id;
        }

        // If child has phone and wants portal access, create invitation
        if (child.phone && child.enable_portal) {
          const childToken = crypto.randomUUID();
          
          await supabase.from('student_invitations').insert({
            organization_id: invitation.organization_id,
            student_id: studentId,
            parent_client_id: invitation.client_id,
            invite_token: childToken,
            phone: child.phone,
            first_name: child.first_name,
            status: 'pending',
            created_by: userId
          });

          studentInvitations.push({
            student_id: studentId,
            token: childToken,
            phone: child.phone
          });
        }
      }
    }

    // Mark invitation as completed
    await supabase
      .from('client_invitations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Generate magic link for login
    const { data: magicLink, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email || `${phone.replace(/\D/g, '')}@portal.local`,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://newacademcrm.lovable.app'}/parent-portal`
      }
    });

    console.log('Client onboarding completed:', {
      userId,
      clientId: invitation.client_id,
      childrenCount: children?.length || 0,
      studentInvitations: studentInvitations.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        client_id: invitation.client_id,
        organization: invitation.organizations,
        student_invitations: studentInvitations,
        login_link: magicLink?.properties?.action_link
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in complete-client-onboarding:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
