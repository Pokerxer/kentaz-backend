import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'therapist';
  avatar?: string;
  phone?: string;
  addresses?: Address[];
  wishlist?: string[];
  createdAt?: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  isDefault?: boolean;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  // false until we've attempted to restore the session from the stored token
  // on app load. Pages that gate on auth should wait for this before redirecting.
  sessionChecked: boolean;
}

const initialState: UserState = {
  user: null,
  isAuthenticated: false,
  sessionChecked: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.sessionChecked = true;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.sessionChecked = true;
    },
    // Marks the initial session-restore attempt as complete (e.g. no token found
    // or the token was invalid) without setting a user.
    setSessionChecked: (state) => {
      state.sessionChecked = true;
    },
  },
});

export const { setUser, clearUser, setSessionChecked } = userSlice.actions;
export default userSlice.reducer;
