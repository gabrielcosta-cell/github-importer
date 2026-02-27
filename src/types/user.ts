export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sdr' | 'closer';
  createdAt: string;
  lastLogin?: string;
  photo?: string;
  isActive: boolean;
  department?: string;
  phone?: string;
  celebrationMusic?: string; // URL do áudio de celebração
  custom_role_id?: string; // ID da role customizada
}

export interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<boolean>;
  inviteUser: (email: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive'>) => void;
  removeUser: (userId: string) => void;
  activateUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
}