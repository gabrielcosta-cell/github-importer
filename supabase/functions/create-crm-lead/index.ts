import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateLeadRequest {
  company_name: string;
  faturamento: string;
  contact_phone: string;
  contact_email: string;
  contact_name?: string;
  instagram?: string;
  assigned_to?: string;
  utm_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: CreateLeadRequest = await req.json();
    console.log('Received lead creation request:', JSON.stringify(body, null, 2));

    // Validate required fields
    const requiredFields = ['company_name', 'faturamento', 'contact_phone', 'contact_email'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!body[field as keyof CreateLeadRequest] || 
          (typeof body[field as keyof CreateLeadRequest] === 'string' && 
           (body[field as keyof CreateLeadRequest] as string).trim() === '')) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Campos obrigatórios faltando: ${missingFields.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.contact_email)) {
      console.log('Invalid email format:', body.contact_email);
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find "SDR | Principal" pipeline
    const { data: pipeline, error: pipelineError } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('name', 'SDR | Principal')
      .eq('is_active', true)
      .single();

    if (pipelineError || !pipeline) {
      console.error('Pipeline not found:', pipelineError);
      return new Response(
        JSON.stringify({ success: false, error: 'Pipeline "SDR | Principal" não encontrado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found pipeline:', pipeline.id);

    // Find first stage of the pipeline
    const { data: stage, error: stageError } = await supabase
      .from('crm_stages')
      .select('id')
      .eq('pipeline_id', pipeline.id)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (stageError || !stage) {
      console.error('Stage not found:', stageError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma etapa encontrada no pipeline' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found stage:', stage.id);

    // Get a system user for created_by (first admin or use assigned_to if provided)
    let createdBy = body.assigned_to;
    
    if (!createdBy) {
      const { data: adminUser, error: adminError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (adminError || !adminUser) {
        console.error('No admin user found:', adminError);
        return new Response(
          JSON.stringify({ success: false, error: 'Usuário de sistema não encontrado' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      createdBy = adminUser.user_id;
    }

    console.log('Created by user:', createdBy);

    // Create the card title: apenas nome da empresa
    const cardTitle = body.company_name.trim();

    // Get max position for the stage
    const { data: maxPositionData } = await supabase
      .from('crm_cards')
      .select('position')
      .eq('stage_id', stage.id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = maxPositionData ? maxPositionData.position + 1 : 0;

    // Create the lead
    const { data: newLead, error: insertError } = await supabase
      .from('crm_cards')
      .insert({
        title: cardTitle,
        company_name: body.company_name.trim(),
        faturamento_display: body.faturamento.trim(),
        contact_phone: body.contact_phone.trim(),
        contact_email: body.contact_email.trim().toLowerCase(),
        contact_name: body.contact_name?.trim() || null,
        instagram: body.instagram?.trim() || null,
        assigned_to: body.assigned_to || null,
        pipeline_id: pipeline.id,
        stage_id: stage.id,
        created_by: createdBy,
        position: newPosition,
        // UTM fields
        utm_url: body.utm_url?.trim() || null,
        utm_source: body.utm_source?.trim() || null,
        utm_medium: body.utm_medium?.trim() || null,
        utm_campaign: body.utm_campaign?.trim() || null,
        utm_term: body.utm_term?.trim() || null,
        utm_content: body.utm_content?.trim() || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao criar lead: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead created successfully:', newLead.id);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: newLead.id,
        message: 'Lead criado com sucesso'
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in create-crm-lead:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
