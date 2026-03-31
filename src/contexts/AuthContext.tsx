import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User, OFFICE_CREDENTIALS } from '../lib/offices';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc, updateDoc, Timestamp, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logUserLogin, logUserLogout } from '../lib/systemLogger';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout duration (30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
let inactivityTimer: NodeJS.Timeout | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set session-only persistence on app initialization
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Set persistence to session only - clears on tab/browser close
        await setPersistence(auth, browserSessionPersistence);
      } catch (error) {
        console.error('Error setting auth persistence:', error);
      }
    };
    initializeAuth();
  }, []);

  // Handle tab/browser close - ensure session cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Session storage will automatically clear on browser/tab close
      // This is just for logging/tracking purposes
      if (auth.currentUser) {
        try {
          // Attempt to update last activity (may not complete if tab closes quickly)
          navigator.sendBeacon(
            'https://firestore.googleapis.com/v1/projects/your-project/databases/(default)/documents/users/' + auth.currentUser.uid,
            JSON.stringify({ lastActivity: new Date().toISOString() })
          );
        } catch (error) {
          // Silent fail - user is closing anyway
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    inactivityTimer = setTimeout(async () => {
      // Auto-logout on timeout
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      window.location.href = '/login?timeout=true';
    }, SESSION_TIMEOUT);
  };

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Set up activity listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Start initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [user]);

  // Update last activity timestamp periodically
  useEffect(() => {
    if (!user || !auth.currentUser) return;

    const updateActivity = async () => {
      try {
        if (auth.currentUser) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            lastActivity: Timestamp.now()
          });
        }
      } catch (error) {
        // Silently fail - user might not have Firestore profile
      }
    };

    // Update every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // All users now have Firebase Auth
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Check if user is blocked
            if (userData.blocked) {
              await signOut(auth);
              setUser(null);
              setLoading(false);
              return;
            }
            
            // Add id to user data for consistency
            const userWithId = {
              ...userData,
              id: firebaseUser.uid
            } as User;
            
            setUser(userWithId);
          } else {
            // User doesn't have Firestore profile - create one automatically
            const credentials = OFFICE_CREDENTIALS[firebaseUser.email?.toLowerCase() || ''];
            if (credentials) {
              // Create Firestore profile
              const newUserProfile = {
                uid: firebaseUser.uid,
                email: credentials.email,
                name: credentials.name,
                role: credentials.role,
                office: credentials.office,
                blocked: false,
                createdAt: Timestamp.now(),
                createdBy: 'auto-created-on-auth-state-change',
                lastLogin: Timestamp.now(),
                lastActivity: Timestamp.now(),
                loginCount: 1
              };
              
              await setDoc(doc(db, 'users', firebaseUser.uid), newUserProfile);
              
              const userData: User = {
                id: firebaseUser.uid,
                email: credentials.email,
                role: credentials.role,
                office: credentials.office,
                name: credentials.name
              };
              setUser(userData);
            }
          }
        } catch (error: any) {
          // Silently handle permission errors - expected when users collection doesn't exist
          if (error.code !== 'permission-denied') {
            console.error('Error loading user profile:', error);
          }
          // Fallback to mock credentials
          const credentials = OFFICE_CREDENTIALS[firebaseUser.email?.toLowerCase() || ''];
          if (credentials) {
            const userData: User = {
              email: credentials.email,
              role: credentials.role,
              office: credentials.office,
              name: credentials.name
            };
            setUser(userData);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Set session-only persistence before login
      await setPersistence(auth, browserSessionPersistence);
      
      // All users now use Firebase Auth (both Regional Engineer and Acting Officers)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Try to get user profile from Firestore using UID
      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if user is blocked
          if (userData.blocked) {
            await signOut(auth);
            return false;
          }
          
          // Update login session info
          await updateDoc(doc(db, 'users', userCredential.user.uid), {
            lastLogin: Timestamp.now(),
            lastActivity: Timestamp.now(),
            loginCount: (userData.loginCount || 0) + 1
          });
          
          // Add id to user data for consistency
          const userWithId = {
            ...userData,
            id: userCredential.user.uid
          } as User;
          
          setUser(userWithId);
          
          // Log successful login
          try {
            await logUserLogin(userWithId);
          } catch (error) {
            console.error('Error logging user login:', error);
          }
          
          return true;
        } else {
          // User doesn't have Firestore profile - check if email-based profile exists first
          const credentials = OFFICE_CREDENTIALS[email.toLowerCase()];
          if (credentials) {
            // Check if a profile with this email already exists (from different UID)
            const usersRef = collection(db, 'users');
            const emailQuery = query(usersRef, where('email', '==', credentials.email.toLowerCase()));
            const existingUserDocs = await getDocs(emailQuery);
            
            if (!existingUserDocs.empty) {
              // Update existing profile with new UID
              const existingDoc = existingUserDocs.docs[0];
              await updateDoc(doc(db, 'users', existingDoc.id), {
                uid: userCredential.user.uid,
                lastLogin: Timestamp.now(),
                lastActivity: Timestamp.now(),
                loginCount: (existingDoc.data().loginCount || 0) + 1
              });
              
              const userData: User = {
                id: existingDoc.id,
                email: credentials.email,
                role: credentials.role,
                office: credentials.office,
                name: credentials.name
              };
              setUser(userData);
              
              // Log successful login
              try {
                await logUserLogin(userData);
              } catch (error) {
                console.error('Error logging user login:', error);
              }
              
              return true;
            } else {
              // Create new Firestore profile
              const newUserProfile = {
                uid: userCredential.user.uid,
                email: credentials.email,
                name: credentials.name,
                role: credentials.role,
                office: credentials.office,
                blocked: false,
                createdAt: Timestamp.now(),
                createdBy: 'auto-created-on-first-login',
                lastLogin: Timestamp.now(),
                lastActivity: Timestamp.now(),
                loginCount: 1
              };
              
              await setDoc(doc(db, 'users', userCredential.user.uid), newUserProfile);
              
              const userData: User = {
                id: userCredential.user.uid,
                email: credentials.email,
                role: credentials.role,
                office: credentials.office,
                name: credentials.name
              };
              setUser(userData);
              
              // Log successful login
              try {
                await logUserLogin(userData);
              } catch (error) {
                console.error('Error logging user login:', error);
              }
              
              return true;
            }
          }
        }
      } catch (error: any) {
        // Silently handle permission errors
        if (error.code !== 'permission-denied') {
          console.error('Error loading user profile:', error);
        }
      }
      
      // Final fallback to mock credentials for testing
      const credentials = OFFICE_CREDENTIALS[email.toLowerCase()];
      if (credentials) {
        const userData: User = {
          email: credentials.email,
          role: credentials.role,
          office: credentials.office,
          name: credentials.name
        };
        setUser(userData);
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Clear inactivity timer
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      // Log logout before clearing user
      if (user && auth.currentUser) {
        try {
          await logUserLogout(user);
        } catch (error) {
          console.error('Error logging user logout:', error);
        }
      }
      
      // Update logout time if user has Firestore profile
      if (auth.currentUser) {
        try {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            lastLogout: Timestamp.now()
          });
        } catch (error) {
          // Silently fail
        }
        await signOut(auth);
      }
      
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
