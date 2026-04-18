import { Icons } from '../icons';

export function renderApplicantDashboard(parent: HTMLElement, system: any) {
  const userApps = system.applications.filter((a: any) => a.userId === system.currentUser?.id);
  const upcomingInterviews = userApps.filter((a: any) => a.interviewDate && a.interviewDate > Date.now());
  
  const stats = document.createElement('div');
  stats.className = 'stats-grid fade-in';
  stats.style.marginBottom = '2rem';
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-value">${userApps.length}</div><div class="stat-label">${system.t('Applications')}</div></div>
    <div class="stat-card"><div class="stat-value text-success">${userApps.filter((a: any) => a.status === 'Approved').length}</div><div class="stat-label">${system.t('Approved')}</div></div>
    <div class="stat-card"><div class="stat-value text-warning">${userApps.filter((a: any) => a.status === 'Pending' || a.status === 'Reviewing' || a.status === 'Needs Revision').length}</div><div class="stat-label">${system.t('In Progress')}</div></div>
  `;
  parent.appendChild(stats);

  if (upcomingInterviews.length > 0) {
    const interviewsDiv = document.createElement('div');
    interviewsDiv.className = 'card fade-in bg-primary-light';
    interviewsDiv.style.marginBottom = '2rem';
    interviewsDiv.style.borderLeft = '4px solid var(--color-primary)';
    interviewsDiv.innerHTML = `
      <h3 style="font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">${Icons.calendar(20)} ${system.t('Upcoming Interviews')}</h3>
      ${upcomingInterviews.map((app: any) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--color-bg); border-radius: 0.5rem; margin-bottom: 0.5rem;">
          <div>
            <div style="font-weight: 600;">${system.scholarships.find((s: any) => s.id === app.scholarshipId)?.title}</div>
            <div style="font-size: 0.875rem; color: var(--color-secondary);">${new Date(app.interviewDate!).toLocaleString()}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.system.viewDetails('${app.id}')">${system.t('View Details')}</button>
        </div>
      `).join('')}
    `;
    parent.appendChild(interviewsDiv);
  }

  const list = document.createElement('div');
  list.className = 'fade-in';
  list.innerHTML = `
    <h3 style="font-weight: 700; margin-bottom: 1.5rem;">${system.t('Recent Activity')}</h3>
    ${userApps.length === 0 ? `
      <div class="empty-state card">
        <div style="margin-bottom: 1rem; color: var(--color-secondary);">${Icons.inbox(48)}</div>
        <p>No applications found.</p>
      </div>
    ` : userApps.sort((a: any,b: any) => b.timestamp - a.timestamp).map((app: any) => `
      <div class="card" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.system.viewDetails('${app.id}')">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="background: var(--color-bg); padding: 0.75rem; border-radius: 0.75rem; color: var(--color-primary);">${Icons.scholarship(24)}</div>
          <div>
            <div style="font-weight: 700;">${system.scholarships.find((s: any) => s.id === app.scholarshipId)?.title || 'General Grant'}</div>
            <div style="font-size: 0.75rem; color: var(--color-secondary);">${new Date(app.timestamp).toLocaleDateString()}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="verification-badge ${app.verificationStatus === 'Passed' ? 'verification-passed' : 'verification-failed'}">
            ${Icons.shield(10)} ${app.verificationStatus}
          </div>
          <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span>
        </div>
      </div>
    `).join('')}
  `;
  parent.appendChild(list);
}

