export function renderLogin(parent: HTMLElement, system: any) {
  const container = document.createElement('div');
  container.className = 'auth-split-layout fade-in';
  container.innerHTML = `
    <div class="auth-banner">
      <div style="max-width: 400px; text-align: center; margin: 0 auto;">
        <img src="https://i.imgur.com/blEiGra.jpeg" alt="SmartScholar Logo" class="auth-banner-logo" referrerPolicy="no-referrer" />
        <h1 class="auth-banner-title">Barangay SmartScholar</h1>
        <p class="auth-banner-subtitle">Official Financial Assistance & Scholarship Portal</p>
      </div>
    </div>
    <div class="auth-form-side">
      <div class="auth-form-container" style="text-align: center;">
        <h2 style="font-size: 2.5rem; margin-bottom: 1rem; color: var(--color-primary-dark); font-family: var(--font-heading);">Welcome Back</h2>
        <p style="color: var(--color-secondary); margin-bottom: 3rem; font-size: 1.125rem;">Sign in to access your dashboard and track your applications.</p>
        
        <button id="google-login-btn" class="btn btn-primary" onclick="window.system.loginWithGoogle()" style="width: 100%; height: 56px; font-size: 1.125rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 1rem; border-radius: 12px; box-shadow: var(--shadow-md);">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="24" height="24" style="background: white; border-radius: 4px; padding: 2px;" referrerPolicy="no-referrer">
          Continue with Google
        </button>

        <p style="margin-top: 2rem; color: var(--color-secondary); font-size: 0.875rem;">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>

        <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--color-border);">
           <button class="btn btn-outline" onclick="window.system.setView('landing')" style="border: none;">Back to Home</button>
        </div>
      </div>
    </div>
  `;
  parent.appendChild(container);
}

export function renderRegister(parent: HTMLElement, system: any) {
  renderLogin(parent, system); // Both use the same Google Auth flow
}
