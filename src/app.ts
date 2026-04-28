
import { Icons } from './icons';
import { 
  Notification, Scholarship, User, SystemLog, Document, 
  ApplicationHistory, Application, View 
} from './types';

import { 
  onAuthStateChanged, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, onSnapshot, query, where, orderBy, arrayUnion } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from './services/firebase';
import { translations } from './translations';

declare const Chart: any;

class ScholarshipSystem {
  private users: User[] = [];
  public currentUser: User | null = null;
  public applications: Application[] = [];
  private logs: SystemLog[] = [];
  private budget = { total: 1000000, utilized: 450000 };
  public scholarships: Scholarship[] = [];

  private currentView: View = 'landing';
  private appElement: HTMLElement;
  private searchQuery: string = '';
  private scholarshipSearch: string = '';
  private statusFilter: string = 'All';
  private amountFilter: string = 'All';
  private deadlineFilter: string = 'All';
  private adminCurrentPage: number = 1;
  private adminFilterStatus: string = 'All';
  private adminFilterScholarship: string = 'All';
  private toastContainer: HTMLElement;
  private charts: any[] = [];
  private isDarkMode: boolean = false;
  private isLoading: boolean = false;
  private unsubscribers: (() => void)[] = [];
  private language: 'en' | 'fil' = 'en';
  private isSidebarOpen: boolean = false;

  constructor() {
    this.appElement = document.getElementById('app')!;
    this.setupToastContainer();
    this.initFirebase();
    this.initDarkMode();
    this.render();
  }

