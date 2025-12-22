// Supabase client wrapper for browser (vanilla UMD usage)
(function () {
  // Default Supabase configuration (user-provided values)
  const DEFAULT_SUPABASE_URL = 'https://gjsepjkuinolptpnbwzj.supabase.co';
  const DEFAULT_SUPABASE_ANON = 'sb_publishable_e-cERBdIVwQMu5TvFJyNEw_EiCpPaK7';
  if (!window.SUPABASE_URL) window.SUPABASE_URL = DEFAULT_SUPABASE_URL;
  if (!window.SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = DEFAULT_SUPABASE_ANON;

  function getClient() {
    const url = window.SUPABASE_URL || '';
    const anon = window.SUPABASE_ANON_KEY || '';
    if (!url || !anon) {
      console.warn('Supabase URL or ANON KEY not set. Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY before loading.');
      return null;
    }
    if (window.__supabaseClient) return window.__supabaseClient;
    window.__supabaseClient = supabase.createClient(url, anon);
    return window.__supabaseClient;
  }

  async function signInWithMagicLink(email) {
    const client = getClient();
    if (!client) throw new Error('Supabase client not initialized');
    return await client.auth.signInWithOtp({ email });
  }

  async function signUpWithEmail(email, password, options = {}) {
    const client = getClient();
    if (!client) throw new Error('Supabase client not initialized');
    return await client.auth.signUp({ email, password }, options);
  }

  async function signInWithPassword(email, password) {
    const client = getClient();
    if (!client) throw new Error('Supabase client not initialized');
    return await client.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    const client = getClient();
    if (!client) return;
    return client.auth.signOut();
  }

  async function getUser() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data.user || null;
  }

  // Save plan with optional metadata
  async function savePlan(planName, planText, metadata = {}) {
    const client = getClient();
    if (!client) throw new Error('Supabase client not initialized');
    const userResp = await client.auth.getUser();
    const user = userResp.data.user;
    if (!user) throw new Error('Not authenticated');

    // Ensure the `content` column (jsonb) receives valid JSON.
    let contentJson;
    if (typeof planText === 'string') {
      try {
        contentJson = JSON.parse(planText);
      } catch (e) {
        // If planText is plain text, wrap it so it can be stored in jsonb
        contentJson = { text: planText };
      }
    } else {
      contentJson = planText;
    }

    // Put arbitrary metadata inside the `metadata` jsonb column to avoid accidentally
    // creating unknown top-level columns in the `plans` table.
    const row = {
      user_id: user.id,
      name: planName,
      content: contentJson,
      metadata: metadata || {}
    };

    const { data, error } = await client
      .from('plans')
      .insert([row])
      .select();
    return { data, error };
  }

  async function loadPlans() {
    const client = getClient();
    if (!client) throw new Error('Supabase client not initialized');
    const userResp = await client.auth.getUser();
    const user = userResp.data.user;
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await client
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  async function deletePlan(planId) {
    const client = getClient();
    if (!client) throw new Error('Supabase client not initialized');
    const userResp = await client.auth.getUser();
    const user = userResp.data.user;
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await client
      .from('plans')
      .delete()
      .match({ id: planId, user_id: user.id });
    return { data, error };
  }

  window.supabaseClient = {
    getClient,
    signInWithMagicLink,
    signUpWithEmail,
    signInWithPassword,
    signOut,
    getUser,
    savePlan,
    loadPlans,
    deletePlan,
    // Update user profile metadata (e.g., avatar_url)
    async updateProfile(metadata = {}) {
      const client = getClient();
      if (!client) throw new Error('Supabase client not initialized');
      try {
        // Preferred API: auth.updateUser({ data: { ... } })
        if (client.auth && typeof client.auth.updateUser === 'function') {
          return await client.auth.updateUser({ data: metadata });
        }
        // Fallback for older/newer variants
        if (client.auth && typeof client.auth.update === 'function') {
          return await client.auth.update({ data: metadata });
        }
        throw new Error('Update user API not available on supabase client');
      } catch (e) {
        console.error('updateProfile failed', e);
        throw e;
      }
    }
    ,
    // Update the user's public display name (stored in user metadata)
    async updateDisplayName(name) {
      if (!name) throw new Error('Name required');
      return await this.updateProfile({ full_name: name, name });
    },
    // Update the user's email address via the auth API. Note: Supabase may
    // trigger a confirmation email when changing the address.
    async updateEmail(email) {
      if (!email) throw new Error('Email required');
      const client = getClient();
      if (!client) throw new Error('Supabase client not initialized');
      try {
        if (client.auth && typeof client.auth.updateUser === 'function') {
          return await client.auth.updateUser({ email });
        }
        if (client.auth && typeof client.auth.update === 'function') {
          return await client.auth.update({ email });
        }
        throw new Error('Update email API not available on supabase client');
      } catch (e) {
        console.error('updateEmail failed', e);
        throw e;
      }
    }
  }; 
})();