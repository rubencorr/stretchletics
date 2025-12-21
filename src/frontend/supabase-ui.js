// Supabase UI helpers
(function () {
  function showNotificationSimple(msg, type='info') {
    // Use existing showNotification if available
    if (typeof showNotification === 'function') return showNotification(msg, type);
    alert(msg);
  }

  async function ensureSupabaseConfig() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      const setNow = confirm('Supabase keys not set. Do you want to paste them now?');
      if (!setNow) return false;
      const url = prompt('Enter SUPABASE_URL:', 'https://your-project.supabase.co');
      const anon = prompt('Enter SUPABASE_ANON_KEY (public):', 'sb_publishable_...');
      if (url && anon) {
        window.SUPABASE_URL = url.trim();
        window.SUPABASE_ANON_KEY = anon.trim();
        // Reinitialize client
        if (window.__supabaseClient) delete window.__supabaseClient;
        return true;
      }
      return false;
    }
    return true;
  }

  async function signInFlow() {
    const ok = await ensureSupabaseConfig();
    if (!ok) return;
    const email = prompt('Enter your email for sign-in (magic link):');
    if (!email) return;
    try {
      const res = await window.supabaseClient.signInWithMagicLink(email);
      if (res.error) showNotificationSimple('Error: ' + res.error.message, 'error');
      else showNotificationSimple('Magic link sent to ' + email + '. Check your inbox.', 'success');
    } catch (e) {
      showNotificationSimple('Sign-in error: ' + e.message, 'error');
    }
  }

  async function signOutFlow() {
    try {
      await window.supabaseClient.signOut();
      updateAuthUI();
      showNotificationSimple('Signed out', 'success');
    } catch (e) {
      showNotificationSimple('Sign out error: ' + e.message, 'error');
    }
  }

  async function savePlanFlow() {
    const ok = await ensureSupabaseConfig();
    if (!ok) return;

    // Ensure user signed in
    const user = await window.supabaseClient.getUser();
    if (!user) {
      const proceed = confirm('You must sign in to save your plan. Open sign-in dialog now?');
      if (proceed) return signInFlow();
      return;
    }

    const planNameEl = document.getElementById('plan-name');
    const planName = planNameEl ? planNameEl.value.trim() || 'training-plan' : 'training-plan';
    let planText = trainingPlanData || document.getElementById('text-view').innerText || '';
    // Ensure we store content as a string (JSON for structured plans)
    if (planText && typeof planText === 'object') {
      try { planText = JSON.stringify(planText); } catch (e) { planText = String(planText); }
    }

    // Prepare metadata (basic)
    const metadata = {
      sport: (typeof selectedSport !== 'undefined') ? selectedSport : null,
      plan_start: (typeof planStartDate !== 'undefined' && planStartDate) ? new Date(planStartDate).toISOString() : null,
      saved_at: new Date().toISOString(),
    };

    const saveBtn = document.getElementById('save-plan-btn');
    const originalText = saveBtn ? saveBtn.innerHTML : null;
    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving...';
      }
      const res = await window.supabaseClient.savePlan(planName, planText, metadata);
      if (res.error) {
        const msg = res.error && (res.error.message || res.error.error_description || JSON.stringify(res.error));
        const lower = String(msg || '').toLowerCase();
        // Detect common DB/migration or permission issues and provide quick guidance
        if ((lower.includes('relation') && lower.includes('does not exist')) || lower.includes('no such table') || lower.includes('permission denied')) {
          const help = 'It looks like the `plans` table or RLS policies may not be set up. Run the DB migration `db/migrations/0001_create_plans_and_workouts.sql` in your Supabase project SQL editor. If you want me to run it, provide the Service Role key and ask me to run the migration.';
          showNotificationSimple('Error saving plan: ' + msg + '\n' + help, 'error');
          if (confirm('It looks like the database migration may be missing. Open short instructions to run it now?')) {
            alert('Quick steps:\n1) Open your Supabase project → SQL Editor.\n2) Paste the SQL from `db/migrations/0001_create_plans_and_workouts.sql` and run it.\n3) Confirm the `plans` table exists and RLS policies are applied.\n\nIf you prefer, I can run the migration for you (I will need the Service Role key).');
          }
        } else {
          showNotificationSimple('Error saving plan: ' + msg, 'error');
        }
      } else {
        showNotificationSimple('Plan saved ✅', 'success');
      }
    } catch (e) {
      showNotificationSimple('Save error: ' + e.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        if (originalText) saveBtn.innerHTML = originalText;
      }
    }
  }

  async function loadPlansFlow() {
    const ok = await ensureSupabaseConfig();
    if (!ok) return;
    try {
      const res = await window.supabaseClient.loadPlans();
      if (res.error) { showNotificationSimple('Error loading plans: ' + res.error.message, 'error'); return; }
      const plans = res.data || [];
      if (plans.length === 0) { showNotificationSimple('No plans found', 'info'); return; }
      const choices = plans.map((p, i) => `${i+1}. ${p.name} (${new Date(p.created_at).toLocaleString()})`).join('\n');
      const sel = prompt('Select a plan number to load:\n\n' + choices);
      const idx = parseInt(sel, 10) - 1;
      if (!isNaN(idx) && plans[idx]) {
        trainingPlanData = plans[idx].content;
        displayPlan(trainingPlanData);
        showNotificationSimple('Plan loaded', 'success');
      }
    } catch (e) {
      showNotificationSimple('Load error: ' + e.message, 'error');
    }
  }

  async function updateAuthUI() {
    try {
      const userObj = await window.supabaseClient.getUser();
      const signInBtn = document.getElementById('sign-in-btn');
      const signOutBtn = document.getElementById('sign-out-btn');
      const userInfo = document.getElementById('auth-user');
      if (userObj) {
        if (signInBtn) signInBtn.style.display = 'none';
        if (signOutBtn) signOutBtn.style.display = 'inline-block';
        if (userInfo) userInfo.textContent = userObj.email || userObj.id;
      } else {
        if (signInBtn) signInBtn.style.display = 'inline-block';
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (userInfo) userInfo.textContent = 'Not signed in';
      }
    } catch (e) {
      console.warn('Auth UI update error', e);
    }
  }

  window.supabaseUI = {
    signInFlow,
    signOutFlow,
    savePlanFlow,
    loadPlansFlow,
    updateAuthUI,
    // Expose ensureSupabaseConfig so pages can prompt for keys before calling client methods
    ensureSupabaseConfig
  };

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (typeof window.supabaseUI !== 'undefined') window.supabaseUI.updateAuthUI(); }, 300);
    // wire buttons if already present
    setTimeout(() => { if (typeof window.supabaseUI !== 'undefined') window.supabaseUI.initSupabaseUI && window.supabaseUI.initSupabaseUI(); }, 500);
  });
})();