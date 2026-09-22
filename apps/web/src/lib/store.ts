import { create } from 'zustand';
import { apiRequest } from './api';

export interface UserPersona {
  id: string;
  name: string;
  phone: string;
  role: string;
  facilityId?: string | null;
  facility?: any;
  donorProfile?: any;
  language?: string;
}

export interface RoleCredential {
  role: string;
  roleTitle: string;
  category: 'clinics' | 'blood' | 'logistics' | 'governance' | 'donor';
  facilityName: string;
  scopeDescription: string;
  phone: string;
  password: string;
  primaryRoute: string;
}

export const DEMO_ROLE_CREDENTIALS: RoleCredential[] = [
  {
    role: 'FACILITY_ADMIN',
    roleTitle: 'Facility Admin (Urban PHC)',
    category: 'clinics',
    facilityName: 'NMMC Urban Health Centre (Nerul, Navi Mumbai)',
    scopeDescription: 'Critical shortage scenario (Oxygen Concentrators = 0). Broadcasts urgent peer borrow requests.',
    phone: '9820011001',
    password: 'demo1234',
    primaryRoute: '/dashboard',
  },
  {
    role: 'FACILITY_ADMIN',
    roleTitle: 'Facility Admin (Medical College Hospital)',
    category: 'clinics',
    facilityName: 'Dr. D.Y. Patil Medical Hospital (Nerul, Navi Mumbai)',
    scopeDescription: 'Surplus provider hub. Evaluates incoming emergency requests with explainable triage scores.',
    phone: '9820011002',
    password: 'demo1234',
    primaryRoute: '/dashboard',
  },
  {
    role: 'BLOOD_BANK',
    roleTitle: 'Blood Bank Officer',
    category: 'blood',
    facilityName: 'Navi Mumbai Municipal Blood Centre (Vashi)',
    scopeDescription: 'Manages 8x4 blood matrix inventory, PRBC/Plasma compatibility, and 48-hour FEFO expiry sweeps.',
    phone: '9820011003',
    password: 'demo1234',
    primaryRoute: '/blood',
  },
  {
    role: 'DONOR',
    roleTitle: 'Citizen Blood Donor',
    category: 'donor',
    facilityName: 'Navi Mumbai & Mumbai Citizen Blood Donors Network',
    scopeDescription: 'Digital ABHA donor card, 90-day eligibility check, donation pledges, and emergency distress alerts.',
    phone: '9820011004',
    password: 'demo1234',
    primaryRoute: '/donor',
  },
  {
    role: 'TRANSPORT',
    roleTitle: 'Emergency Transport Driver',
    category: 'logistics',
    facilityName: 'Ambulance Fleet — Unit MH-43 (Navi Mumbai / Mumbai Link)',
    scopeDescription: 'Manages live emergency transit dispatches, cold-chain safety checklists, and verified handovers.',
    phone: '9820011005',
    password: 'demo1234',
    primaryRoute: '/logistics',
  },
  {
    role: 'DHO',
    roleTitle: 'Municipal Health Officer (MHO / DHO)',
    category: 'governance',
    facilityName: 'Municipal Health Directorate (MCGM Mumbai & NMMC Navi Mumbai)',
    scopeDescription: 'Dual-corporation governance, idle equipment reduction analytics, chronic gap procurement recommendations.',
    phone: '9820011006',
    password: 'demo1234',
    primaryRoute: '/oversight',
  },
  {
    role: 'STATE_ADMIN',
    roleTitle: 'State Health Administrator',
    category: 'governance',
    facilityName: 'Maharashtra Directorate of Health Services (Arogya Bhavan, Mumbai)',
    scopeDescription: 'Multi-district health equity monitoring, inter-district transfer policies, and systemic surge oversight.',
    phone: '9820011007',
    password: 'demo1234',
    primaryRoute: '/oversight',
  },
  {
    role: 'FACILITY_ADMIN',
    roleTitle: 'Facility Admin (Community Health Centre)',
    category: 'clinics',
    facilityName: 'CIDCO Community Health Centre (Kharghar, Navi Mumbai)',
    scopeDescription: 'Community health post tracking real-time emergency stock levels and local transit handovers.',
    phone: '9820011008',
    password: 'demo1234',
    primaryRoute: '/dashboard',
  },
  {
    role: 'BLOOD_BANK',
    roleTitle: 'Satellite Blood Bank Depot',
    category: 'blood',
    facilityName: 'Jeevan Jyoti Blood Centre (Nerul, Navi Mumbai)',
    scopeDescription: 'Satellite blood distribution unit matching regional emergency PRBC and Platelet requests.',
    phone: '9820011009',
    password: 'demo1234',
    primaryRoute: '/blood',
  },
];

