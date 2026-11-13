import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// Strictly in-memory OAuth access token cache (never persisted to localStorage or sessionStorage)
let inMemoryAccessToken: string | null = null;
let cachedConfig: Record<string, any> | null | undefined = undefined;
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

export interface GoogleSessionInfo {
  connected: boolean;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  hasAccessToken: boolean;
  workspaceConfigured: boolean;
}

export async function loadFirebaseConfig(): Promise<Record<string, any> | null> {
  if (cachedConfig !== undefined) return cachedConfig;
  try {
    const res = await fetch('/firebase-applet-config.json', { cache: 'no-store' });
    if (!res.ok) {
      cachedConfig = null;
      return null;
    }
    const json = await res.json();
    if (!json || !json.apiKey || !json.authDomain) {
      cachedConfig = null;
      return null;
    }
    cachedConfig = json;
    return json;
  } catch {
    cachedConfig = null;
    return null;
  }
}

export async function getFirebaseAuthInstance(): Promise<Auth | null> {
  if (firebaseAuth) return firebaseAuth;
  const config = await loadFirebaseConfig();
  if (!config) return null;

  firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  firebaseAuth = getAuth(firebaseApp);

  onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      inMemoryAccessToken = null;
    }
  });

  return firebaseAuth;
}

export function getInMemoryAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function clearInMemoryAccessToken(): void {
  inMemoryAccessToken = null;
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> {
  const auth = await getFirebaseAuthInstance();
  if (!auth) {
    throw new Error(
      'Google authorization is not yet provisioned for this workspace. Complete the Google Workspace permission card first.'
    );
  }

  const provider = new GoogleAuthProvider();
  for (const scope of WORKSPACE_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'online',
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error('Google Sign-In completed, but no Workspace access token was returned.');
  }

  inMemoryAccessToken = accessToken;
  return { user: result.user, accessToken };
}

export async function signOutGoogleWorkspace(): Promise<void> {
  inMemoryAccessToken = null;
  const auth = await getFirebaseAuthInstance();
  if (auth) {
    await signOut(auth);
  }
}

export async function getGoogleSessionInfo(): Promise<GoogleSessionInfo> {
  const config = await loadFirebaseConfig();
  const auth = await getFirebaseAuthInstance();
  const currentUser = auth?.currentUser || null;
  return {
    connected: Boolean(currentUser && inMemoryAccessToken),
    email: currentUser?.email || null,
    displayName: currentUser?.displayName || null,
    photoURL: currentUser?.photoURL || null,
    hasAccessToken: Boolean(inMemoryAccessToken),
    workspaceConfigured: Boolean(config),
  };
}
