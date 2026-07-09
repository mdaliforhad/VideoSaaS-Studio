import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from "firebase/firestore";

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDm9bT3RCNszbCaMbQ71IHnhOSs4kJ6Qp8",
  authDomain: "videosaas-studio-19d37.firebaseapp.com",
  databaseURL: "https://videosaas-studio-19d37-default-rtdb.firebaseio.com",
  projectId: "videosaas-studio-19d37",
  storageBucket: "videosaas-studio-19d37.firebasestorage.app",
  messagingSenderId: "1065444296988",
  appId: "1:1065444296988:web:611f3e6eecfa191c78d2d9",
  measurementId: "G-Z3S31ZLZ6Z"
};

// Initialize Firebase Services
const app = initializeApp(firebaseConfig);

// Initialize analytics safely
let analytics = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (err) {
    console.warn("Analytics initialization failed:", err);
  }
}

export { analytics };
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with robust local persistent cache for seamless offline-first capability
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, "videosaas-studio-19d37");

// Export authentication helpers for the UI components
export { signInWithPopup, signOut };

// Firestore Error Types and Helpers
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("[Firebase] Firestore connection test succeeded.");
  } catch (error) {
    // If we're offline, or the backend is starting up, operate beautifully in local cache mode
    console.log("[Firebase] Firestore offline mode/cache sync engaged.");
  }
}
// Run connection test safely without throwing console.error on startup
if (typeof window !== "undefined") {
  testConnection().catch(() => {});
}
