import { Icons } from '../icons';

export function renderAdminDashboard(parent: HTMLElement, system: any) {
  const stats = document.createElement('div');
  stats.className = 'stats-grid fade-in';
  stats.style.marginBottom = '2rem';
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-value">${system.applications.length}</div><div class="stat-label">Total Apps</div></div>
    <div class="stat-card"><div class="stat-value text-warning">${system.applications.filter((a: any) => a.status === 'Pending').length}</div><div class="stat-label">Pending</div></div>
    <div class="stat-card"><div class="stat-value text-success">${system.applications.filter((a: any) => a.status === 'Approved').length}</div><div class="stat-label">Approved</div></div>
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
      <h3 style="font-weight: 700;">Applications</h3>
      <div style="display: flex; gap: 1rem;">
        <select class="filter-select" id="admin-scholarship-filter" style="padding: 0.5rem; font-size: 0.875rem;">
          ${scholarshipOptions}
        </select>
        <select class="filter-select" id="admin-status-filter" style="padding: 0.5rem; font-size: 0.875rem;">
          <option value="All" ${system.adminFilterStatus === 'All' ? 'selected' : ''}>All Statuses</option>
          <option value="Pending" ${system.adminFilterStatus === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Reviewing" ${system.adminFilterStatus === 'Reviewing' ? 'selected' : ''}>Reviewing</option>
          <option value="Interview Scheduled" ${system.adminFilterStatus === 'Interview Scheduled' ? 'selected' : ''}>Interview Scheduled</option>
          <option value="Approved" ${system.adminFilterStatus === 'Approved' ? 'selected' : ''}>Approved</option>
          <option value="Rejected" ${system.adminFilterStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </div>
    </div>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="text-align: left; border-bottom: 2px solid var(--color-border);">
            <th style="padding: 1rem;">Applicant</th>
            <th style="padding: 1rem;">Scholarship</th>
            <th style="padding: 1rem;">Verification</th>
            <th style="padding: 1rem; text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${paginatedApps.length === 0 ? '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--color-secondary);">No applications found.</td></tr>' : paginatedApps.map((app: any) => `
            <tr style="border-bottom: 1px solid var(--color-border);">
              <td style="padding: 1rem;">
                <div style="font-weight: 600;">${app.name}</div>
                <div style="font-size: 0.75rem; color: var(--color-secondary);">${app.contact}</div>
              </td>
              <td style="padding: 1rem;">${system.scholarships.find((s: any) => s.id === app.scholarshipId)?.title || 'General'}</td>
              <td style="padding: 1rem;">
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                  <div class="verification-badge ${app.verificationStatus === 'Passed' ? 'verification-passed' : 'verification-failed'}">${app.verificationStatus} (${app.verificationScore}%)</div>
                  <div class="score-meter"><div class="score-fill" style="width: ${app.verificationScore}%;"></div></div>
                </div>
              </td>
              <td style="padding: 1rem; text-align: right;">
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                  <button class="btn btn-outline btn-sm" onclick="window.system.viewDetails('${app.id}')" title="View Details">${Icons.eye(16)}</button>
                  <button class="btn btn-approve btn-sm" onclick="window.system.updateApplicationStatus('${app.id}', 'Approved')" title="Approve">${Icons.check(16)}</button>
                  <button class="btn btn-reject btn-sm" onclick="window.system.updateApplicationStatus('${app.id}', 'Rejected')" title="Reject">${Icons.x(16)}</button>
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

  document.getElementById('admin-scholarship-filter')?.addEventListener('change', (e) => {
    system.adminFilterScholarship = (e.target as HTMLSelectElement).value;
    system.adminCurrentPage = 1;
    system.render();
  });
  document.getElementById('admin-status-filter')?.addEventListener('change', (e) => {
    system.adminFilterStatus = (e.target as HTMLSelectElement).value;
    system.adminCurrentPage = 1;
    system.render();
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
  const header = document.createElement('div');
  header.className = 'fade-in';
  header.style.marginBottom = '1.5rem';
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
      <h3 style="font-weight: 700;">User Management</h3>
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
    );

    tableContainer.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 2px solid var(--color-border);">
              <th style="padding: 1rem;">User Profile</th>
              <th style="padding: 1rem;">Account Type</th>
              <th style="padding: 1rem; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredUsers.length === 0 ? '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: var(--color-secondary);">No users found.</td></tr>' : filteredUsers.map((u: any) => `
              <tr style="border-bottom: 1px solid var(--color-border);">
                <td style="padding: 1rem;">
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-bg); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-weight: 700; border: 1px solid var(--color-border);">
                      ${u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style="font-weight: 600;">${u.name}</div>
                      <div style="font-size: 0.75rem; color: var(--color-secondary);">${u.email}</div>
                    </div>
                  </div>
                </td>
                <td style="padding: 1rem;">
                  <span class="badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'staff' ? 'badge-info' : 'badge-outline'}" style="text-transform: capitalize;">
                    ${u.role}
                  </span>
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
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <h3 style="font-weight: 700;">System Health & Logs</h3>
      <button class="btn btn-outline btn-sm" onclick="window.system.triggerBackup()">${Icons.database(16)} Trigger Backup</button>
    </div>
    <div style="background: var(--color-bg); border-radius: 0.5rem; max-height: 500px; overflow-y: auto;">
      ${system.logs.length === 0 ? '<div style="padding: 2rem; text-align: center; color: var(--color-secondary);">No logs found.</div>' : system.logs.map((log: any) => `
        <div class="log-entry">
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
          <span class="log-level log-${log.level}">${log.level.toUpperCase()}</span>
          <span style="color: var(--color-secondary); min-width: 100px;">[${log.user}]</span>
          <span>${log.message}</span>
        </div>
      `).join('')}
    </div>
  `;
  parent.appendChild(container);
}
