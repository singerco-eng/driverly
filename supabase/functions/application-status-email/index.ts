// Supabase Edge Function: Application Status Email
// Sends approval/rejection email via Resend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface StatusEmailRequest {
  driverId: string;
  status: 'approved' | 'rejected';
  reason?: string;
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

    const { driverId, status, reason } = (await req.json()) as StatusEmailRequest;

    if (!driverId || !status) {
      return new Response(JSON.stringify({ error: 'Missing driverId or status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: driver, error } = await supabaseAdmin
      .from('drivers')
      .select('id, user_id, application_status, rejection_reason, company_id, users:users!user_id(email, full_name)')
      .eq('id', driverId)
      .single();

    if (error || !driver) {
      return new Response(JSON.stringify({ error: 'Driver not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name, primary_color')
      .eq('id', driver.company_id)
      .single();

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: true, warning: 'RESEND_API_KEY not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = driver.users?.email;
    const name = driver.users?.full_name || 'Driver';

    if (!email) {
      return new Response(JSON.stringify({ error: 'Driver email missing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let subject = '';
    let html = '';

    if (status === 'approved') {
      subject = `You're approved to drive for ${company?.name ?? 'Driverly'}`;
      html = `
        <p>Hi ${name},</p>
        <p>Great news — your application has been approved.</p>
        <p>You can continue to your driver portal here:</p>
        <p><a href="${appUrl}/driver/application-status">${appUrl}/driver/application-status</a></p>
        <p>Welcome aboard!</p>
      `;
    } else {
      subject = `Update on your driver application`;
      const rejectionReason = reason || driver.rejection_reason || 'Application not approved';
      html = `
        <p>Hi ${name},</p>
        <p>Thank you for applying to drive with ${company?.name ?? 'Driverly'}.</p>
        <p>We are unable to approve your application at this time.</p>
        <p>Reason: ${rejectionReason}</p>
        <p>You can check your status here:</p>
        <p><a href="${appUrl}/driver/application-status">${appUrl}/driver/application-status</a></p>
      `;
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Driverly <onboarding@resend.dev>',
        to: email,
        subject,
        html,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Resend error:', emailError);
      return new Response(JSON.stringify({ success: true, warning: 'Email failed to send' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in application-status-email:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
