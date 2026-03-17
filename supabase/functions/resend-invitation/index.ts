// Supabase Edge Function: Resend Invitation Email
// Generates a new token and sends a fresh invitation email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { buildBrandedEmail } from '../_shared/email-template.ts';

interface ResendRequest {
  invitationId: string;
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

    const { invitationId } = (await req.json()) as ResendRequest;

    if (!invitationId) {
      return new Response(
        JSON.stringify({ error: 'Missing invitationId' }),
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

    if (invitation.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Cannot resend non-pending invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new token
    const newToken = crypto.randomUUID();

    // Hash the new token
    const encoder = new TextEncoder();
    const data = encoder.encode(newToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Calculate new expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update invitation
    await supabaseAdmin
      .from('invitations')
      .update({
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        resend_count: (invitation.resend_count || 0) + 1,
        last_resent_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: true, warning: 'RESEND_API_KEY not configured', token: newToken }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const acceptUrl = `${appUrl}/accept-invitation?token=${newToken}`;
    const companyName = invitation.company?.name || 'Driverly';
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Flowcred AI <noreply@mail.flowcred.ai>',
        to: invitation.email,
        subject: `Reminder: You're invited to join ${companyName}`,
        html: buildBrandedEmail({
          preheader: `Reminder: You're invited to join ${companyName}`,
          heading: 'Invitation Reminder',
          body: `
            <p>Hello,</p>
            <p>This is a reminder that you've been invited to join <strong>${companyName}</strong> as an <strong>${invitation.role}</strong>.</p>
            <p>Click the button below to accept your invitation and create your account:</p>
          `,
          ctaText: 'Accept Invitation',
          ctaUrl: acceptUrl,
          footerExtra: `This invitation will expire on ${expiresAt.toLocaleDateString()}.`,
        }),
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
    console.error('Error in resend-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
