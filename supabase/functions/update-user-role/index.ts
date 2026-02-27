// Edge function to update user roles with service_role (bypasses RLS)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to verify they are authenticated
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token)
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const currentUserId = claimsData.claims.sub

    // Create admin client with service_role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify current user is admin or workspace_admin
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', currentUserId)
      .single()

    if (profileError || !currentUserProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAdmin = currentUserProfile.role === 'admin' || currentUserProfile.role === 'workspace_admin'
    
    // Check if bootstrap mode (no workspace_admins exist)
    const { data: workspaceAdmins } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('role', 'workspace_admin')
    
    const isBootstrapMode = !workspaceAdmins || workspaceAdmins.length === 0

    if (!isAdmin && !isBootstrapMode) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { targetUserId, newRole } = await req.json()

    if (!targetUserId || !newRole) {
      return new Response(
        JSON.stringify({ error: 'Missing targetUserId or newRole' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    const validRoles = ['workspace_admin', 'admin', 'sdr', 'closer']
    if (!validRoles.includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get target user's current role
    const { data: targetUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', targetUserId)
      .single()

    // Permission checks based on hierarchy
    const currentRole = currentUserProfile.role
    const targetCurrentRole = targetUserProfile?.role

    // Only workspace_admins can modify other workspace_admins or admins (unless bootstrap mode)
    if (!isBootstrapMode && currentRole !== 'workspace_admin') {
      if (targetCurrentRole === 'workspace_admin' || targetCurrentRole === 'admin') {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions to modify this user' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Update the role using service_role (bypasses RLS)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('user_id', targetUserId)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update role', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Role updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
