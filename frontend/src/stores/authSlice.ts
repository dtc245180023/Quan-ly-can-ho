import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IUser, UserRole } from '../types';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
}

const getInitialUser = (): IUser | null => {
  const saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return null;
};

const initialUser = getInitialUser();
const initialToken = localStorage.getItem('token');

const initialState: AuthState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: Boolean(initialToken && initialUser),
  activeRole: initialUser ? initialUser.roleCode : 'GUEST',
};

const ROLE_PROFILES: Record<UserRole, { user: IUser; token: string }> = {
  ADMIN: {
    user: {
      id: 1,
      roleId: 1,
      roleCode: 'ADMIN',
      username: 'admin',
      fullName: 'Hoàng Khánh Ly',
      email: 'admin@dwell.vn',
      phone: '0904.123.456',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    token: 'demo-admin-token',
  },
  STAFF: {
    user: {
      id: 2,
      roleId: 2,
      roleCode: 'STAFF',
      username: 'staff',
      fullName: 'Lê Văn Cường',
      email: 'staff@dwell.vn',
      phone: '0912.234.567',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    token: 'demo-staff-token',
  },
  ACCOUNTANT: {
    user: {
      id: 3,
      roleId: 3,
      roleCode: 'ACCOUNTANT',
      username: 'accountant',
      fullName: 'Lê Thu Trang',
      email: 'accountant@dwell.vn',
      phone: '0988.345.678',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    token: 'demo-accountant-token',
  },
  TENANT: {
    user: {
      id: 4,
      roleId: 4,
      roleCode: 'TENANT',
      username: 'tenant',
      fullName: 'Nguyễn Văn An',
      email: 'tenant@dwell.vn',
      phone: '0912.888.999',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    token: 'demo-tenant-token',
  },
  GUEST: {
    user: null as any,
    token: '',
  },
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: IUser; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.activeRole = action.payload.user.roleCode;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('currentUser', JSON.stringify(action.payload.user));
    },
    switchRole: (state, action: PayloadAction<UserRole>) => {
      const targetRole = action.payload;
      if (targetRole === 'GUEST') {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.activeRole = 'GUEST';
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        return;
      }

      const profile = ROLE_PROFILES[targetRole];
      if (profile) {
        state.user = { ...profile.user };
        state.token = profile.token;
        state.isAuthenticated = true;
        state.activeRole = targetRole;
        localStorage.setItem('currentUser', JSON.stringify(state.user));
        localStorage.setItem('token', state.token);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.activeRole = 'GUEST';
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    },
  },
});

export const { setCredentials, switchRole, logout } = authSlice.actions;
export default authSlice.reducer;