export function renderSavedScholarships(parent: HTMLElement, system: any) {
  const savedIds = system.currentUser?.savedScholarships || [];
  const saved = system.scholarships.filter((s: any) => savedIds.includes(s.id));

  if (saved.length === 0) {
    parent.innerHTML += `
      <div class="empty-state card fade-in">
        <div style="margin-bottom: 1rem; color: var(--color-secondary);">${Icons.bookmark(48)}</div>
        <h3 style="font-weight: 700; margin-bottom: 0.5rem;">No saved scholarships</h3>
        <p style="color: var(--color-secondary); margin-bottom: 1.5rem;">Save scholarships you're interested in to track them here.</p>
        <button class="btn btn-primary" onclick="window.system.setView('scholarships')">Browse Catalog</button>
      </div>
    `;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'scholarship-grid fade-in';
  grid.innerHTML = saved.map((s: any) => {
    const hasApplied = system.applications.some((a: any) => a.userId === system.currentUser?.id && a.scholarshipId === s.id);
    return `
    <div class="card scholarship-card">
      <div class="content">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
          <span class="badge badge-primary">${s.category}</span>
          <button class="btn btn-outline text-danger bg-danger-light" onclick="window.system.toggleSaveScholarship('${s.id}')" style="padding: 0; width: 32px; height: 32px; border-radius: 50%; border: none;" title="Remove from saved">
            ${Icons.trash(16)}
          </button>
        </div>
        <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">${s.title}</h3>
        <p style="color: var(--color-secondary); font-size: 0.875rem; margin-bottom: 1rem; line-height: 1.5;">${s.description}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
          ${s.tags.map((t: any) => `<span style="font-size: 0.625rem; background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 4px; color: var(--color-secondary); font-weight: 600;">#${t}</span>`).join('')}
        </div>
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Requirements:</h4>
          <ul style="padding-left: 1.25rem; font-size: 0.8125rem; color: var(--color-secondary); list-style-type: disc;">
            ${s.requirements.map((req: any) => `<li style="margin-bottom: 0.25rem;">${req}</li>`).join('')}
          </ul>
        </div>
      </div>
      <div style="margin-top: auto; padding-top: 1.25rem; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div class="text-success" style="font-size: 1rem; font-weight: 800;">${s.amount}</div>
          <div class="text-danger" style="font-size: 0.625rem; font-weight: 600;">Due: ${s.deadline}</div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          ${hasApplied ? `
            <span class="badge badge-success" style="padding: 0.5rem;">Already Applied</span>
          ` : `
            <button class="btn btn-outline btn-sm" onclick="window.system.smartApply('${s.id}')" title="Smart Apply using Profile Data">${Icons.shield(16)} Smart Apply</button>
            <button class="btn btn-primary btn-sm" onclick="window.system.openApplyModal('${s.id}')">Apply</button>
          `}
        </div>
      </div>
    </div>
  `}).join('');
  
  parent.appendChild(grid);
}

export function renderScholarshipCatalog(parent: HTMLElement, system: any) {
  const searchBar = document.createElement('div');
  searchBar.className = 'search-bar fade-in';
  searchBar.innerHTML = `
    <div class="search-container">
      <span class="search-icon">${Icons.search(18)}</span>
      <input type="text" class="search-input" id="scholarship-search" placeholder="Search by name, category, or tags..." value="${system.scholarshipSearch}">
    </div>
    <select class="filter-select" id="category-filter">
      <option value="All">All Categories</option>
      <option value="Academic Excellence">Academic</option>
      <option value="Sports & Athletics">Sports</option>
      <option value="Financial Need-Based">Financial Aid</option>
      <option value="Arts & Culture">Arts</option>
    </select>
    <button class="btn ${system.showSmartMatches ? 'btn-primary' : 'btn-outline'}" onclick="window.system.toggleSmartMatches()" style="margin-left: auto;">
      ${Icons.star(18)} Smart Match
    </button>
  `;
  parent.appendChild(searchBar);

  let filtered = system.scholarships.filter((s: any) => {
    const query = system.scholarshipSearch.toLowerCase();
    const matchesSearch = s.title.toLowerCase().includes(query) || 
                         s.category.toLowerCase().includes(query) ||
                         s.tags.some((t: any) => t.toLowerCase().includes(query));
    const matchesCategory = system.statusFilter === 'All' || s.category === system.statusFilter;
    return matchesSearch && matchesCategory;
  });

  if (system.showSmartMatches && system.currentUser) {
    filtered = filtered.map((s: any) => {
      const score = system.performAutoVerification({ age: 20, level: 'Undergraduate', name: 'x', contact: 'x', fileName: 'x' }, s).score;
      return { ...s, matchScore: score };
    }).sort((a: any, b: any) => b.matchScore - a.matchScore);
  }

  const grid = document.createElement('div');
  grid.className = 'scholarship-grid fade-in';
  const isAdmin = system.currentUser?.role === 'admin';
  
  grid.innerHTML = filtered.map((s: any) => {
    const isSaved = system.currentUser?.savedScholarships?.includes(s.id);
    const hasApplied = system.applications.some((a: any) => a.userId === system.currentUser?.id && a.scholarshipId === s.id);
    return `
      <div class="card scholarship-card">
        <div class="content">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
            <div>
              <span class="badge badge-primary">${s.category}</span>
              ${s.matchScore ? `<span class="badge badge-success" style="margin-left: 0.5rem;">${s.matchScore}% Match</span>` : ''}
            </div>
            <div style="display: flex; gap: 0.5rem;">
              ${isAdmin ? `
                <button class="btn btn-outline" onclick="window.system.openEditScholarshipModal('${s.id}')" style="padding: 0; width: 32px; height: 32px; border-radius: 50%; border: none; color: var(--color-secondary);" title="Edit">
                  ${Icons.edit(18)}
                </button>
                <button class="btn btn-outline" onclick="window.system.deleteScholarship('${s.id}')" style="padding: 0; width: 32px; height: 32px; border-radius: 50%; border: none; color: var(--color-danger);" title="Delete">
                  ${Icons.x(18)}
                </button>
              ` : `
                <button class="btn btn-outline ${isSaved ? 'bg-primary-light' : ''}" onclick="window.system.toggleSaveScholarship('${s.id}')" style="padding: 0; width: 32px; height: 32px; border-radius: 50%; border: none; color: ${isSaved ? 'var(--color-primary)' : 'var(--color-secondary)'};">
                  ${Icons.bookmark(18)}
                </button>
              `}
            </div>
          </div>
          <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">${s.title}</h3>
          <p style="color: var(--color-secondary); font-size: 0.875rem; margin-bottom: 1rem; line-height: 1.5;">${s.description}</p>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            ${s.tags.map((t: any) => `<span style="font-size: 0.625rem; background: var(--color-bg); padding: 0.25rem 0.5rem; border-radius: 4px; color: var(--color-secondary); font-weight: 600;">#${t}</span>`).join('')}
          </div>
          <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 0.75rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Requirements:</h4>
            <ul style="padding-left: 1.25rem; font-size: 0.8125rem; color: var(--color-secondary); list-style-type: disc;">
              ${s.requirements.map((req: any) => `<li style="margin-bottom: 0.25rem;">${req}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div style="margin-top: auto; padding-top: 1.25rem; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="text-success" style="font-size: 1rem; font-weight: 800;">${s.amount}</div>
            <div class="text-danger" style="font-size: 0.625rem; font-weight: 600;">Due: ${s.deadline}</div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            ${isAdmin ? '' : hasApplied ? `
              <span class="badge badge-success" style="padding: 0.5rem;">Already Applied</span>
            ` : `
              <button class="btn btn-outline btn-sm" onclick="window.system.smartApply('${s.id}')" title="Smart Apply using Profile Data">${Icons.shield(16)} Smart Apply</button>
              <button class="btn btn-primary btn-sm" onclick="window.system.openApplyModal('${s.id}')">Apply</button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state card" style="grid-column: 1/-1;"><p>No scholarships found matching your search.</p></div>`;
  }
  
  parent.appendChild(grid);

  const searchInput = document.getElementById('scholarship-search') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      const start = (e.target as HTMLInputElement).selectionStart;
      const end = (e.target as HTMLInputElement).selectionEnd;
      
      system.scholarshipSearch = val;
      system.render();
      
      const refreshedInput = document.getElementById('scholarship-search') as HTMLInputElement;
      if (refreshedInput) {
        refreshedInput.focus();
        refreshedInput.setSelectionRange(start, end);
      }
    });
  }

  document.getElementById('category-filter')?.addEventListener('change', (e) => {
    system.statusFilter = (e.target as HTMLSelectElement).value;
    system.render();
  });
}

export function renderProfile(parent: HTMLElement, system: any) {
  if (!system.currentUser) return;
  const card = document.createElement('div');
  card.className = 'card fade-in';
  card.style.borderRadius = '16px';
  card.innerHTML = `
    <div style="display: flex; align-items: center; gap: 2rem; margin-bottom: 2.5rem; flex-wrap: wrap;">
      <div class="avatar avatar-lg" style="width: 100px; height: 100px; font-size: 2.5rem; border-radius: 50%; font-family: var(--font-heading);">${system.currentUser.name.charAt(0)}</div>
      <div>
        <h2 style="font-size: 2rem; margin-bottom: 0.25rem;">${system.currentUser.name}</h2>
        <p style="color: var(--color-secondary); font-size: 1rem;">${system.currentUser.email}</p>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
          <span class="badge badge-primary">${system.currentUser.level || 'Not set'}</span>
          ${system.currentUser.gpa ? `<span class="badge badge-info">GPA: ${system.currentUser.gpa}</span>` : ''}
        </div>
      </div>
    </div>
    <form id="profile-form">
      <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 0.5rem; font-family: var(--font-heading); font-size: 1.5rem;">Personal Information</h3>
      <div class="form-grid-2">
        <div class="form-group"><label>Full Name</label><input type="text" name="name" value="${system.currentUser.name}" required></div>
        <div class="form-group"><label>Phone</label><input type="text" name="phone" value="${system.currentUser.phone || ''}"></div>
      </div>
      <div class="form-grid-3">
        <div class="form-group"><label>Age</label><input type="number" name="age" value="${system.currentUser.age || ''}"></div>
        <div class="form-group"><label>Education Level</label>
          <select name="level">
            <option value="High School" ${system.currentUser.level === 'High School' ? 'selected' : ''}>High School</option>
            <option value="Undergraduate" ${system.currentUser.level === 'Undergraduate' ? 'selected' : ''}>Undergraduate</option>
            <option value="Postgraduate" ${system.currentUser.level === 'Postgraduate' ? 'selected' : ''}>Postgraduate</option>
          </select>
        </div>
        <div class="form-group"><label>GPA (0.0 - 4.0)</label><input type="number" step="0.01" name="gpa" value="${system.currentUser.gpa || ''}"></div>
      </div>
      <div class="form-group"><label>Bio</label><textarea name="bio">${system.currentUser.bio || ''}</textarea></div>
      <button type="submit" class="btn btn-primary">${Icons.check(18)} Save Changes</button>
    </form>
  `;
  parent.appendChild(card);
  document.getElementById('profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    system.currentUser!.name = formData.get('name') as string;
    system.currentUser!.phone = formData.get('phone') as string;
    system.currentUser!.age = parseInt(formData.get('age') as string) || undefined;
    system.currentUser!.level = formData.get('level') as string;
    system.currentUser!.gpa = parseFloat(formData.get('gpa') as string) || undefined;
    system.currentUser!.bio = formData.get('bio') as string;
    system.saveUsers();
    system.addLog('info', 'User profile updated.');
    system.showToast('Profile updated.', 'success');
    system.render();
  });
}
