import { Icons } from '../icons';
import { Document } from '../types';

export function renderVault(parent: HTMLElement, system: any) {
  const isStaff = system.currentUser?.role === 'staff' || system.currentUser?.role === 'admin';
  let docs: Document[] = [];
  
  if (isStaff) {
    docs = system.applications.flatMap((a: any) => a.documents || []);
  } else {
    docs = system.currentUser?.vaultDocuments || [];
  }

  const container = document.createElement('div');
  container.className = 'fade-in';
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
      <h3 style="font-weight: 700;">${isStaff ? 'Barangay Document Vault' : 'My Document Vault'}</h3>
      ${!isStaff ? `<button class="btn btn-primary btn-sm" onclick="window.system.openUploadDocumentModal()">${Icons.fileText(16)} Upload Document</button>` : ''}
    </div>
    ${docs.length === 0 ? `
      <div class="empty-state card">
        <div style="margin-bottom: 1rem; color: var(--color-secondary);">${Icons.fileText(48)}</div>
        <p>${isStaff ? 'No documents found in the vault.' : 'Your vault is empty. Upload documents to use them for applications.'}</p>
      </div>
    ` : `
      <div class="document-vault">
        ${docs.map(doc => `
          <div class="doc-card">
            <div style="display: flex; justify-content: space-between; width: 100%;">
              ${Icons.fileText(32)}
              ${!isStaff ? `<button class="btn btn-outline text-danger" style="padding: 0.25rem; border: none;" onclick="window.system.deleteVaultDocument('${doc.id}')" title="Delete Document">${Icons.trash(16)}</button>` : ''}
            </div>
            <div style="font-weight: 600; font-size: 0.875rem; margin-top: 0.5rem;">${doc.name}</div>
            <div style="font-size: 0.75rem; color: var(--color-secondary);">${doc.type}</div>
            ${isStaff ? `<span class="badge ${doc.status === 'Approved' ? 'badge-success' : doc.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}" style="margin-top: 0.5rem;">${doc.status}</span>` : ''}
            <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
              <button class="btn btn-outline btn-sm" onclick="window.system.showToast('Downloading document...', 'info')">${Icons.download(14)}</button>
              ${isStaff ? `<button class="btn btn-primary btn-sm" onclick="window.system.approveDocument('${doc.id}')">${Icons.check(14)}</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
  parent.appendChild(container);
}