// Helper to construct fallback user persona without personal names
function getFallbackPersona(phoneOrRole: string): UserPersona {
  const match = DEMO_ROLE_CREDENTIALS.find(
    (c) => c.phone === phoneOrRole || c.role === phoneOrRole
  ) || DEMO_ROLE_CREDENTIALS[0];

  return {
    id: `mock-${match.phone}`,
    name: match.roleTitle,
    phone: match.phone,
    role: match.role,
    facilityId: `fac-${match.phone}`,
    facility: {
      id: `fac-${match.phone}`,
      name: match.facilityName,
      type: match.role === 'BLOOD_BANK' ? 'BLOOD_BANK' : 'PHC',
      district: 'Navi Mumbai & Mumbai',
    },
    donorProfile: match.role === 'DONOR' ? { bloodGroup: 'B_POSITIVE', isAvailable: true } : null,
    language: 'en',
  };
}

interface AppState {
  currentUser: UserPersona | null;
  activeRole: string;
  lowBandwidth: boolean;
  language: 'en' | 'hi' | 'mr';
  isOnline: boolean;
  pendingSyncCount: number;
  isLoadingPersona: boolean;

  // Actions
  switchPersona: (role: string, phone?: string) => Promise<UserPersona>;
  login: (phone: string, password: string) => Promise<UserPersona>;
  loginWithOtp: (phone: string, otp: string) => Promise<UserPersona>;
  logout: () => void;
  toggleLowBandwidth: () => void;
  setLanguage: (lang: 'en' | 'hi' | 'mr') => void;
  setOnlineStatus: (status: boolean) => void;
  setPendingSyncCount: (count: number) => void;
  initSession: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  activeRole: 'FACILITY_ADMIN',
  lowBandwidth: false,
  language: 'en',
  isOnline: true,
  pendingSyncCount: 0,
  isLoadingPersona: false,

