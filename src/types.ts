export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface Scholarship {
  id: string;
  title: string;
  description: string;
  category: string;
  amount: string;
  deadline: string;
  requirements: string[];
  tags: string[];
  minAge?: number;
  maxAge?: number;
  matchScore?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'applicant' | 'admin' | 'staff';
  password?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  age?: number;
  level?: string;
  gpa?: number;
  savedScholarships?: string[];
  notifications?: Notification[];
  vaultDocuments?: Document[];
  profile?: {
    age: number;
    level: string;
    contact: string;
    address: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  user?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Needs Revision';
  url: string;
  feedback?: string;
  vaultDocId?: string;
}

export interface ApplicationHistory {
  status: string;
  timestamp: number;
  note?: string;
}

export interface Application {
  id: string;
  userId: string;
  scholarshipId: string;
  name: string;
  age: number;
  level: string;
  gpa?: number;
  category: string;
  contact: string;
  fileName: string;
  documents: Document[];
  status: 'Pending' | 'Reviewing' | 'Needs Revision' | 'Interview Scheduled' | 'Approved' | 'Rejected';
  timestamp: number;
  adminNotes?: string;
  interviewDate?: number;
  verificationScore: number;
  verificationStatus: 'Passed' | 'Flagged' | 'Failed';
  history?: ApplicationHistory[];
}

export type View = 'landing' | 'login' | 'register' | 'dashboard' | 'scholarships' | 'profile' | 'admin-dashboard' | 'admin-reports' | 'admin-users' | 'admin-logs' | 'saved' | 'vault';
