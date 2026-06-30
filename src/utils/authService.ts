import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, isMockFirebase } from './firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  avatarUrl: string;
  isAnonymous: boolean;
}

// -------------------------------------------------------------
// SIMULATED MOCK AUTH SERVICE STATE (FOR OFFLINE / TESTING)
// -------------------------------------------------------------
const getMockAccounts = (): any[] => {
  const saved = localStorage.getItem('sveti_mock_accounts');
  if (saved) return JSON.parse(saved);
  const defaults = [
    { email: 'admin@sveti.io', password: 'admin', displayName: 'Neon Admin', avatarUrl: 'avatar-1' }
  ];
  localStorage.setItem('sveti_mock_accounts', JSON.stringify(defaults));
  return defaults;
};

const getActiveMockUser = (): UserProfile | null => {
  const saved = localStorage.getItem('sveti_mock_user');
  return saved ? JSON.parse(saved) : null;
};

const saveActiveMockUser = (user: UserProfile | null) => {
  if (user) {
    localStorage.setItem('sveti_mock_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('sveti_mock_user');
  }
};

const mockCallbacks: ((user: UserProfile | null) => void)[] = [];

const triggerMockAuthChange = () => {
  const user = getActiveMockUser();
  mockCallbacks.forEach(cb => cb(user));
};

// -------------------------------------------------------------
// UNIFIED AUTH OPERATION WRAPPERS
// -------------------------------------------------------------

export const signUpUser = async (email: string, password: string, displayName: string, avatarUrl: string): Promise<UserProfile> => {
  if (isMockFirebase) {
    const accounts = getMockAccounts();
    if (accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    const newAccount = { email, password, displayName, avatarUrl };
    accounts.push(newAccount);
    localStorage.setItem('sveti_mock_accounts', JSON.stringify(accounts));

    const user: UserProfile = {
      uid: 'mock-' + Math.random().toString(36).substring(2, 9),
      email,
      displayName,
      avatarUrl,
      isAnonymous: false
    };
    saveActiveMockUser(user);
    triggerMockAuthChange();
    return user;
  } else {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(res.user, { displayName, photoURL: avatarUrl });
    const user: UserProfile = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: displayName,
      avatarUrl: avatarUrl,
      isAnonymous: false
    };
    return user;
  }
};

export const logInUser = async (email: string, password: string): Promise<UserProfile> => {
  if (isMockFirebase) {
    const accounts = getMockAccounts();
    const match = accounts.find(acc => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password);
    if (!match) {
      throw new Error("Invalid email or password.");
    }
    const user: UserProfile = {
      uid: 'mock-' + Math.random().toString(36).substring(2, 9),
      email: match.email,
      displayName: match.displayName,
      avatarUrl: match.avatarUrl,
      isAnonymous: false
    };
    saveActiveMockUser(user);
    triggerMockAuthChange();
    return user;
  } else {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const user: UserProfile = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: res.user.displayName || "Smart User",
      avatarUrl: res.user.photoURL || "avatar-1",
      isAnonymous: false
    };
    return user;
  }
};

export const logInWithGoogle = async (): Promise<UserProfile> => {
  if (isMockFirebase) {
    const user: UserProfile = {
      uid: 'google-' + Math.random().toString(36).substring(2, 9),
      email: 'google-user@example.com',
      displayName: 'Google Operator',
      avatarUrl: 'avatar-4',
      isAnonymous: false
    };
    saveActiveMockUser(user);
    triggerMockAuthChange();
    return user;
  } else {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const user: UserProfile = {
      uid: res.user.uid,
      email: res.user.email,
      displayName: res.user.displayName || "Google User",
      avatarUrl: res.user.photoURL || "avatar-4",
      isAnonymous: false
    };
    return user;
  }
};

export const logInGuest = async (): Promise<UserProfile> => {
  if (isMockFirebase) {
    const user: UserProfile = {
      uid: 'guest-' + Math.random().toString(36).substring(2, 9),
      email: null,
      displayName: 'Guest Operator',
      avatarUrl: 'avatar-guest',
      isAnonymous: true
    };
    saveActiveMockUser(user);
    triggerMockAuthChange();
    return user;
  } else {
    const res = await signInAnonymously(auth);
    const user: UserProfile = {
      uid: res.user.uid,
      email: null,
      displayName: 'Guest Operator',
      avatarUrl: 'avatar-guest',
      isAnonymous: true
    };
    return user;
  }
};

export const signOutUser = async (): Promise<void> => {
  if (isMockFirebase) {
    saveActiveMockUser(null);
    triggerMockAuthChange();
  } else {
    await signOut(auth);
  }
};

export const updateUserProfile = async (displayName: string, avatarUrl: string): Promise<void> => {
  if (isMockFirebase) {
    const user = getActiveMockUser();
    if (user) {
      user.displayName = displayName;
      user.avatarUrl = avatarUrl;
      saveActiveMockUser(user);
      triggerMockAuthChange();
    }
  } else {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName, photoURL: avatarUrl });
    }
  }
};

export const subscribeAuthState = (callback: (user: UserProfile | null) => void): (() => void) => {
  if (isMockFirebase) {
    mockCallbacks.push(callback);
    // Trigger initial value
    callback(getActiveMockUser());
    return () => {
      const idx = mockCallbacks.indexOf(callback);
      if (idx !== -1) mockCallbacks.splice(idx, 1);
    };
  } else {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || "Smart User",
          avatarUrl: firebaseUser.photoURL || "avatar-1",
          isAnonymous: firebaseUser.isAnonymous
        });
      } else {
        callback(null);
      }
    });
  }
};