  switchPersona: async (role: string, phone?: string) => {
    set({ isLoadingPersona: true });
    const targetPhone = phone || DEMO_ROLE_CREDENTIALS.find((c) => c.role === role)?.phone || '9820011001';

    try {
      const data = await apiRequest<{ user: UserPersona; accessToken: string }>(
        '/auth/persona-login',
        {
          method: 'POST',
          body: JSON.stringify({ role, phone: targetPhone }),
        }
      );

      if (typeof window !== 'undefined' && data.accessToken) {
        localStorage.setItem('lifelink_token', data.accessToken);
        localStorage.setItem('lifelink_persona_phone', data.user.phone);
      }

      set({
        currentUser: data.user,
        activeRole: data.user.role,
        isLoadingPersona: false,
      });

      return data.user;
    } catch {
      // Graceful offline/demo fallback
      const fallback = getFallbackPersona(targetPhone);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lifelink_token', `demo-token-${fallback.phone}`);
        localStorage.setItem('lifelink_persona_phone', fallback.phone);
      }

      set({
        currentUser: fallback,
        activeRole: fallback.role,
        isLoadingPersona: false,
      });

      return fallback;
    }
  },

  login: async (phone: string, password: string) => {
    set({ isLoadingPersona: true });
    const cleanPhone = phone.trim().replace(/^\+91/, '').replace(/\s+/g, '');

    try {
      const data = await apiRequest<{ user: UserPersona; accessToken: string }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ phone: cleanPhone, password }),
        }
      );

      if (typeof window !== 'undefined' && data.accessToken) {
        localStorage.setItem('lifelink_token', data.accessToken);
        localStorage.setItem('lifelink_persona_phone', data.user.phone);
      }

      set({
        currentUser: data.user,
        activeRole: data.user.role,
        isLoadingPersona: false,
      });

      return data.user;
    } catch (err: any) {
      // Check if credentials match any demo role
      const demoAccount = DEMO_ROLE_CREDENTIALS.find((c) => c.phone === cleanPhone);
      if (demoAccount && (password === demoAccount.password || password === 'demo1234')) {
        const fallback = getFallbackPersona(cleanPhone);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lifelink_token', `demo-token-${fallback.phone}`);
          localStorage.setItem('lifelink_persona_phone', fallback.phone);
        }

        set({
          currentUser: fallback,
          activeRole: fallback.role,
          isLoadingPersona: false,
        });

        return fallback;
      }

      set({ isLoadingPersona: false });
      throw new Error(err?.message || 'Invalid phone or password. Use demo credentials below.');
    }
  },

  loginWithOtp: async (phone: string, otp: string) => {
    set({ isLoadingPersona: true });
    const cleanPhone = phone.trim().replace(/^\+91/, '').replace(/\s+/g, '');

    try {
      const data = await apiRequest<{ user: UserPersona; accessToken: string }>(
        '/auth/otp/verify',
        {
          method: 'POST',
          body: JSON.stringify({ phone: cleanPhone, otp }),
        }
      );

      if (typeof window !== 'undefined' && data.accessToken) {
        localStorage.setItem('lifelink_token', data.accessToken);
        localStorage.setItem('lifelink_persona_phone', data.user.phone);
      }

      set({
        currentUser: data.user,
        activeRole: data.user.role,
        isLoadingPersona: false,
      });

      return data.user;
    } catch (err: any) {
      // Check if demo OTP 123456
      const demoAccount = DEMO_ROLE_CREDENTIALS.find((c) => c.phone === cleanPhone);
      if (demoAccount && (otp === '123456' || otp.trim() === '123456')) {
        const fallback = getFallbackPersona(cleanPhone);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lifelink_token', `demo-token-${fallback.phone}`);
          localStorage.setItem('lifelink_persona_phone', fallback.phone);
        }

        set({
          currentUser: fallback,
          activeRole: fallback.role,
          isLoadingPersona: false,
        });

        return fallback;
      }

      set({ isLoadingPersona: false });
      throw new Error(err?.message || 'Invalid OTP code. Enter demo OTP 123456.');
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lifelink_token');
      localStorage.removeItem('lifelink_persona_phone');
    }

    apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});

    set({
      currentUser: null,
      activeRole: 'FACILITY_ADMIN',
    });
  },

  toggleLowBandwidth: () => {
    const next = !get().lowBandwidth;
    set({ lowBandwidth: next });
    if (typeof document !== 'undefined') {
      if (next) {
        document.body.classList.add('low-bandwidth');
      } else {
        document.body.classList.remove('low-bandwidth');
      }
    }
  },

  setLanguage: (lang: 'en' | 'hi' | 'mr') => {
    set({ language: lang });
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifelink_lang', lang);
    }
  },

  setOnlineStatus: (status: boolean) => {
    set({ isOnline: status });
  },

  setPendingSyncCount: (count: number) => {
    set({ pendingSyncCount: count });
  },

  initSession: async () => {
    if (typeof window === 'undefined') return;

    // Check saved language
    const savedLang = localStorage.getItem('lifelink_lang') as any;
    if (savedLang && ['en', 'hi', 'mr'].includes(savedLang)) {
      set({ language: savedLang });
    }

    // Auto-detect slow connection for Low-Bandwidth Mode
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.saveData || conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') {
        get().toggleLowBandwidth();
      }
    }

    // If already has user in memory, don't overwrite
    if (get().currentUser) return;

    // Check saved persona phone
    const savedPhone = localStorage.getItem('lifelink_persona_phone');
    if (savedPhone) {
      await get().switchPersona('FACILITY_ADMIN', savedPhone);
    }
  },
}));