  private initFirebase() {
    this.isLoading = true;
    
    // Check for redirect result (handles mobile login callback)
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect result error:', error);
      if (error.code === 'auth/internal-error' || error.message.includes('missing initial state')) {
        this.showToast('Login error: Please ensure you are not using Private/Incognito mode.', 'error');
      }
    });

    // Safety fallback: ensure loading is cleared if auth takes too long
    const authTimeout = setTimeout(() => {
      if (this.isLoading) {
        console.warn('Auth initialization timed out, clearing loading state.');
        this.isLoading = false;
        this.render();
      }
    }, 8000);

    // Auth Listener
    onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            this.currentUser = userDoc.data() as User;
            
            // Migration: Flatten profile to top level if it exists for backwards compatibility
            if (this.currentUser.profile) {
              this.currentUser = {
                ...this.currentUser,
                age: this.currentUser.age || this.currentUser.profile.age,
                level: this.currentUser.level || this.currentUser.profile.level,
                gpa: this.currentUser.gpa || this.currentUser.profile.gpa,
              };
            }
            
            // Sync existing data for first admin if not configured
            if (this.currentUser.email === 'forddinglasan.stats@gmail.com' && this.currentUser.role !== 'admin') {
               await this.makeAdmin(firebaseUser.uid);
            }
          } else {
            // Create initial profile for new Google user
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'New User',
              email: firebaseUser.email || '',
              role: 'applicant',
              savedScholarships: [],
              notifications: [],
              age: 18,
              level: 'Undergraduate',
              gpa: 0,
              phone: '',
              bio: '',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            this.currentUser = newUser;
          }

          this.setupRealtimeListeners();
          if (this.currentView === 'landing' || this.currentView === 'login' || this.currentView === 'register') {
            this.currentView = this.currentUser.role === 'admin' ? 'admin-dashboard' : 'dashboard';
          }
        } else {
          this.currentUser = null;
          this.cleanupListeners();
          if (this.currentView !== 'landing' && this.currentView !== 'login' && this.currentView !== 'register') {
            this.currentView = 'landing';
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
        this.showToast('Failed to connect to records. Please check your data connection.', 'error');
      } finally {
        clearTimeout(authTimeout);
        this.isLoading = false;
        this.render();
      }
    });
  }

  private async makeAdmin(uid: string) {
    await setDoc(doc(db, 'admins', uid), { active: true });
    await updateDoc(doc(db, 'users', uid), { role: 'admin' });
    if (this.currentUser) this.currentUser.role = 'admin';
  }

  private setupRealtimeListeners() {
    this.cleanupListeners();

    // Scholarships Listener
    const unsubScholarships = onSnapshot(collection(db, 'scholarships'), 
      (snapshot) => {
        this.scholarships = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Scholarship));
        this.render();
      },
      (error) => console.error('Scholarships listener error:', error)
    );
    this.unsubscribers.push(unsubScholarships);

    // Applications Listener
    if (this.currentUser) {
      const appsQuery = this.currentUser.role === 'admin' 
        ? collection(db, 'applications') 
        : query(collection(db, 'applications'), where('userId', '==', this.currentUser.id));
      
      const unsubApps = onSnapshot(appsQuery, 
        (snapshot) => {
          this.applications = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Application));
          this.render();
        },
        (error) => {
          console.error('Applications listener error:', error);
          if (error.code === 'permission-denied' && this.currentUser?.role === 'admin') {
            console.warn('Admin access not yet recognized, retrying with user filter...');
            // Optional: fallback logic
          }
        }
      );
      this.unsubscribers.push(unsubApps);

      // User Profile Listener
      const unsubUser = onSnapshot(doc(db, 'users', this.currentUser.id), 
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            let data = docSnapshot.data() as User;
            if (data.profile) {
              data = {
                ...data,
                age: data.age || data.profile.age,
                level: data.level || data.profile.level,
                gpa: data.gpa || data.profile.gpa,
              };
            }
            this.currentUser = data;
            this.render();
          }
        },
        (error) => console.error('User listener error:', error)
      );
      this.unsubscribers.push(unsubUser);
      
      // Notifications Listener
      const unsubNotes = onSnapshot(collection(db, 'users', this.currentUser.id, 'notifications'), 
        (snapshot) => {
          if (this.currentUser) {
            this.currentUser.notifications = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
            this.render();
          }
        },
        (error) => console.error('Notifications listener error:', error)
      );
      this.unsubscribers.push(unsubNotes);

      // Admin: Users Listener
      if (this.currentUser.role === 'admin') {
        const unsubUsers = onSnapshot(collection(db, 'users'), 
          (snapshot) => {
            this.users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
            this.render();
          },
          (error) => console.error('Users listener error:', error)
        );
        this.unsubscribers.push(unsubUsers);

        // Admin: Logs Listener
        // Note: logs collection must be configured in rules
        const unsubLogs = onSnapshot(query(collection(db, 'logs'), orderBy('timestamp', 'desc')), 
          (snapshot) => {
            this.logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SystemLog));
            this.render();
          },
          (error) => console.error('Logs listener error:', error)
        );
        this.unsubscribers.push(unsubLogs);
      }
    }
  }

  private cleanupListeners() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  public async loginWithGoogle() {
    try {
      this.isLoading = true;
      const provider = new GoogleAuthProvider();
      
      // Force account selection
      provider.setCustomParameters({ prompt: 'select_account' });

      // Use redirect for mobile to avoid popup issues
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        this.showToast('Please enable popups for this site.', 'error');
      } else {
        this.showToast('Login failed. Please check your connection.', 'error');
      }
    } finally {
      this.isLoading = false;
    }
  }

  private async logout() {
    await signOut(auth);
    this.currentView = 'landing';
    this.render();
  }

  public toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.render();
  }

  private initDarkMode() {
    const saved = localStorage.getItem('scholarship_dark_mode');
    this.isDarkMode = saved === 'true';
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }

  public toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
    localStorage.setItem('scholarship_dark_mode', this.isDarkMode.toString());
    this.render();
  }

  public toggleLanguage() {
    this.language = this.language === 'en' ? 'fil' : 'en';
    this.render();
  }

  public async withdrawApplication(id: string) {
    if (!confirm(this.t('Are you sure you want to withdraw this application?'))) return;
    try {
      await deleteDoc(doc(db, 'applications', id));
      this.showToast(this.t('Application withdrawn.'), 'info');
      this.addLog('warn', `Application ${id} withdrawn by user.`);
    } catch (e) {
      handleFirestoreError(e, 'update', `applications/${id}`);
    }
  }

  public t(key: string): string {
    return translations[key]?.[this.language] || key;
  }

  private setupToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'toast-container';
    document.body.appendChild(this.toastContainer);
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? Icons.checkCircle(18) : type === 'error' ? Icons.alertCircle(18) : Icons.info(18);
    toast.innerHTML = `<span style="display: flex; align-items: center;">${icon}</span><div style="flex: 1;">${message}</div>`;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  private async addLog(level: 'info' | 'warn' | 'error', message: string) {
    try {
      await addDoc(collection(db, 'logs'), {
        timestamp: Date.now(),
        level,
        message,
        user: this.currentUser?.name || 'System'
      });
    } catch (e) {
      console.error('Failed to add log:', e);
      this.logs.unshift({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        level,
        message,
        user: this.currentUser?.name || 'System'
      });
      if (this.logs.length > 100) this.logs.pop();
    }
  }

  private simulateLoading(callback: () => void) {
    this.isLoading = true;
    this.render();
    setTimeout(() => {
      this.isLoading = false;
      callback();
    }, 600);
  }

  public performAutoVerification(app: Partial<Application>, scholarship: Scholarship): { score: number, status: 'Passed' | 'Flagged' | 'Failed' } {
    let score = 0;
    
    // Age check
    if (scholarship.minAge && app.age! >= scholarship.minAge) score += 20;
    if (scholarship.maxAge && app.age! <= scholarship.maxAge) score += 20;
    
    // Level check - Exact match check
    if (app.level === scholarship.category || scholarship.title.includes(app.level || '')) {
      score += 20;
    } else if (app.level === 'Undergraduate') {
      score += 15;
    } else {
      score += 10;
    }

    // GPA check
    const gpaRequirement = scholarship.requirements.find(r => r.toLowerCase().includes('gpa'));
    if (gpaRequirement) {
      const minGpaMatch = gpaRequirement.match(/[0-9]\.[0-9]/);
      const minGpa = minGpaMatch ? parseFloat(minGpaMatch[0]) : 3.0;
      
      if (app.gpa && app.gpa >= minGpa) score += 30;
      else if (app.gpa && app.gpa >= minGpa - 0.5) score += 15;
    } else {
      score += 30; // Free points if GPA not specifically mentioned in requirements
    }

    // Data completeness
    if (app.name && app.contact && (app.documents && app.documents.length > 0)) score += 10;

    let status: 'Passed' | 'Flagged' | 'Failed' = 'Flagged';
    if (score >= 85) status = 'Passed';
    else if (score < 50) status = 'Failed';

    return { score, status };
  }

  public getSmartMatch(scholarshipId: string): { score: number, status: string } {
    if (!this.currentUser) return { score: 0, status: 'Failed' };

    const s = this.scholarships.find(sc => sc.id === scholarshipId);
    if (!s) return { score: 0, status: 'Failed' };

    return this.performAutoVerification({
      name: this.currentUser.name,
      age: this.currentUser.age || 18,
      level: this.currentUser.level || 'Undergraduate',
      gpa: this.currentUser.gpa || 3.0,
      contact: this.currentUser.email,
    }, s);
  }

  public calculateProfileCompleteness(): number {
    if (!this.currentUser) return 0;
    let points = 0;
    const total = 6;

    if (this.currentUser.name) points++;
    if (this.currentUser.age !== undefined) points++;
    if (this.currentUser.level) points++;
    if (this.currentUser.gpa !== undefined) points++;
    if (this.currentUser.email) points++;
    if (this.currentUser.vaultDocuments && this.currentUser.vaultDocuments.length > 0) points++;

    return Math.round((points / total) * 100);
  }

  public async toggleSaveScholarship(id: string) {
    if (!this.currentUser) return;
    const saved = this.currentUser.savedScholarships || [];
    const index = saved.indexOf(id);
    const newSaved = index === -1 ? [...saved, id] : saved.filter(sId => sId !== id);
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.id), { savedScholarships: newSaved });
      this.showToast(index === -1 ? 'Scholarship saved.' : 'Scholarship removed.', 'success');
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${this.currentUser.id}`);
    }
  }

  public exportToCSV() {
    if (this.applications.length === 0) {
      this.showToast('No data available to export.', 'info');
      return;
    }

    const headers = ['Applicant Name', 'Contact', 'Level', 'Scholarship', 'Status', 'Score', 'Verification', 'Application Date'];
    const rows = this.applications.map(app => [
      app.name,
      app.contact,
      app.level,
      this.scholarships.find(s => s.id === app.scholarshipId)?.title || 'Unknown',
      app.status,
      app.verificationScore,
      app.verificationStatus,
      new Date(app.timestamp).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Barangay_Scholarship_Data_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.addLog('info', 'Administrative data exported to CSV.');
    this.showToast('Data exported successfully!', 'success');
  }

  public async deleteScholarship(id: string) {
    if (!confirm('Are you sure you want to delete this scholarship?')) return;
    try {
      await deleteDoc(doc(db, 'scholarships', id));
      this.showToast('Scholarship deleted.', 'success');
    } catch (e) {
      handleFirestoreError(e, 'delete', `scholarships/${id}`);
    }
  }

  public async submitApplication(appData: any) {
    try {
      this.isLoading = true;
      const docRef = await addDoc(collection(db, 'applications'), {
        ...appData,
        submittedAt: new Date().toISOString(),
        timestamp: Date.now()
      });
      this.showToast('Application submitted successfully!', 'success');
      this.setView('dashboard');
      return docRef.id;
    } catch (e) {
      handleFirestoreError(e, 'create', 'applications');
    } finally {
      this.isLoading = false;
    }
  }

  private async addNotification(userId: string, title: string, message: string) {
    try {
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('Failed to add notification:', e);
    }
  }

  public async updateApplicationStatus(id: string, status: string, note?: string) {
    try {
      const appRef = doc(db, 'applications', id);
      const appDoc = await getDoc(appRef);
      if (!appDoc.exists()) return;
      const app = appDoc.data() as Application;

      const historyItem = { 
        status, 
        timestamp: Date.now(), 
        note: note || `Application ${status.toLowerCase()} by admin.` 
      };

      await updateDoc(appRef, {
        status,
        history: arrayUnion(historyItem),
        updatedAt: new Date().toISOString()
      });

      this.addNotification(app.userId, `Application ${status}`, `Your application for ${app.category} has been ${status.toLowerCase()}.`);
      this.showToast(`Application ${status.toLowerCase()} successfully.`, 'success');
    } catch (e) {
      handleFirestoreError(e, 'update', `applications/${id}`);
    }
  }

  public async saveAdminNote(id: string, note: string) {
    try {
      const appRef = doc(db, 'applications', id);
      const historyItem = { 
        status: 'Admin Note', 
        timestamp: Date.now(), 
        note: `Admin added a note: ${note}` 
      };

      await updateDoc(appRef, {
        adminNotes: note,
        history: arrayUnion(historyItem)
      });

      this.showToast('Note saved successfully.', 'success');
    } catch (e) {
      handleFirestoreError(e, 'update', `applications/${id}`);
    }
  }

  public setView(view: View) {
    this.isSidebarOpen = false; // Close sidebar on mobile navigation
    this.simulateLoading(() => {
      this.currentView = view;
      this.render();
    });
  }

  public setAdminStatusFilter(status: string) {
    this.adminFilterStatus = status;
    this.adminCurrentPage = 1;
    this.render();
  }

  public changeAdminPage(delta: number) {
    this.adminCurrentPage += delta;
    this.render();
  }

  private async render() {
    try {
      this.appElement.innerHTML = '';
      
      if (this.currentView === 'landing') {
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.minHeight = '100vh';
        this.appElement.appendChild(wrapper);
        await this.renderLanding(wrapper);
        return;
      }

    if (this.currentView === 'login' || this.currentView === 'register') {
      const authWrapper = document.createElement('div');
      authWrapper.style.width = '100%';
      authWrapper.style.minHeight = '100vh';
      this.appElement.appendChild(authWrapper);
      if (this.currentView === 'login') this.renderLogin(authWrapper);
      else this.renderRegister(authWrapper);
      return;
    }

    this.renderSidebar();
    
    const main = document.createElement('main');
    main.className = 'main-content';
    this.appElement.appendChild(main);

    if (this.isLoading) {
      this.renderSkeleton(main);
      return;
    }

    this.renderTopBar(main);

    const viewContainer = document.createElement('div');
    viewContainer.id = 'view-container';
    main.appendChild(viewContainer);

    switch (this.currentView) {
      case 'dashboard': this.renderApplicantDashboard(viewContainer); break;
      case 'scholarships': this.renderScholarshipCatalog(viewContainer); break;
      case 'saved': this.renderSavedScholarships(viewContainer); break;
      case 'profile': this.renderProfile(viewContainer); break;
      case 'admin-dashboard': this.renderAdminDashboard(viewContainer); break;
      case 'admin-reports': this.renderAdminReports(viewContainer); break;
      case 'admin-users': this.renderAdminUsers(viewContainer); break;
      case 'admin-logs': this.renderAdminLogs(viewContainer); break;
      case 'vault': this.renderVault(viewContainer); break;
    }
    } catch (error) {
      console.error('Critical Render Error:', error);
      this.showToast('Something went wrong. Please refresh the page.', 'error');
    }
  }

  private renderSidebar() {
    const sidebar = document.createElement('aside');
    sidebar.className = `sidebar ${this.isSidebarOpen ? 'open' : ''}`;
    const role = this.currentUser?.role;

    sidebar.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3rem; padding: 0 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="https://i.imgur.com/blEiGra.jpeg" alt="SmartScholar Logo" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover; box-shadow: var(--shadow-sm);" referrerPolicy="no-referrer" />
          <span class="sidebar-text" style="font-weight: 700; font-size: 1.125rem; color: var(--color-primary);">SmartScholar</span>
        </div>
        <button class="mobile-menu-close" onclick="window.system.toggleSidebar()" style="background: none; border: none; color: var(--color-secondary); cursor: pointer;">
          ${Icons.x(24)}
        </button>
      </div>
      
      <nav style="flex: 1;">
        ${role === 'admin' ? `
          <div class="nav-item ${this.currentView === 'admin-dashboard' ? 'active' : ''}" onclick="window.system.setView('admin-dashboard')">
            ${Icons.home(20)} <span class="sidebar-text">${this.t('Applications')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'scholarships' ? 'active' : ''}" onclick="window.system.setView('scholarships')">
            ${Icons.scholarship(20)} <span class="sidebar-text">${this.t('Programs')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'admin-reports' ? 'active' : ''}" onclick="window.system.setView('admin-reports')">
            ${Icons.chart(20)} <span class="sidebar-text">${this.t('Reports')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'admin-users' ? 'active' : ''}" onclick="window.system.setView('admin-users')">
            ${Icons.users(20)} <span class="sidebar-text">${this.t('User Management')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'admin-logs' ? 'active' : ''}" onclick="window.system.setView('admin-logs')">
            ${Icons.terminal(20)} <span class="sidebar-text">${this.t('System Logs')}</span>
          </div>
        ` : role === 'staff' ? `
          <div class="nav-item ${this.currentView === 'admin-dashboard' ? 'active' : ''}" onclick="window.system.setView('admin-dashboard')">
            ${Icons.home(20)} <span class="sidebar-text">${this.t('Applications')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'vault' ? 'active' : ''}" onclick="window.system.setView('vault')">
            ${Icons.database(20)} <span class="sidebar-text">${this.t('Document Vault')}</span>
          </div>
        ` : `
          <div class="nav-item ${this.currentView === 'dashboard' ? 'active' : ''}" onclick="window.system.setView('dashboard')">
            ${Icons.home(20)} <span class="sidebar-text">${this.t('Dashboard')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'scholarships' ? 'active' : ''}" onclick="window.system.setView('scholarships')">
            ${Icons.scholarship(20)} <span class="sidebar-text">${this.t('Scholarships')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'saved' ? 'active' : ''}" onclick="window.system.setView('saved')">
            ${Icons.bookmark(20)} <span class="sidebar-text">${this.t('Saved')}</span>
          </div>
          <div class="nav-item ${this.currentView === 'vault' ? 'active' : ''}" onclick="window.system.setView('vault')">
            ${Icons.fileText(20)} <span class="sidebar-text">${this.t('My Documents')}</span>
          </div>
        `}
        <div class="nav-item ${this.currentView === 'profile' ? 'active' : ''}" onclick="window.system.setView('profile')">
          ${Icons.user(20)} <span class="sidebar-text">${this.t('Profile')}</span>
        </div>
        <div class="nav-item" onclick="window.system.showAbout()">
          ${Icons.info(20)} <span class="sidebar-text">${this.t('About Portal')}</span>
        </div>
      </nav>

      <div style="margin-top: auto; padding-top: 2rem; border-top: 1px solid var(--color-border);">
        <div class="nav-item" onclick="window.system.logout()">
          ${Icons.logout(20)} <span class="sidebar-text">${this.t('Sign Out')}</span>
        </div>
      </div>
    `;
    this.appElement.appendChild(sidebar);
  }

  private renderTopBar(parent: HTMLElement) {
    if (!this.currentUser) return;
    const topBar = document.createElement('div');
    topBar.className = 'header';
    const unreadCount = this.currentUser?.notifications?.filter(n => !n.read).length || 0;

    topBar.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <button class="mobile-menu-btn" onclick="window.system.toggleSidebar()" style="background: none; border: none; color: var(--color-text); cursor: pointer; display: none;">
          ${Icons.menu(24)}
        </button>
        <h2 style="font-size: 1.25rem; font-weight: 700;">${this.t(this.getViewTitle())}</h2>
      </div>
      <div style="display: flex; align-items: center; gap: 1.5rem;">
        <button class="btn btn-outline" onclick="window.system.toggleLanguage()" style="padding: 0 0.5rem; height: 40px; border-radius: 20px; font-weight: 600; font-size: 0.875rem;">
          ${this.language === 'en' ? 'EN' : 'FIL'}
        </button>
        <button class="btn btn-outline" onclick="window.system.toggleDarkMode()" style="padding: 0; width: 40px; height: 40px; border-radius: 50%;">
          ${this.isDarkMode ? Icons.sun(20) : Icons.moon(20)}
        </button>
        <div style="position: relative; cursor: pointer; display: flex; align-items: center;" onclick="window.system.showNotifications()">
          ${Icons.bell(24)}
          ${unreadCount > 0 ? `<span style="position: absolute; top: -5px; right: -5px; background: var(--color-danger); color: white; font-size: 0.625rem; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">${unreadCount}</span>` : ''}
        </div>
        <div class="avatar-group">
          <div class="avatar">${this.currentUser?.name.charAt(0)}</div>
          <div class="sidebar-text">
            <div style="font-weight: 600; font-size: 0.875rem;">${this.currentUser?.name}</div>
            <div style="font-size: 0.75rem; color: var(--color-secondary);">${this.currentUser?.role}</div>
          </div>
        </div>
      </div>
    `;
    parent.appendChild(topBar);
  }

  private getViewTitle() {
    switch (this.currentView) {
      case 'dashboard': return 'My Applications';
      case 'scholarships': return 'Scholarship Catalog';
      case 'saved': return 'Saved Scholarships';
      case 'profile': return 'Account Settings';
      case 'admin-dashboard': return 'Admin Overview';
      case 'admin-reports': return 'Data-Driven Reports';
      default: return 'Dashboard';
    }
  }

  private renderSkeleton(parent: HTMLElement) {
    const skeleton = document.createElement('div');
    skeleton.className = 'main-content';
    skeleton.innerHTML = `
      <div class="skeleton" style="height: 60px; margin-bottom: 2rem;"></div>
      <div class="stats-grid">
        <div class="skeleton" style="height: 120px;"></div>
        <div class="skeleton" style="height: 120px;"></div>
        <div class="skeleton" style="height: 120px;"></div>
      </div>
      <div class="skeleton" style="height: 400px;"></div>
    `;
    parent.appendChild(skeleton);
  }

  private async renderWithProgress(parent: HTMLElement, importFn: () => Promise<any>, renderCallback: (module: any) => void) {
    const progress = document.createElement('div');
    progress.className = 'loading-progress';
    document.body.appendChild(progress);
    this.renderSkeleton(parent);

    try {
      const module = await importFn();
      parent.innerHTML = '';
      renderCallback(module);
    } catch (e) {
      console.error('View load error:', e);
      this.showToast(this.t('Failed to load view. Please check your connection.'), 'error');
    } finally {
      progress.remove();
    }
  }

  private async renderLanding(parent: HTMLElement) {
    const { renderLanding } = await import('./views/LandingView');
    renderLanding(parent);
  }

  private async renderLogin(parent: HTMLElement) {
    const { renderLogin } = await import('./views/AuthView');
    renderLogin(parent, this);
  }

  private async renderRegister(parent: HTMLElement) {
    const { renderRegister } = await import('./views/AuthView');
    renderRegister(parent, this);
  }

  private async renderScholarshipCatalog(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/ApplicantView'), (m) => m.renderScholarshipCatalog(parent, this));
  }

  public async smartApply(scholarshipId: string) {
    if (!this.currentUser) {
      this.showToast(this.t('Please sign in to apply.'), 'error');
      return;
    }
    
    console.log('Initiating Smart Apply for scholarship:', scholarshipId);
    
    const s = this.scholarships.find(sc => sc.id === scholarshipId);
    if (!s) {
      console.error('Scholarship not found:', scholarshipId);
      this.showToast('Scholarship data missing.', 'error');
      return;
    }

    if (this.applications.some(a => a.userId === this.currentUser!.id && a.scholarshipId === scholarshipId)) {
      this.showToast(this.t('You have already applied for this scholarship.'), 'error');
      return;
    }

    try {
      const verification = this.performAutoVerification({
        name: this.currentUser.name,
        age: this.currentUser.age || this.currentUser.profile?.age || 18, 
        level: this.currentUser.level || this.currentUser.profile?.level || 'Undergraduate',
        gpa: this.currentUser.gpa || this.currentUser.profile?.gpa || 3.0,
        contact: this.currentUser.email,
      }, s);

      const documents = s.requirements.map((req) => {
        const vaultDocs = this.currentUser!.vaultDocuments || [];
        const bestMatch = vaultDocs.find(d => 
          d.name.toLowerCase().includes(req.toLowerCase()) || 
          d.type.toLowerCase().includes(req.toLowerCase())
        );

        return {
          id: Math.random().toString(36).substr(2, 9),
          name: req + (bestMatch ? ` (${bestMatch.name})` : ' (Auto-filled)'),
          type: bestMatch ? bestMatch.type : 'Requirement',
          status: bestMatch ? bestMatch.status : 'Pending' as const,
          url: bestMatch ? bestMatch.url : '#',
          vaultDocId: bestMatch ? bestMatch.id : undefined,
          uploadedAt: new Date().toISOString()
        };
      });

      const payload = {
        userId: this.currentUser.id,
        scholarshipId: s.id,
        scholarshipTitle: s.title,
        name: this.currentUser.name,
        age: this.currentUser.age || this.currentUser.profile?.age || 18,
        level: this.currentUser.level || this.currentUser.profile?.level || 'Undergraduate',
        category: s.category,
        contact: this.currentUser.email,
        documents: documents,
        status: 'Pending',
        submittedAt: new Date().toISOString(),
        timestamp: Date.now(),
        verificationScore: verification.score,
        verificationStatus: verification.status
      };

      console.log('Submitting Smart Apply payload:', payload);
      await addDoc(collection(db, 'applications'), payload);
      
      this.addLog('info', `Smart Application submitted by ${this.currentUser.name} for ${s.title}.`);
      this.showToast(this.t('Application submitted successfully!'), 'success');
      this.setView('dashboard');
    } catch (e) {
      console.error('Smart Apply failed:', e);
      if (e instanceof Error && e.message.includes('permission-denied')) {
        handleFirestoreError(e, 'create', 'applications');
      } else {
        this.showToast('Failed to submit application. Please try again.', 'error');
      }
    }
  }

  public async scheduleInterview(appId: string, interviewDate: string, adminNotes: string) {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'Interview Scheduled',
        interviewDate,
        adminNotes,
        updatedAt: new Date().toISOString()
      });
      this.addLog('info', `Interview scheduled for application ${appId} on ${interviewDate}`);
      this.showToast(this.t('Interview scheduled successfully!'), 'success');
    } catch (e) {
      handleFirestoreError(e, 'update', `applications/${appId}`);
    }
  }

  private async renderSavedScholarships(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/ApplicantView'), (m) => m.renderSavedScholarships(parent, this));
  }

  private async renderApplicantDashboard(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/ApplicantView'), (m) => m.renderApplicantDashboard(parent, this));
  }

  private async renderAdminDashboard(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/AdminView'), (m) => m.renderAdminDashboard(parent, this));
  }

  private async renderAdminReports(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/AdminView'), (m) => m.renderAdminReports(parent, this, Chart));
  }

  private async renderAdminUsers(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/AdminView'), (m) => m.renderAdminUsers(parent, this));
  }

  private async renderAdminLogs(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/AdminView'), (m) => m.renderAdminLogs(parent, this));
  }

  private async renderVault(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/DocumentVaultView'), (m) => m.renderVault(parent, this));
  }

  public async openUploadDocumentModal() {
    const { openUploadDocumentModal } = await import('./views/Modals');
    openUploadDocumentModal(this);
  }

  public async deleteVaultDocument(id: string) {
    if (!this.currentUser || !this.currentUser.vaultDocuments) return;
    try {
      const newVault = this.currentUser.vaultDocuments.filter(d => d.id !== id);
      await updateDoc(doc(db, 'users', this.currentUser.id), { vaultDocuments: newVault });
      this.showToast('Document removed from vault.', 'info');
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${this.currentUser.id}`);
    }
  }

  public triggerBackup() {
    this.addLog('info', 'System backup initiated manually.');
    const backupData = {
      scholarships: this.scholarships,
      applications: this.applications,
      logs: this.logs,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Barangay_Scholarship_Backup_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.showToast('System backup data dump downloaded successfully.', 'success');
  }

  public async editUserRole(id: string) {
    const { editUserRole } = await import('./views/Modals');
    editUserRole(this, id);
  }

  public async saveUserRole(id: string, role: string) {
    try {
      await updateDoc(doc(db, 'users', id), { role });
      if (role === 'admin') {
        await setDoc(doc(db, 'admins', id), { active: true });
      } else {
        await deleteDoc(doc(db, 'admins', id));
      }
      this.addLog('warn', `User role of ${id} updated to ${role}.`);
      this.showToast('User role updated.', 'success');
      document.querySelector('.modal-overlay')?.remove();
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${id}`);
    }
  }

  public async bulkUpdateStatus(status: string) {
    const checkboxes = document.querySelectorAll('.app-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id).filter(id => id);
    
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to update ${ids.length} applications to ${status}?`)) return;

    try {
      this.isLoading = true;
      for (const id of ids) {
        await this.updateApplicationStatus(id!, status);
      }
      this.addLog('warn', `Bulk status update performed: ${ids.length} apps set to ${status}.`);
      this.showToast(`Batch update successful: ${ids.length} applications ${status.toLowerCase()}.`, 'success');
    } catch (e) {
      this.showToast('Batch update failed partially. Check logs.', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  private async renderProfile(parent: HTMLElement) {
    this.renderWithProgress(parent, () => import('./views/ApplicantView'), (m) => m.renderProfile(parent, this));
  }

  public async updateProfile(data: any) {
    if (!this.currentUser) return;
    try {
      this.isLoading = true;
      const userRef = doc(db, 'users', this.currentUser.id);
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      this.currentUser = { ...this.currentUser, ...data };
      this.addLog('info', 'User profile updated.');
      this.showToast('Profile updated successfully.', 'success');
      this.render();
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${this.currentUser.id}`);
    } finally {
      this.isLoading = false;
    }
  }

  // Fallback for legacy view calls
  public async saveUsers() {
    console.warn('saveUsers is deprecated. Use updateProfile or specific Firestore updates.');
  }

  public async showNotifications() {
    const notes = this.currentUser?.notifications || [];
    const content = notes.length === 0 ? '<p>No notifications yet.</p>' : `
      <div style="display: grid; gap: 1rem;">
        ${notes.map(n => `
          <div style="padding: 1rem; background: var(--color-bg); border-radius: 0.75rem; border-left: 4px solid ${n.read ? 'var(--color-border)' : 'var(--color-primary)'};">
            <div style="font-weight: 700; font-size: 0.875rem;">${n.title}</div>
            <div style="font-size: 0.75rem; color: var(--color-secondary); margin-bottom: 0.25rem;">${n.message}</div>
            <div style="font-size: 0.625rem; color: var(--color-secondary);">${new Date(n.timestamp).toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    `;
    this.showModal('Notifications', content);
    
    if (this.currentUser) {
      const unreadNotes = notes.filter(n => !n.read);
      for (const note of unreadNotes) {
        await updateDoc(doc(db, 'users', this.currentUser.id, 'notifications', note.id), { read: true });
      }
    }
  }

  public async exportToPDF(appId: string) {
    const element = document.getElementById('application-details-content');
    if (!element) return;
    
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
      this.showToast('PDF Export tool is still loading. Please try again in a few seconds.', 'info');
      return;
    }

    this.showToast('Generating PDF...', 'info');
    const opt = {
      margin: 10,
      filename: `application-${appId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      await html2pdf().from(element).set(opt).save();
      this.showToast('PDF generated successfully!', 'success');
    } catch (e) {
      console.error('PDF export error:', e);
      this.showToast('Failed to generate PDF.', 'error');
    }
  }

  public showAbout() {
    const content = `
      <div style="line-height: 1.6; color: var(--color-secondary);">
        <p style="margin-bottom: 1rem;">This intelligent web-based platform manages the entire financial assistance and scholarship program workflow for our Barangay.</p>
        <p style="margin-bottom: 1rem;">Candidates can register, complete application forms, upload supporting materials, and track the progress of their submissions without visiting the barangay hall.</p>
        <p style="margin-bottom: 1rem;">The system features real-time notifications, automated eligibility screening, secure document management, and data analytics for program performance reporting.</p>
        <div style="background: var(--color-bg); padding: 1rem; border-radius: 0.75rem; margin-top: 1rem;">
          <h4 style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.5rem;">Key Benefits:</h4>
          <ul style="padding-left: 1.25rem; font-size: 0.875rem;">
            <li>Zero-contact application process</li>
            <li>Real-time status tracking</li>
            <li>Automated eligibility verification</li>
            <li>Secure digital record keeping</li>
          </ul>
        </div>
      </div>
    `;
    this.showModal('About the Barangay Portal', content);
  }

  private showModal(title: string, content: string) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close">${Icons.x(20)}</button>
        <h2 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 1.5rem;">${title}</h2>
        <div>${content}</div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
  }

  public viewDetails(id: string) {
    const app = this.applications.find(a => a.id === id);
    if (!app) return;
    const scholarship = this.scholarships.find(s => s.id === app.scholarshipId);
    const isAdmin = this.currentUser?.role === 'admin' || this.currentUser?.role === 'staff';

    const steps = [
      { id: 'submitted', label: 'Submitted', active: true },
      { id: 'review', label: 'Under Review', active: app.status !== 'Pending' },
      { id: 'interview', label: 'Interview', active: !!app.interviewDate || app.status === 'Approved' },
      { id: 'decision', label: 'Decision', active: app.status === 'Approved' || app.status === 'Rejected' }
    ];

    const trackerHTML = `
      <div style="display: flex; justify-content: space-between; position: relative; margin-bottom: 2rem; padding: 0 1rem;">
        <div style="position: absolute; top: 12px; left: 2rem; right: 2rem; height: 2px; background: var(--color-border); z-index: 0;"></div>
        ${steps.map((step) => `
          <div style="position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${step.active ? 'var(--color-primary)' : 'var(--color-bg)'}; border: 2px solid ${step.active ? 'var(--color-primary)' : 'var(--color-border)'}; color: white; display: flex; align-items: center; justify-content: center;">
              ${step.active ? Icons.check(14) : ''}
            </div>
            <span style="font-size: 0.75rem; font-weight: 600; color: ${step.active ? 'var(--color-text)' : 'var(--color-secondary)'};">${step.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    const docsHTML = app.documents.map(doc => `
      <div class="${doc.status === 'Needs Revision' ? 'bg-danger-light' : ''}" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 0.5rem; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${Icons.fileText(20)}
          <div>
            <div style="font-weight: 600; font-size: 0.875rem;">${doc.name}</div>
            ${doc.feedback ? `<div class="text-danger" style="font-size: 0.75rem; margin-top: 0.25rem;">Feedback: ${doc.feedback}</div>` : ''}
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge ${doc.status === 'Approved' ? 'badge-success' : doc.status === 'Needs Revision' ? 'badge-danger' : 'badge-warning'}">${doc.status}</span>
          ${isAdmin && doc.status !== 'Approved' ? `
            <button class="btn btn-outline btn-sm" onclick="window.system.flagDocument('${app.id}', '${doc.id}')">Flag</button>
            <button class="btn btn-primary btn-sm" onclick="window.system.approveDocumentInApp('${app.id}', '${doc.id}')">${Icons.check(14)}</button>
          ` : ''}
          ${!isAdmin && doc.status === 'Needs Revision' ? `
            <button class="btn btn-primary btn-sm" onclick="window.system.promptReplaceDocument('${app.id}', '${doc.id}')">Replace</button>
          ` : ''}
        </div>
      </div>
    `).join('');

    const historyHTML = (app.history || []).map(h => `
      <div style="display: flex; gap: 1rem; margin-bottom: 1rem; position: relative;">
        <div style="width: 2px; background: var(--color-border); position: absolute; left: 5px; top: 15px; bottom: -15px; z-index: 0;"></div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background: var(--color-primary); position: relative; z-index: 1; margin-top: 4px;"></div>
        <div>
          <div style="font-weight: 600; font-size: 0.875rem;">${h.status}</div>
          <div style="font-size: 0.75rem; color: var(--color-secondary);">${new Date(h.timestamp).toLocaleString()}</div>
          ${h.note ? `<div style="font-size: 0.875rem; margin-top: 0.25rem; background: var(--color-bg); padding: 0.5rem; border-radius: 0.5rem;">${h.note}</div>` : ''}
        </div>
      </div>
    `).join('');

    const content = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
        <button class="btn btn-outline btn-sm" onclick="window.system.exportToPDF('${app.id}')">${Icons.download(16)} Export PDF</button>
      </div>
      <div id="application-details-content" style="padding: 1rem; background: var(--color-bg); border-radius: 0.5rem;">
        <div style="display: grid; gap: 1.5rem;">
          ${trackerHTML}
          
          <div style="background: var(--color-bg); padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--color-border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><strong>Applicant:</strong> <span>${app.name}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><strong>Scholarship:</strong> <span>${scholarship?.title}</span></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><strong>Status:</strong> <span class="status-badge status-${app.status.toLowerCase().replace(' ', '-')}">${app.status}</span></div>
            ${app.interviewDate ? `<div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--color-primary); font-weight: 600;"><strong>Interview:</strong> <span>${new Date(app.interviewDate).toLocaleString()}</span></div>` : ''}
          </div>

          <div>
            <h4 style="font-weight: 700; margin-bottom: 1rem;">Documents</h4>
            ${docsHTML}
          </div>

          <div style="padding-top: 1.5rem; border-top: 1px solid var(--color-border);">
            <h4 style="font-weight: 700; margin-bottom: 1rem;">Application History</h4>
            <div style="padding-left: 0.5rem;">
              ${historyHTML}
            </div>
          </div>

          ${isAdmin ? `
            <div style="padding-top: 1.5rem; border-top: 1px solid var(--color-border);" data-html2canvas-ignore>
              <h4 style="font-weight: 700; margin-bottom: 1rem;">Admin Actions</h4>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <button class="btn btn-outline btn-sm" onclick="window.system.promptScheduleInterview('${app.id}')">${Icons.calendar(16)} Schedule Interview</button>
                <button class="btn btn-approve btn-sm" onclick="window.system.updateApplicationStatus('${app.id}', 'Approved')">${Icons.check(16)} Approve</button>
                <button class="btn btn-reject btn-sm" onclick="window.system.updateApplicationStatus('${app.id}', 'Rejected')">${Icons.x(16)} Reject</button>
              </div>
              <textarea id="admin-note-input" style="width: 100%;" placeholder="Add internal notes...">${app.adminNotes || ''}</textarea>
              <button class="btn btn-primary btn-sm" style="width: 100%; margin-top: 0.5rem;" onclick="window.system.saveAdminNote('${app.id}', (document.getElementById('admin-note-input') as HTMLTextAreaElement).value)">Save Note</button>
            </div>
          ` : `
            ${app.adminNotes ? `
              <div style="padding-top: 1.5rem; border-top: 1px solid var(--color-border);">
                <h4 style="font-weight: 700; margin-bottom: 0.5rem;">Admin Feedback</h4>
                <p style="font-style: italic; color: var(--color-secondary);">${app.adminNotes}</p>
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `;
    this.showModal('Application Details', content);
  }

  public async approveDocumentInApp(appId: string, docId: string) {
    try {
      const appRef = doc(db, 'applications', appId);
      const appDoc = await getDoc(appRef);
      if (!appDoc.exists()) return;
      const app = appDoc.data() as Application;
      
      const newDocuments = app.documents.map(d => {
        if (d.id === docId) {
          return { ...d, status: 'Approved' };
        }
        return d;
      });

      await updateDoc(appRef, {
        documents: newDocuments,
        updatedAt: new Date().toISOString()
      });

      this.showToast('Document approved.', 'success');
      document.querySelector('.modal-overlay')?.remove();
    } catch (e) {
      handleFirestoreError(e, 'update', `applications/${appId}`);
    }
  }

  public async promptScheduleInterview(appId: string) {
    this.openScheduleInterviewModal(appId);
  }

  public async flagDocument(appId: string, docId: string) {
    const feedback = prompt('Enter reason for revision (e.g., "ID is blurry"):');
    if (feedback) {
      try {
        const appRef = doc(db, 'applications', appId);
        const appDoc = await getDoc(appRef);
        if (!appDoc.exists()) return;
        const app = appDoc.data() as Application;
        
        const newDocuments = app.documents.map(d => {
          if (d.id === docId) {
            return { ...d, status: 'Needs Revision', feedback };
          }
          return d;
        });

        const historyItem = { 
          status: 'Needs Revision', 
          timestamp: Date.now(), 
          note: `Document flagged: ${feedback}` 
        };

        await updateDoc(appRef, {
          documents: newDocuments,
          status: 'Needs Revision',
          history: arrayUnion(historyItem),
          updatedAt: new Date().toISOString()
        });

        this.addNotification(app.userId, 'Document Needs Revision', `A document in your application requires attention: ${feedback}`);
        this.showToast('Document flagged for revision.', 'info');
        document.querySelector('.modal-overlay')?.remove();
      } catch (e) {
        handleFirestoreError(e, 'update', `applications/${appId}`);
      }
    }
  }

  public promptReplaceDocument(appId: string, docId: string) {
    const vaultDocs = this.currentUser?.vaultDocuments || [];
    if (vaultDocs.length === 0) {
      this.showToast('Your vault is empty. Please upload documents first.', 'error');
      document.querySelector('.modal-overlay')?.remove();
      this.setView('vault');
      return;
    }

    const options = vaultDocs.map(d => `<option value="${d.id}">${d.name} (${d.type})</option>`).join('');
    const content = `
      <div id="replace-doc-container">
        <div class="form-group">
          <label>Select Replacement Document from Vault</label>
          <select id="replacement-doc-select">
            ${options}
          </select>
        </div>
        <button id="execute-replace-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Replace Document</button>
      </div>
    `;
    this.showModal('Replace Document', content);

    const btn = document.getElementById('execute-replace-btn');
    const select = document.getElementById('replacement-doc-select') as HTMLSelectElement;
    if (btn && select) {
      btn.addEventListener('click', () => {
        this.executeReplaceDocument(appId, docId, select.value);
      });
    }
  }

  public async executeReplaceDocument(appId: string, oldDocId: string, newVaultDocId: string) {
    try {
      const appRef = doc(db, 'applications', appId);
      const appDoc = await getDoc(appRef);
      if (!appDoc.exists()) return;
      const app = appDoc.data() as Application;
      const vaultDoc = this.currentUser?.vaultDocuments?.find(d => d.id === newVaultDocId);
      
      if (vaultDoc) {
        const docIndex = app.documents.findIndex(d => d.id === oldDocId);
        if (docIndex !== -1) {
          const newDoc = {
            id: Math.random().toString(36).substr(2, 9),
            name: `${app.documents[docIndex].name.split(' - ')[0]} - ${vaultDoc.name}`,
            type: vaultDoc.type,
            status: vaultDoc.status || 'Pending',
            url: vaultDoc.url,
            vaultDocId: vaultDoc.id
          };
          
          const newDocuments = [...app.documents];
          newDocuments[docIndex] = newDoc;

          const newStatus = newDocuments.some(d => d.status === 'Needs Revision') ? app.status : 'Reviewing';
          const historyItem = { 
            status: newStatus, 
            timestamp: Date.now(), 
            note: `Document replaced with "${vaultDoc.name}".` 
          };

          await updateDoc(appRef, {
            documents: newDocuments,
            status: newStatus,
            history: arrayUnion(historyItem),
            updatedAt: new Date().toISOString()
          });
          
          this.showToast('Document replaced successfully.', 'success');
          document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        }
      }
    } catch (e) {
      handleFirestoreError(e, 'update', `applications/${appId}`);
    }
  }

  public async openEditScholarshipModal(id: string) {
    const { openEditScholarshipModal } = await import('./views/Modals');
    openEditScholarshipModal(this, id);
  }

  public async openCreateScholarshipModal() {
    const { openCreateScholarshipModal } = await import('./views/Modals');
    openCreateScholarshipModal(this);
  }

  public async openApplyModal(scholarshipId: string) {
    const { openApplyModal } = await import('./views/Modals');
    openApplyModal(this, scholarshipId);
  }

  public async openScheduleInterviewModal(appId: string) {
    const { openScheduleInterviewModal } = await import('./views/Modals');
    openScheduleInterviewModal(this, appId);
  }
}

const system = new ScholarshipSystem();
(window as any).system = system;
