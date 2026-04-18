import { Icons } from '../icons';

export function renderLanding(parent: HTMLElement) {
    const container = document.createElement('div');
    container.className = 'fade-in';
    container.style.minHeight = '100vh';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.width = '100%';
    container.style.flex = '1';
    
    container.innerHTML = `
      <header class="landing-header" style="border-bottom: 1px solid var(--color-border); margin-bottom: clamp(2rem, 5vh, 4rem); width: 100%; box-sizing: border-box;">
        <div style="max-width: 1100px; margin: 0 auto; width: 100%; padding: 1.5rem 2rem; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="https://i.imgur.com/blEiGra.jpeg" alt="SmartScholar Logo" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover; box-shadow: var(--shadow-sm);" referrerPolicy="no-referrer" />
            <span style="font-weight: 600; font-size: 1.5rem; color: var(--color-primary-dark); font-family: var(--font-heading); display: inline-block;">SmartScholar</span>
          </div>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="btn btn-outline" style="border: none; font-weight: 500;" onclick="window.system.loginWithGoogle()">Sign In</button>
            <button class="btn btn-primary" style="padding: 0.5rem 1.75rem;" onclick="window.system.loginWithGoogle()">Register</button>
          </div>
        </div>
      </header>
      <main class="landing-main" style="max-width: 1100px; margin: 0 auto; width: 100%; text-align: center; padding: 2rem 2rem; box-sizing: border-box; flex: 1;">
        <span style="display: inline-block; padding: 0.5rem 1.5rem; border: 1px solid var(--color-primary); border-radius: 9999px; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-primary); margin-bottom: 2rem; font-weight: 600;">Official Barangay Portal</span>
        <h1 style="font-size: clamp(2.5rem, 8vw, 5rem); line-height: 1.1; margin-bottom: 1.5rem; font-weight: 400; color: var(--color-primary-dark);">Empowering Our Community<br/><span style="color: var(--color-success); font-style: italic;">Through Education</span></h1>
        <p style="font-size: clamp(1rem, 3vw, 1.25rem); color: var(--color-secondary); max-width: 600px; margin: 0 auto 3rem; line-height: 1.6;">Access financial aid, track your applications, and discover opportunities tailored to your profile—all in one secure platform.</p>
        <div style="display: flex; justify-content: center; margin-bottom: clamp(3rem, 10vh, 5rem);">
          <button class="btn btn-primary" style="padding: 1rem 2.5rem; font-size: 1.125rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem;" onclick="window.system.loginWithGoogle()">Start Your Application ${Icons.arrowRight(20)}</button>
        </div>
        
        <div class="landing-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 3rem; text-align: left; border-top: 1px solid var(--color-border); padding-top: 3rem; margin-bottom: 3rem;">
          <div>
            <div style="font-family: var(--font-heading); font-size: clamp(2.5rem, 6vw, 3.5rem); font-weight: 400; color: var(--color-primary); margin-bottom: 0.5rem; line-height: 1;">₱1M+</div>
            <div style="color: var(--color-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Funds Awarded</div>
          </div>
          <div>
            <div style="font-family: var(--font-heading); font-size: clamp(2.5rem, 6vw, 3.5rem); font-weight: 400; color: var(--color-primary); margin-bottom: 0.5rem; line-height: 1;">50+</div>
            <div style="color: var(--color-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Active Scholarships</div>
          </div>
          <div>
            <div style="font-family: var(--font-heading); font-size: clamp(2.5rem, 6vw, 3.5rem); font-weight: 400; color: var(--color-primary); margin-bottom: 0.5rem; line-height: 1;">100%</div>
            <div style="color: var(--color-secondary); font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Online Process</div>
          </div>
        </div>
      </main>
    `;
    parent.appendChild(container);
  }
