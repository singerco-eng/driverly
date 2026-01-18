// Supabase Edge Function: Submit Driver Application
// Creates/updates driver record, optional vehicle, and sends confirmation email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ApplicationSubmission {
  companyId: string;
  personalInfo: {
    fullName: string;
    phone: string;
    dateOfBirth: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  employmentType: 'w2' | '1099';
  license: {
    number: string;
    state: string;
    expiration: string;
    frontUrl: string;
    backUrl: string;
  };
  vehicle?: {
    type: 'sedan' | 'wheelchair_van' | 'stretcher';
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color?: string;
  };
  experienceNotes?: string;
  referralSource?: string;
  eulaVersion: string;
}

function toVehicleType(value: ApplicationSubmission['vehicle']['type']) {
  if (value === 'stretcher') return 'stretcher_van';
  return value;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as ApplicationSubmission;
    const {
      companyId,
      personalInfo,
      employmentType,
      license,
      vehicle,
      experienceNotes,
      referralSource,
      eulaVersion,
    } = payload;

    if (!companyId || !personalInfo || !employmentType || !license || !eulaVersion) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const age = Math.floor((Date.now() - new Date(personalInfo.dateOfBirth).getTime()) / 31536000000);
    if (Number.isNaN(age) || age < 18) {
      return new Response(JSON.stringify({ error: 'Applicant must be 18 or older' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (new Date(license.expiration) <= new Date()) {
      return new Response(JSON.stringify({ error: 'License must not be expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name, primary_color')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    await supabaseAdmin.from('users').upsert(
      {
        id: user.id,
        email: user.email,
        full_name: personalInfo.fullName,
        phone: personalInfo.phone,
        role: 'driver',
        company_id: companyId,
      },
      { onConflict: 'id' }
    );
    const { data: existingDriver } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .maybeSingle();

    let driverRecord;
    if (existingDriver) {
      if (
        existingDriver.application_status !== 'rejected' ||
        (existingDriver.can_reapply_at && new Date(existingDriver.can_reapply_at) > new Date())
      ) {
        return new Response(JSON.stringify({ error: 'Application already exists' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('drivers')
        .update({
          employment_type: employmentType,
          date_of_birth: personalInfo.dateOfBirth,
          address_line1: personalInfo.address.line1,
          address_line2: personalInfo.address.line2 || null,
          city: personalInfo.address.city,
          state: personalInfo.address.state,
          zip: personalInfo.address.zip,
          license_number: license.number,
          license_state: license.state,
          license_expiration: license.expiration,
          license_front_url: license.frontUrl,
          license_back_url: license.backUrl,
          application_status: 'pending',
          application_date: now,
          application_submitted_at: now,
          experience_notes: experienceNotes || null,
          referral_source: referralSource || null,
          rejection_reason: null,
          rejected_at: null,
          can_reapply_at: null,
          eula_accepted_at: now,
          eula_version: eulaVersion,
        })
        .eq('id', existingDriver.id)
        .select()
        .single();

      if (error) throw error;
      driverRecord = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('drivers')
        .insert({
          user_id: user.id,
          company_id: companyId,
          employment_type: employmentType,
          date_of_birth: personalInfo.dateOfBirth,
          address_line1: personalInfo.address.line1,
          address_line2: personalInfo.address.line2 || null,
          city: personalInfo.address.city,
          state: personalInfo.address.state,
          zip: personalInfo.address.zip,
          license_number: license.number,
          license_state: license.state,
          license_expiration: license.expiration,
          license_front_url: license.frontUrl,
          license_back_url: license.backUrl,
          application_status: 'pending',
          application_date: now,
          application_submitted_at: now,
          experience_notes: experienceNotes || null,
          referral_source: referralSource || null,
          eula_accepted_at: now,
          eula_version: eulaVersion,
        })
        .select()
        .single();

      if (error) throw error;
      driverRecord = data;
    }

    if (employmentType === '1099' && vehicle) {
      const { data: vehicleRecord, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .insert({
          company_id: companyId,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color || 'Unknown',
          license_plate: vehicle.licensePlate,
          license_state: license.state,
          vehicle_type: toVehicleType(vehicle.type),
          ownership: 'driver',
          owner_driver_id: driverRecord.id,
        })
        .select()
        .single();

      if (vehicleError) throw vehicleError;

      await supabaseAdmin.from('driver_vehicle_assignments').insert({
        driver_id: driverRecord.id,
        vehicle_id: vehicleRecord.id,
        company_id: companyId,
        assignment_type: 'owned',
        is_primary: true,
      });
    }

    const updatedMetadata = {
      ...user.app_metadata,
      role: 'driver',
      company_id: companyId,
      driver_id: driverRecord.id,
    };

    await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: updatedMetadata });

    await supabaseAdmin
      .from('application_drafts')
      .delete()
      .eq('user_id', user.id)
      .eq('company_id', companyId);

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    if (resendApiKey && user.email) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Driverly <onboarding@resend.dev>',
          to: user.email,
          subject: `Application received for ${company.name}`,
          html: `
            <p>Hi ${personalInfo.fullName},</p>
            <p>We received your application for <strong>${company.name}</strong>.</p>
            <p>You can check your application status here:</p>
            <p><a href="${appUrl}/driver/application-status">${appUrl}/driver/application-status</a></p>
            <p>Thanks for applying!</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Resend error:', await emailResponse.text());
      }
    }

    return new Response(
      JSON.stringify({ success: true, driverId: driverRecord.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-application:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
