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

    const row = {
      user_id: user.id,
      name: planName,
      content: planText,
      ...metadata
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

  window.supabaseClient = {
    getClient,
    signInWithMagicLink,
    signUpWithEmail,
    signInWithPassword,
    signOut,
    getUser,
    savePlan,
    loadPlans,
  }; 
})();