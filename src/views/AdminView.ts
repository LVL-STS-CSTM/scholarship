import { Icons } from '../icons';

export function renderAdminDashboard(parent: HTMLElement, system: any) {
  const stats = document.createElement('div');
  stats.className = 'stats-grid fade-in';
  stats.style.marginBottom = '2rem';
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-value">${system.applications.length}</div><div class="stat-label">${system.t('Total Apps')}</div></div>
    <div class="stat-card"><div class="stat-value text-warning">${system.applications.filter((a: any) => a.status === 'Pending').length}</div><div class="stat-label">${system.t('Pending')}</div></div>
    <div class="stat-card"><div class="stat-value text-success">${system.applications.filter((a: any) => a.status === 'Approved').length}</div><div class="stat-label">${system.t('Approved')}</div></div>
    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
      <button class="btn btn-primary" onclick="window.system.openCreateScholarshipModal()">${Icons.scholarship(18)} ${system.t('Post Scholarship')}</button>
      <button class="btn btn-outline" onclick="window.system.exportToCSV()">${Icons.download(18)} ${system.t('Export Data')}</button>
    </div>
  `;
  parent.appendChild(stats);

  const table = document.createElement('div');
  table.className = 'card fade-in';
  
  let filteredApps = system.applications;
  if (system.adminFilterStatus !== 'All') filteredApps = filteredApps.filter((a: any) => a.status === system.adminFilterStatus);
  if (system.adminFilterScholarship !== 'All') filteredApps = filteredApps.filter((a: any) => a.scholarshipId === system.adminFilterScholarship);
  
  // Search filter
  const searchInput = (document.getElementById('admin-app-search') as HTMLInputElement)?.value || '';
  if (searchInput) {
    const q = searchInput.toLowerCase();
    filteredApps = filteredApps.filter((a: any) => 
      a.name.toLowerCase().includes(q) || 
      a.contact.toLowerCase().includes(q) ||
      (system.scholarships.find((s: any) => s.id === a.scholarshipId)?.title || '').toLowerCase().includes(q)
    );
  }

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage) || 1;
  if (system.adminCurrentPage > totalPages) system.adminCurrentPage = totalPages;
  const startIdx = (system.adminCurrentPage - 1) * itemsPerPage;
  const paginatedApps = filteredApps.slice(startIdx, startIdx + itemsPerPage);

  const scholarshipOptions = ['All', ...new Set(system.scholarships.map((s: any) => s.id))].map(id => {
    const title = id === 'All' ? 'All Scholarships' : system.scholarships.find((s: any) => s.id === id)?.title;
    return `<option value="${id}" ${system.adminFilterScholarship === id ? 'selected' : ''}>${title}</option>`;
  }).join('');

  table.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h3 style="font-weight: 700; margin-bottom: 0.5rem;">${system.t('Applications')}</h3>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-sm ${system.adminFilterStatus === 'All' ? 'btn-primary' : 'btn-outline'}" onclick="window.system.setAdminStatusFilter('All')">All</button>
          <button class="btn btn-sm ${system.adminFilterStatus === 'Pending' ? 'btn-primary' : 'btn-outline'}" onclick="window.system.setAdminStatusFilter('Pending')">Pending</button>
          <button class="btn btn-sm ${system.adminFilterStatus === 'Reviewing' ? 'btn-primary' : 'btn-outline'}" onclick="window.system.setAdminStatusFilter('Reviewing')">Reviewing</button>
          <button class="btn btn-sm ${system.adminFilterStatus === 'Approved' ? 'btn-primary' : 'btn-outline'}" onclick="window.system.setAdminStatusFilter('Approved')">Approved</button>
        </div>
      </div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
        <div id="bulk-actions" style="display: none; align-items: center; gap: 0.5rem; padding: 0.25rem 1rem; background: var(--color-bg); border-radius: 0.5rem; border: 1px solid var(--color-primary);">
          <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-primary);">Bulk Action:</span>
          <button class="btn btn-approve btn-xs" onclick="window.system.bulkUpdateStatus('Approved')">Approve Selected</button>
          <button class="btn btn-reject btn-xs" onclick="window.system.bulkUpdateStatus('Rejected')">Reject Selected</button>
        </div>
        <div class="search-container" style="max-width: 250px; margin: 0;">
          <span class="search-icon">${Icons.search(18)}</span>
          <input type="text" class="search-input" id="admin-app-search" placeholder="Search applications..." value="${searchInput}" style="padding: 0.5rem 0.5rem 0.5rem 2.5rem;">
        </div>
        <select class="filter-select" id="admin-scholarship-filter" style="padding: 0.5rem; font-size: 0.875rem;">
          ${scholarshipOptions}
        </select>
      </div>
    </div>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="text-align: left; border-bottom: 2px solid var(--color-border);">
            <th style="padding: 1rem; width: 40px;">
              <input type="checkbox" id="select-all-apps" style="cursor: pointer;">
            </th>
            <th style="padding: 1rem;">${system.t('Applicant')}</th>
            <th style="padding: 1rem;">${system.t('Scholarship')}</th>
            <th style="padding: 1rem;">${system.t('Status')}</th>
            <th style="padding: 1rem; text-align: right;">${system.t('Actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedApps.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-secondary);">No applications found.</td></tr>' : paginatedApps.map((app: any) => `
            <tr style="border-bottom: 1px solid var(--color-border); transition: background 0.2s;" onmouseover="this.style.background='var(--color-bg)'" onmouseout="this.style.background='transparent'">
              <td style="padding: 1rem;">
                <input type="checkbox" class="app-checkbox" data-id="${app.id}" style="cursor: pointer;">
              </td>
              <td style="padding: 1rem;">
                <div style="font-weight: 600;">${app.name}</div>
                <div style="font-size: 0.75rem; color: var(--color-secondary);">${app.contact}</div>
              </td>
              <td style="padding: 1rem;">
                <div style="font-weight: 500;">${system.scholarships.find((s: any) => s.id === app.scholarshipId)?.title || 'General'}</div>
                <div style="font-size: 0.75rem; color: var(--color-secondary);">${new Date(app.timestamp).toLocaleDateString()} at ${new Date(app.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </td>
              <td style="padding: 1rem;">
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <span class="status-badge status-${app.status.toLowerCase().replace(' ', '-')}">${system.t(app.status) || app.status}</span>
                  <div class="verification-badge ${app.verificationStatus === 'Passed' ? 'verification-passed' : 'verification-failed'}" style="font-size: 0.65rem;">
                    ${app.verificationStatus} (${app.verificationScore}%)
                  </div>
                </div>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                  <button class="btn btn-outline btn-sm" onclick="window.system.viewDetails('${app.id}')" title="${system.t('View Details')}">${Icons.eye(16)}</button>
                  <button class="btn btn-outline btn-sm" onclick="window.system.openScheduleInterviewModal('${app.id}')" title="${system.t('Schedule Interview')}">${Icons.calendar(16)}</button>
                  <button class="btn btn-approve btn-sm" onclick="window.system.updateApplicationStatus('${app.id}', 'Approved')" title="${system.t('Approved')}">${Icons.check(16)}</button>
                  <button class="btn btn-reject btn-sm" onclick="window.system.updateApplicationStatus('${app.id}', 'Rejected')" title="${system.t('Rejected')}">${Icons.x(16)}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
      <span style="font-size: 0.875rem; color: var(--color-secondary);">Showing ${startIdx + 1} to ${Math.min(startIdx + itemsPerPage, filteredApps.length)} of ${filteredApps.length} entries</span>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-outline btn-sm" ${system.adminCurrentPage === 1 ? 'disabled' : ''} onclick="window.system.changeAdminPage(-1)">Previous</button>
        <button class="btn btn-outline btn-sm" ${system.adminCurrentPage === totalPages ? 'disabled' : ''} onclick="window.system.changeAdminPage(1)">Next</button>
      </div>
    </div>
  `;
  parent.appendChild(table);

  document.getElementById('admin-app-search')?.addEventListener('input', (e) => {
    // We don't want to re-render everything while typing if we can help it, 
    // but the simplistic architecture requires it for filtering logic.
    // However, re-rendering might lose focus if we are not careful.
    // Let's implement similar debounced or state-saving logic as in ApplicantView.
    const val = (e.target as HTMLInputElement).value;
    const start = (e.target as HTMLInputElement).selectionStart;
    const end = (e.target as HTMLInputElement).selectionEnd;
    
    system.render();
    
    const refreshedInput = document.getElementById('admin-app-search') as HTMLInputElement;
    if (refreshedInput) {
      refreshedInput.value = val;
      refreshedInput.focus();
      refreshedInput.setSelectionRange(start, end);
    }
  });

  document.getElementById('admin-scholarship-filter')?.addEventListener('change', (e) => {
    system.adminFilterScholarship = (e.target as HTMLSelectElement).value;
    system.adminCurrentPage = 1;
    system.render();
  });

  // Bulk Actions Logic
  const selectAll = document.getElementById('select-all-apps') as HTMLInputElement;
  const checkboxes = document.querySelectorAll('.app-checkbox') as NodeListOf<HTMLInputElement>;
  const bulkMenu = document.getElementById('bulk-actions');

  const updateBulkVisibility = () => {
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    if (bulkMenu) bulkMenu.style.display = selectedCount > 0 ? 'flex' : 'none';
  };

  selectAll?.addEventListener('change', () => {
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkVisibility();
  });

  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateBulkVisibility);
  });
}

export function renderAdminReports(parent: HTMLElement, system: any, Chart: any) {
  const budgetPercent = (system.budget.utilized / system.budget.total) * 100;
  
  const budgetCard = document.createElement('div');
  budgetCard.className = 'card fade-in';
  budgetCard.style.marginBottom = '2rem';
  budgetCard.innerHTML = `
    <h3 style="font-weight: 700; margin-bottom: 1rem;">Financial Report: Budget Utilization</h3>
    <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.5rem;">
      <span>Utilized: ₱${system.budget.utilized.toLocaleString()}</span>
      <span>Total Budget: ₱${system.budget.total.toLocaleString()}</span>
    </div>
    <div class="budget-bar">
      <div class="budget-fill" style="width: ${budgetPercent}%;"></div>
      <div class="budget-text">${budgetPercent.toFixed(1)}% Utilized</div>
    </div>
  `;
  parent.appendChild(budgetCard);

  const grid = document.createElement('div');
  grid.className = 'reports-grid fade-in';
  
  const categories = [...new Set(system.scholarships.map((s: any) => s.category))];
  const catData = categories.map(cat => system.applications.filter((a: any) => a.category === cat).length);

  const statusData = [
    system.applications.filter((a: any) => a.status === 'Approved').length,
    system.applications.filter((a: any) => a.status === 'Pending').length,
    system.applications.filter((a: any) => a.status === 'Rejected').length
  ];

  const ages = system.applications.map((a: any) => a.age);
  const ageGroups = {
    '12-17': ages.filter((a: any) => a >= 12 && a <= 17).length,
    '18-22': ages.filter((a: any) => a >= 18 && a <= 22).length,
    '23-30': ages.filter((a: any) => a >= 23 && a <= 30).length,
    '30+': ages.filter((a: any) => a > 30).length
  };

  grid.innerHTML = `
    <div class="card report-card">
      <h3 style="font-weight: 700; margin-bottom: 1.5rem;">Applications by Category</h3>
      <div style="flex: 1; min-height: 300px;"><canvas id="categoryChart"></canvas></div>
    </div>
    <div class="card report-card">
      <h3 style="font-weight: 700; margin-bottom: 1.5rem;">Approval Rate</h3>
      <div style="flex: 1; min-height: 300px;"><canvas id="approvalChart"></canvas></div>
    </div>
    <div class="card report-card">
      <h3 style="font-weight: 700; margin-bottom: 1.5rem;">Applicant Demographics (Age)</h3>
      <div style="flex: 1; min-height: 300px;"><canvas id="demographicsChart"></canvas></div>
    </div>
    <div class="card report-card">
      <h3 style="font-weight: 700; margin-bottom: 1.5rem;">Verification Score Trends</h3>
      <div style="flex: 1; min-height: 300px;"><canvas id="scoreChart"></canvas></div>
    </div>
  `;
  parent.appendChild(grid);

  setTimeout(() => {
    system.charts.forEach((c: any) => c.destroy());
    system.charts = [];

    const ctx1 = (document.getElementById('categoryChart') as HTMLCanvasElement).getContext('2d');
    system.charts.push(new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [{
          label: 'Applications',
          data: catData,
          backgroundColor: '#2563eb',
          borderRadius: 8
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    }));

    const ctx2 = (document.getElementById('approvalChart') as HTMLCanvasElement).getContext('2d');
    system.charts.push(new Chart(ctx2, {
      type: 'pie',
      data: {
        labels: ['Approved', 'Pending', 'Rejected'],
        datasets: [{
          data: statusData,
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    }));

    const ctxDem = (document.getElementById('demographicsChart') as HTMLCanvasElement).getContext('2d');
    system.charts.push(new Chart(ctxDem, {
      type: 'doughnut',
      data: {
        labels: Object.keys(ageGroups),
        datasets: [{
          data: Object.values(ageGroups),
          backgroundColor: ['#60a5fa', '#3b82f6', '#2563eb', '#1e40af']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '60%' }
    }));

    const ctx3 = (document.getElementById('scoreChart') as HTMLCanvasElement).getContext('2d');
    const scores = system.applications.map((a: any) => a.verificationScore);
    system.charts.push(new Chart(ctx3, {
      type: 'line',
      data: {
        labels: system.applications.map((_: any, i: number) => `App ${i+1}`),
        datasets: [{
          label: 'Verification Score',
          data: scores,
          borderColor: '#2563eb',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(37, 99, 235, 0.1)'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    }));
  }, 100);
}

export function renderAdminUsers(parent: HTMLElement, system: any) {
  const stats = document.createElement('div');
  stats.className = 'stats-grid fade-in';
  stats.style.marginBottom = '2rem';
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${system.users.length}</div>
      <div class="stat-label">Total Registered Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-primary">${system.users.filter((u: any) => u.role === 'admin').length}</div>
      <div class="stat-label">Admins</div>
    </div>
    <div class="stat-card">
      <div class="stat-value text-info">${system.users.filter((u: any) => u.role === 'staff').length}</div>
      <div class="stat-label">Staff Members</div>
    </div>
  `;
  parent.appendChild(stats);

  const header = document.createElement('div');
  header.className = 'fade-in';
  header.style.marginBottom = '1.5rem';
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <h3 style="font-weight: 700;">User List</h3>
      <div class="search-container" style="max-width: 300px; margin: 0;">
        <span class="search-icon">${Icons.search(18)}</span>
        <input type="text" class="search-input" id="user-search" placeholder="Search by name or email..." style="padding: 0.5rem 0.5rem 0.5rem 2.5rem;">
      </div>
    </div>
  `;
  parent.appendChild(header);

  const tableContainer = document.createElement('div');
  tableContainer.className = 'card fade-in';
  tableContainer.id = 'admin-users-table-container';
  
  const renderTable = (search: string = '') => {
    const filteredUsers = system.users.filter((u: any) => 
      u.name.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
    ).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    tableContainer.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 2px solid var(--color-border);">
              <th style="padding: 1rem;">User Profile</th>
              <th style="padding: 1rem;">Role</th>
              <th style="padding: 1rem;">Joined Date</th>
              <th style="padding: 1rem; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredUsers.length === 0 ? '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--color-secondary);">No users found.</td></tr>' : filteredUsers.map((u: any) => `
              <tr style="border-bottom: 1px solid var(--color-border); transition: background 0.2s;" onmouseover="this.style.background='var(--color-bg)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 1rem;">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-bg); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-weight: 700; border: 1px solid var(--color-border); flex-shrink: 0;">
                      ${u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style="overflow: hidden;">
                      <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.name}</div>
                      <div style="font-size: 0.75rem; color: var(--color-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.email}</div>
                    </div>
                  </div>
                </td>
                <td style="padding: 1rem;">
                  <span class="badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'staff' ? 'badge-info' : 'badge-outline'}" style="text-transform: capitalize;">
                    ${u.role}
                  </span>
                </td>
                <td style="padding: 1rem;">
                  <div style="font-size: 0.875rem; color: var(--color-secondary);">
                    ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td style="padding: 1rem; text-align: right;">
                  <button class="btn btn-outline btn-sm" onclick="window.system.editUserRole('${u.id}')">
                    ${Icons.edit(14)} Edit Role
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  renderTable();
  parent.appendChild(tableContainer);

  document.getElementById('user-search')?.addEventListener('input', (e) => {
    renderTable((e.target as HTMLInputElement).value);
  });
}

export function renderAdminLogs(parent: HTMLElement, system: any) {
  const container = document.createElement('div');
  container.className = 'card fade-in';
  
  const currentFilter = (document.getElementById('log-level-filter') as HTMLSelectElement)?.value || 'All';
  
  let filteredLogs = system.logs;
  if (currentFilter !== 'All') {
    filteredLogs = filteredLogs.filter((l: any) => l.level === currentFilter.toLowerCase());
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
      <div>
        <h3 style="font-weight: 700; margin-bottom: 0.25rem;">System Health & Logs</h3>
        <p style="font-size: 0.8125rem; color: var(--color-secondary);">Real-time audit trail of all system activities.</p>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <select id="log-level-filter" class="filter-select" style="padding: 0.4rem 2rem 0.4rem 0.75rem;">
          <option value="All" ${currentFilter === 'All' ? 'selected' : ''}>All Levels</option>
          <option value="Info" ${currentFilter === 'Info' ? 'selected' : ''}>Info</option>
          <option value="Warn" ${currentFilter === 'Warn' ? 'selected' : ''}>Warning</option>
          <option value="Error" ${currentFilter === 'Error' ? 'selected' : ''}>Error</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="window.system.triggerBackup()">${Icons.database(16)} Trigger Backup</button>
      </div>
    </div>
    <div style="background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 0.75rem; font-family: var(--font-mono); font-size: 0.75rem; line-height: 1.6; max-height: 600px; overflow-y: auto; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
      ${filteredLogs.length === 0 ? '<div style="padding: 2rem; text-align: center; color: #858585;">No logs matching criteria.</div>' : filteredLogs.map((log: any) => {
        const time = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const levelColor = log.level === 'error' ? '#f44336' : log.level === 'warn' ? '#ff9800' : '#4caf50';
        return `
          <div style="margin-bottom: 0.5rem; display: flex; gap: 1rem; border-left: 2px solid ${levelColor}; padding-left: 0.75rem;">
            <span style="color: #858585; white-space: nowrap;">[${time}]</span>
            <span style="color: ${levelColor}; font-weight: 700; min-width: 50px;">${log.level.toUpperCase()}</span>
            <span style="color: #569cd6; min-width: 80px;">@${log.user || 'system'}</span>
            <span style="color: #ce9178;">"${log.message}"</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
  parent.appendChild(container);

  document.getElementById('log-level-filter')?.addEventListener('change', () => {
    system.render();
  });
}
