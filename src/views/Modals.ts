import { Icons } from '../icons';
import { db, handleFirestoreError } from '../services/firebase';
import { 
  collection, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  getDoc,
  arrayUnion
} from 'firebase/firestore';

export function openUploadDocumentModal(system: any) {
  const content = `
    <form id="upload-doc-form">
      <div class="form-group">
        <label>Document Name</label>
        <input type="text" name="name" required placeholder="e.g., High School Transcript">
      </div>
      <div class="form-group">
        <label>Document Type</label>
        <select name="type" required>
          <option value="Identification">Identification (ID, Birth Certificate)</option>
          <option value="Academic">Academic (Transcript, Diploma)</option>
          <option value="Financial">Financial (Tax Return, Indigency)</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>File</label>
        <input type="file" name="file" required>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Upload to Vault</button>
    </form>
  `;
  system.showModal('Upload Document', content);

  document.getElementById('upload-doc-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!system.currentUser) return;
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const newDoc: any = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.get('name') as string,
        type: formData.get('type') as string,
        status: 'Pending',
        url: '#',
        uploadedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', system.currentUser.id), {
        vaultDocuments: arrayUnion(newDoc)
      });

      system.showToast('Document uploaded to vault!', 'success');
      document.querySelector('.modal-overlay')?.remove();
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${system.currentUser.id}`);
    }
  });
}

export function editUserRole(system: any, id: string) {
  const user = system.users.find((u: any) => u.id === id);
  if (!user) return;
  const content = `
    <div class="form-group">
      <label>Select New Role for ${user.name}</label>
      <select id="new-role-select">
        <option value="applicant" ${user.role === 'applicant' ? 'selected' : ''}>Applicant</option>
        <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
    </div>
    <button class="btn btn-primary" style="width: 100%;" onclick="window.system.saveUserRole('${user.id}', (document.getElementById('new-role-select') as HTMLSelectElement).value)">Update Role</button>
  `;
  system.showModal('Edit User Role', content);
}
export function openEditScholarshipModal(system: any, id: string) {
  const s = system.scholarships.find((x: any) => x.id === id);
  if (!s) return;

  const content = `
    <form id="edit-scholarship-form">
      <input type="hidden" name="id" value="${s.id}">
      <div class="form-group"><label>Title</label><input type="text" name="title" required value="${s.title}"></div>
      <div class="form-group">
        <label>Description (Rich Text)</label>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('edit-desc-input').value += '<b></b>'">Bold</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('edit-desc-input').value += '<i></i>'">Italic</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('edit-desc-input').value += '<ul>\\n<li>Item</li>\\n</ul>'">List</button>
        </div>
        <textarea id="edit-desc-input" name="description" required>${s.description}</textarea>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Category</label><input type="text" name="category" required value="${s.category}"></div>
        <div class="form-group"><label>Amount</label><input type="text" name="amount" required value="${s.amount}"></div>
      </div>
      <div class="form-grid-3">
        <div class="form-group"><label>Deadline</label><input type="date" name="deadline" required value="${s.deadline}"></div>
        <div class="form-group"><label>Min Age</label><input type="number" name="minAge" value="${s.minAge || ''}"></div>
        <div class="form-group"><label>Max Age</label><input type="number" name="maxAge" value="${s.maxAge || ''}"></div>
      </div>
      <div class="form-group"><label>Requirements (comma-separated)</label><input type="text" name="requirements" required value="${s.requirements.join(', ')}"></div>
      <div class="form-group"><label>Tags (comma-separated)</label><input type="text" name="tags" required value="${s.tags.join(', ')}"></div>
      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">${system.t('Update Scholarship')}</button>
    </form>
  `;
  system.showModal(system.t('Edit'), content);

  document.getElementById('edit-scholarship-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      const scholarshipId = formData.get('id') as string;
      
      const updates = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        amount: formData.get('amount') as string,
        deadline: formData.get('deadline') as string,
        requirements: (formData.get('requirements') as string).split(',').map((r: string) => r.trim()).filter(r => r),
        tags: (formData.get('tags') as string).split(',').map((t: string) => t.trim()).filter(t => t),
        minAge: formData.get('minAge') ? parseInt(formData.get('minAge') as string) : null,
        maxAge: formData.get('maxAge') ? parseInt(formData.get('maxAge') as string) : null,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'scholarships', scholarshipId), updates);
      system.showToast('Scholarship updated successfully!', 'success');
      document.querySelector('.modal-overlay')?.remove();
    } catch (err) {
      handleFirestoreError(err, 'update', 'scholarships');
    }
  });
}

export function openCreateScholarshipModal(system: any) {
  const content = `
    <form id="create-scholarship-form">
      <div class="form-group"><label>Title</label><input type="text" name="title" required placeholder="e.g., Community Leadership Award"></div>
      <div class="form-group">
        <label>Description (Rich Text)</label>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('desc-input').value += '<b></b>'">Bold</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('desc-input').value += '<i></i>'">Italic</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('desc-input').value += '<ul>\\n<li>Item</li>\\n</ul>'">List</button>
        </div>
        <textarea id="desc-input" name="description" required placeholder="Describe the scholarship... (HTML supported)"></textarea>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Category</label><input type="text" name="category" required placeholder="e.g., Academic Excellence"></div>
        <div class="form-group"><label>Amount</label><input type="text" name="amount" required placeholder="e.g., ₱5,000 / Semester"></div>
      </div>
      <div class="form-grid-3">
        <div class="form-group"><label>Deadline</label><input type="date" name="deadline" required></div>
        <div class="form-group"><label>Min Age</label><input type="number" name="minAge" placeholder="Optional"></div>
        <div class="form-group"><label>Max Age</label><input type="number" name="maxAge" placeholder="Optional"></div>
      </div>
      <div class="form-group"><label>Requirements (comma-separated)</label><input type="text" name="requirements" required placeholder="e.g., GPA 3.5+, Transcript, ID"></div>
      <div class="form-group"><label>Tags (comma-separated)</label><input type="text" name="tags" required placeholder="e.g., STEM, Merit-Based"></div>
      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Post Scholarship</button>
    </form>
  `;
  system.showModal('Post New Scholarship', content);

  document.getElementById('create-scholarship-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const newScholarship: any = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        amount: formData.get('amount') as string,
        deadline: formData.get('deadline') as string,
        requirements: (formData.get('requirements') as string).split(',').map((r: string) => r.trim()).filter(r => r),
        tags: (formData.get('tags') as string).split(',').map((t: string) => t.trim()).filter(t => t),
        minAge: formData.get('minAge') ? parseInt(formData.get('minAge') as string) : null,
        maxAge: formData.get('maxAge') ? parseInt(formData.get('maxAge') as string) : null,
        authorId: system.currentUser.id,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'scholarships'), newScholarship);
      system.showToast('Scholarship posted successfully!', 'success');
      document.querySelector('.modal-overlay')?.remove();
    } catch (err) {
      handleFirestoreError(err, 'create', 'scholarships');
    }
  });
}

export function openApplyModal(system: any, scholarshipId: string) {
  const s = system.scholarships.find((sc: any) => sc.id === scholarshipId);
  if (!s) return;
  
  if (system.applications.some((a: any) => a.userId === system.currentUser.id && a.scholarshipId === scholarshipId)) {
    system.showToast('You have already applied for this scholarship.', 'error');
    return;
  }

  const vaultDocs = system.currentUser?.vaultDocuments || [];
  
  const requirementInputs = s.requirements.map((req: string, index: number) => {
    const options = vaultDocs.map((doc: any) => `<option value="${doc.id}">${doc.name} (${doc.type})</option>`).join('');
    return `
      <div class="form-group">
        <label>${req}</label>
        ${vaultDocs.length > 0 ? `
          <select name="req_${index}" required>
            <option value="">Select a document from your vault...</option>
            ${options}
          </select>
        ` : `
          <div class="text-danger bg-danger-light" style="font-size: 0.875rem; padding: 0.5rem; border-radius: 0.5rem;">
            No documents in vault. Please upload documents first.
          </div>
        `}
      </div>
    `;
  }).join('');

  const content = `
    <form id="apply-form">
      <input type="hidden" name="scholarshipId" value="${s.id}">
      <div class="form-group"><label>Full Name</label><input type="text" name="name" value="${system.currentUser?.name}" required minlength="2" maxlength="100"></div>
      <div class="form-group"><label>Age</label><input type="number" name="age" value="${system.currentUser?.age || ''}" required min="10" max="100"></div>
      <div class="form-group"><label>Level</label>
        <select name="level" required>
          <option value="High School" ${system.currentUser?.level === 'High School' ? 'selected' : ''}>High School</option>
          <option value="Undergraduate" ${system.currentUser?.level === 'Undergraduate' ? 'selected' : ''}>Undergraduate</option>
          <option value="Postgraduate" ${system.currentUser?.level === 'Postgraduate' ? 'selected' : ''}>Postgraduate</option>
        </select>
      </div>
      <div class="form-group"><label>Contact (Email or Phone)</label><input type="text" name="contact" value="${system.currentUser?.email}" required pattern="^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\[a-zA-Z]{2,}|09[0-9]{9})$" title="Please enter a valid email address or an 11-digit Philippine mobile number starting with 09"></div>
      <hr style="border: 0; border-top: 1px solid var(--color-border); margin: 1.5rem 0;">
      <h4 style="font-weight: 700; margin-bottom: 1rem;">Required Documents (From Vault)</h4>
      ${vaultDocs.length === 0 ? `
        <div style="margin-bottom: 1rem;">
          <button type="button" class="btn btn-outline" onclick="document.querySelector('.modal-overlay')?.remove(); window.system.setView('vault')">Go to Document Vault</button>
        </div>
      ` : ''}
      ${requirementInputs}
      <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;" ${vaultDocs.length === 0 ? 'disabled' : ''}>Submit Application</button>
    </form>
  `;
  system.showModal(`Apply for ${s.title}`, content);
  
  document.getElementById('apply-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const age = parseInt(formData.get('age') as string);
      
      const verification = system.performAutoVerification({
        name: formData.get('name') as string,
        age,
        level: formData.get('level') as string,
        contact: formData.get('contact') as string,
        fileName: 'document.pdf'
      }, s);

      const documents = s.requirements.map((req: string, index: number) => {
        const docId = formData.get(`req_${index}`) as string;
        const vaultDoc = vaultDocs.find((d: any) => d.id === docId);
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: `${req} - ${vaultDoc?.name || 'Unknown'}`,
          type: vaultDoc?.type || 'Requirement',
          status: vaultDoc?.status || 'Pending',
          url: vaultDoc?.url || '#',
          vaultDocId: vaultDoc?.id
        };
      });

      const newApp: any = {
        userId: system.currentUser!.id,
        scholarshipId: s.id,
        scholarshipTitle: s.title,
        name: formData.get('name') as string,
        age,
        level: formData.get('level') as string,
        gpa: system.currentUser!.gpa || 0,
        category: s.category,
        contact: formData.get('contact') as string,
        documents: documents,
        status: 'Pending',
        verificationScore: verification.score,
        verificationStatus: verification.status
      };

      await system.submitApplication(newApp);
      document.querySelector('.modal-overlay')?.remove();
    } catch (err) {
      // Error handled in system.submitApplication or via handleFirestoreError
    }
  });
}
