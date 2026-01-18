// Supabase Edge Function: Send Invitation Email
// Sends an invitation email via Resend and stores token hash in database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface InvitationRequest {
  invitationId: string;
  token: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { invitationId, token } = (await req.json()) as InvitationRequest;

    if (!invitationId || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing invitationId or token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invitation with company info
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from('invitations')
      .select(`
        *,
        company:companies(name, primary_color, logo_url)
      `)
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return new Response(
        JSON.stringify({ error: 'Invitation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the token for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Update invitation with token hash
    await supabaseAdmin
      .from('invitations')
      .update({ token_hash: tokenHash })
      .eq('id', invitationId);

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: true, warning: 'RESEND_API_KEY not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const acceptUrl = `${appUrl}/accept-invitation?token=${token}`;
    const companyName = invitation.company?.name || 'Driverly';

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Driverly <onboarding@resend.dev>',
        to: invitation.email,
        subject: `You're invited to join ${companyName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: ${invitation.company?.primary_color || '#3B82F6'};">
              You're Invited!
            </h1>
            <p>Hello,</p>
            <p>You've been invited to join <strong>${companyName}</strong> as an <strong>${invitation.role}</strong>.</p>
            <p>Click the button below to accept your invitation and create your account:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" 
                 style="background-color: ${invitation.company?.primary_color || '#3B82F6'}; 
                        color: white; 
                        padding: 12px 24px; 
                        text-decoration: none; 
                        border-radius: 6px;
                        display: inline-block;">
                Accept Invitation
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This invitation will expire on ${new Date(invitation.expires_at).toLocaleDateString()}.
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
