import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, setDoc, deleteDoc, doc, updateDoc, Timestamp, where, getDocs, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, OFFICE_LIST, OFFICES, OFFICE_CREDENTIALS, type Office, type Role } from '../lib/offices';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldOff, 
  Mail, 
  Building2, 
  User as UserIcon,
  X,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Key,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast, { Toaster } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  office: Office;
  blocked: boolean;
  createdAt: any;
  createdBy: string;
  password?: string; // For Acting Officers
  lastLogin?: any;
  lastActivity?: any;
  lastLogout?: any;
  loginCount?: number;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ userId: '', userName: '', newPassword: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);
  
  // Info banner visibility states (load from localStorage)
  const [showAuthBanner, setShowAuthBanner] = useState(() => {
    const saved = localStorage.getItem('showAuthBanner');
    return saved !== null ? saved === 'true' : true;
  });
  const [showDuplicateBanner, setShowDuplicateBanner] = useState(() => {
    const saved = localStorage.getItem('showDuplicateBanner');
    return saved !== null ? saved === 'true' : true;
  });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Save banner visibility preferences
  useEffect(() => {
    localStorage.setItem('showAuthBanner', showAuthBanner.toString());
  }, [showAuthBanner]);

  useEffect(() => {
    localStorage.setItem('showDuplicateBanner', showDuplicateBanner.toString());
  }, [showDuplicateBanner]);

  // Helper function to format relative time
  const formatRelativeTime = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    office: OFFICES.DAMBULLA as Office,
    role: ROLES.ACTING_OFFICER as Role
  });

  // Redirect if not Regional Engineer
  useEffect(() => {
    if (user && user.role !== ROLES.REGIONAL_ENGINEER) {
      toast.error('Access denied. Regional Engineer only.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Fetch users and deduplicate by email
  useEffect(() => {
    if (!user || user.role !== ROLES.REGIONAL_ENGINEER) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as UserData));
        
        // Deduplicate users by email - keep the most recent one
        const uniqueUsers = new Map<string, UserData>();
        usersData.forEach(user => {
          const email = user.email.toLowerCase();
          const existing = uniqueUsers.get(email);
          
          if (!existing) {
            uniqueUsers.set(email, user);
          } else {
            // Keep the one with more recent login or creation
            const existingTime = existing.lastLogin?.toMillis?.() || existing.createdAt?.toMillis?.() || 0;
            const currentTime = user.lastLogin?.toMillis?.() || user.createdAt?.toMillis?.() || 0;
            
            if (currentTime > existingTime) {
              uniqueUsers.set(email, user);
            }
          }
        });
        
        setUsers(Array.from(uniqueUsers.values()));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users:', error);
        toast.error('Error loading users');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Generate random password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  // Clean up duplicate users
  const handleCleanDuplicates = async () => {
    if (!confirm('This will remove duplicate user entries (same email, different UIDs). The most recent entry for each email will be kept. Continue?')) {
      return;
    }

    setCleaningDuplicates(true);
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserData));

      // Group by email
      const usersByEmail = new Map<string, UserData[]>();
      allUsers.forEach(user => {
        const email = user.email.toLowerCase();
        if (!usersByEmail.has(email)) {
          usersByEmail.set(email, []);
        }
        usersByEmail.get(email)!.push(user);
      });

      // Find duplicates and delete old ones
      let deletedCount = 0;
      for (const duplicates of usersByEmail.values()) {
        if (duplicates.length > 1) {
          // Sort by most recent login/creation
          duplicates.sort((a, b) => {
            const aTime = a.lastLogin?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
            const bTime = b.lastLogin?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
            return bTime - aTime; // Descending order
          });

          // Keep the first one (most recent), delete the rest
          for (let i = 1; i < duplicates.length; i++) {
            await deleteDoc(doc(db, 'users', duplicates[i].id));
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        toast.success(`Cleaned up ${deletedCount} duplicate user entries`);
      } else {
        toast('No duplicate users found', { icon: '✅' });
      }
    } catch (error: any) {
      console.error('Error cleaning duplicates:', error);
      toast.error('Failed to clean duplicates: ' + error.message);
    } finally {
      setCleaningDuplicates(false);
    }
  };

  // Sync test accounts to Firestore
  const handleSyncTestAccounts = async () => {
    if (!confirm('This will create Firestore profiles for the test accounts (regional@nwsdb.lk, dambulla@nwsdb.lk, etc.). Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      let successCount = 0;
      
      // Try to create profiles for each test account
      for (const [email, credentials] of Object.entries(OFFICE_CREDENTIALS)) {
        try {
          // Create a temporary user to get UID (this will fail if user exists)
          // Instead, we'll create the profile with a known pattern
          const uid = email.replace('@nwsdb.lk', '-uid-' + Date.now());
          
          await setDoc(doc(db, 'users', uid), {
            uid: uid,
            email: credentials.email,
            name: credentials.name,
            role: credentials.role,
            office: credentials.office,
            blocked: false,
            createdAt: Timestamp.now(),
            createdBy: 'system-sync'
          });
          
          successCount++;
        } catch (error) {
          console.error(`Error syncing ${email}:`, error);
        }
      }
      
      toast.success(`Synced ${successCount} test accounts`);
    } catch (error: any) {
      console.error('Error syncing accounts:', error);
      toast.error('Failed to sync accounts');
    } finally {
      setSyncing(false);
    }
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill all required fields');
      return;
    }

    setCreating(true);
    try {
      // Check if user already exists in Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', formData.email.toLowerCase()));
      const existingUsers = await getDocs(q);
      
      if (!existingUsers.empty) {
        toast.error('Email already in use');
        setCreating(false);
        return;
      }

      // Check if this is the Regional Engineer email
      const isRegionalEngineer = formData.email.toLowerCase() === 'aedambullanwsdb@gmail.com';
      
      // Always create Firebase Auth account for proper Firestore security
      const currentUserEmail = user?.email;
      const currentUserPassword = prompt(`Please enter YOUR password to continue creating the ${isRegionalEngineer ? 'Regional Engineer' : 'Acting Officer'} account:`);
      
      if (!currentUserPassword) {
        toast.error('Password required to create user');
        setCreating(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const newUserUid = userCredential.user.uid;
      
      // Store user profile in Firestore with UID as document ID
      const userProfile: any = {
        uid: newUserUid,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        office: formData.office,
        blocked: false,
        createdAt: Timestamp.now(),
        createdBy: currentUserEmail || 'system'
      };
      
      // For Acting Officers, also store password in Firestore for password management
      if (!isRegionalEngineer) {
        userProfile.password = formData.password;
      }
      
      await setDoc(doc(db, 'users', newUserUid), userProfile);

      // Sign out the newly created user
      await signOut(auth);
      
      // Sign back in as the original admin user
      if (currentUserEmail) {
        await signInWithEmailAndPassword(auth, currentUserEmail, currentUserPassword);
      }

      toast.success(`User ${formData.name} created successfully!`);
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        office: OFFICES.DAMBULLA,
        role: ROLES.ACTING_OFFICER
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect admin password');
      } else {
        toast.error(error.message || 'Failed to create user');
      }
    } finally {
      setCreating(false);
    }
  };

  // Toggle block status
  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        blocked: !currentStatus
      });
      toast.success(currentStatus ? 'User unblocked' : 'User blocked');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user status');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This will remove them from both Firestore and Firebase Authentication. This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      toast.success(`User "${userName}" deleted from database. Note: Firebase Authentication account deletion requires admin access or a backend function.`);
      toast('⚠️ To fully delete the user, go to Firebase Console → Authentication → Users and manually delete the account.', {
        duration: 8000,
        icon: '⚠️'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  // Reset password for Acting Officers
  const handleResetPassword = async (userId: string, userName: string, userEmail: string) => {
    // Only allow password reset for Acting Officers (not Regional Engineer)
    if (userEmail.toLowerCase() === 'aedambullanwsdb@gmail.com') {
      toast.error('Cannot reset Regional Engineer password from here. Use "Forgot Password" on login page.');
      return;
    }

    setResetPasswordData({ userId, userName, newPassword: '' });
    setShowResetPasswordModal(true);
  };

  // Submit password reset
  const handleSubmitPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetPasswordData.newPassword || resetPasswordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      // Get the user document to find current password and email
      const userDocSnapshot = await getDoc(doc(db, 'users', resetPasswordData.userId));
      if (!userDocSnapshot.exists()) {
        toast.error('User not found');
        return;
      }
      
      const userData = userDocSnapshot.data();
      const currentPassword = userData.password;
      const userEmail = userData.email;
      const adminEmail = user?.email;
      
      if (!userEmail) {
        toast.error('Cannot reset password: user email missing');
        return;
      }

      // If no password is stored in Firestore, send password reset email instead
      if (!currentPassword) {
        toast('No stored password found. Sending password reset email...', { icon: '📧' });
        
        try {
          await sendPasswordResetEmail(auth, userEmail);
          
          // Store the intended new password in Firestore for future reference
          await updateDoc(doc(db, 'users', resetPasswordData.userId), {
            password: resetPasswordData.newPassword
          });
          
          toast.success(`Password reset email sent to ${userEmail}. User must check their email to complete the reset. The password has been saved in the system.`);
          setShowResetPasswordModal(false);
          setResetPasswordData({ userId: '', userName: '', newPassword: '' });
          return;
        } catch (emailError: any) {
          console.error('Error sending reset email:', emailError);
          toast.error('Failed to send password reset email: ' + emailError.message);
          return;
        }
      }

      // Get Regional Engineer's password for re-authentication (only if we have current password)
      const adminPassword = prompt('Please enter YOUR password to reset this user\'s password:');
      if (!adminPassword) {
        toast.error('Admin password required');
        return;
      }

      // Step 1: Try to sign in as the Acting Officer with current password
      try {
        await signInWithEmailAndPassword(auth, userEmail, currentPassword);
        
        // Step 2: Update the password in Firebase Auth
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, resetPasswordData.newPassword);
        }
        
        // Step 3: Update password in Firestore
        await updateDoc(doc(db, 'users', resetPasswordData.userId), {
          password: resetPasswordData.newPassword
        });
        
        // Step 4: Sign out the Acting Officer
        await signOut(auth);
      } catch (signInError: any) {
        // If user not found in Firebase Auth, recreate the account
        if (signInError.code === 'auth/user-not-found') {
          toast('User Auth deleted. Recreating Firebase Auth account...', { icon: '🔄' });
          
          // Create new Firebase Auth account
          const newUserCredential = await createUserWithEmailAndPassword(auth, userEmail, resetPasswordData.newPassword);
          
          // Update Firestore with new UID and password
          await updateDoc(doc(db, 'users', resetPasswordData.userId), {
            uid: newUserCredential.user.uid,
            password: resetPasswordData.newPassword
          });
          
          // Sign out the newly created user
          await signOut(auth);
          
          toast.success('Firebase Auth account recreated with new password');
        } else if (signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
          // Current password doesn't work, try sending reset email
          toast('Stored password invalid. Sending password reset email...', { icon: '📧' });
          await sendPasswordResetEmail(auth, userEmail);
          
          // Update the password in Firestore
          await updateDoc(doc(db, 'users', resetPasswordData.userId), {
            password: resetPasswordData.newPassword
          });
          
          toast.success(`Password reset email sent to ${userEmail}. User must check their email. Password saved in system.`);
          setShowResetPasswordModal(false);
          setResetPasswordData({ userId: '', userName: '', newPassword: '' });
          return;
        } else {
          throw signInError;
        }
      }
      
      // Step 5: Sign back in as Regional Engineer
      if (adminEmail) {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      }

      toast.success(`Password updated for ${resetPasswordData.userName}`);
      setShowResetPasswordModal(false);
      setResetPasswordData({ userId: '', userName: '', newPassword: '' });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect admin password');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Email already has a Firebase Auth account. Try a different method.');
      } else {
        toast.error('Failed to reset password: ' + (error.message || 'Unknown error'));
      }
      
      // Try to recover by signing in as admin again
      const adminPassword = prompt('Please enter YOUR password to sign back in:');
      try {
        if (user?.email && adminPassword) {
          await signInWithEmailAndPassword(auth, user.email, adminPassword);
        }
      } catch (recoveryError) {
        toast.error('Please log in again');
      }
    }
  };

  // Recreate Firebase Auth account for users whose auth was deleted
  const handleRecreateAuthAccount = async (userId: string, userName: string, userEmail: string) => {
    // Get user data first to check for password
    const userDocSnapshot = await getDoc(doc(db, 'users', userId));
    if (!userDocSnapshot.exists()) {
      toast.error('User not found in Firestore');
      return;
    }

    const userData = userDocSnapshot.data();
    const hasStoredPassword = !!userData.password;

    // If no stored password, prompt for one
    let passwordToUse = userData.password;
    if (!hasStoredPassword) {
      passwordToUse = prompt(`No password stored for ${userName}.\n\nPlease enter a new password for this user (min 6 characters):`);
      if (!passwordToUse || passwordToUse.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    }

    if (!confirm(`Recreate Firebase Authentication account for ${userName}?\n\n${hasStoredPassword ? 'This will create a new Auth account using the stored password.' : 'This will create a new Auth account with the password you provided.'}\n\nUser: ${userEmail}\nPassword: ${hasStoredPassword ? '(stored in Firestore)' : passwordToUse}`)) {
      return;
    }

    const adminPassword = prompt('Please enter YOUR password to continue:');
    if (!adminPassword) {
      toast.error('Admin password required');
      return;
    }

    try {
      // Create new Firebase Auth account
      const newUserCredential = await createUserWithEmailAndPassword(auth, userEmail, passwordToUse);

      // Update Firestore document with new UID and password
      await updateDoc(doc(db, 'users', userId), {
        uid: newUserCredential.user.uid,
        password: passwordToUse // Store the password for future reference
      });

      // Sign out the newly created user
      await signOut(auth);

      // Sign back in as admin
      if (user?.email) {
        await signInWithEmailAndPassword(auth, user.email, adminPassword);
      }

      toast.success(`✅ Firebase Auth account recreated for ${userName}!\nEmail: ${userEmail}\nPassword: ${passwordToUse}`, { duration: 6000 });
    } catch (error: any) {
      console.error('Error recreating auth account:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('❌ Email already has a Firebase Auth account. No recreation needed.');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect admin password');
      } else {
        toast.error('Failed to recreate auth account: ' + (error.message || 'Unknown error'));
      }

      // Try to recover by signing in as admin again
      try {
        if (user?.email && adminPassword) {
          await signInWithEmailAndPassword(auth, user.email, adminPassword);
        }
      } catch (recoveryError) {
        toast.error('Please log in again');
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
            <p className="text-gray-600 font-medium">Loading users...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== ROLES.REGIONAL_ENGINEER) {
    return null;
  }

  return (
    <Layout>
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-xl shadow-lg mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">User Management</h1>
              <div className="flex items-center gap-2 text-blue-100">
                <Shield size={16} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                <span className="text-xs sm:text-sm">Regional Engineer Access Only</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {users.length === 0 && (
              <button
                onClick={handleSyncTestAccounts}
                disabled={syncing}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white/20 text-white rounded-lg hover:bg-white/30 active:scale-[0.98] transition font-medium shadow-sm backdrop-blur-sm disabled:opacity-50 w-full sm:w-auto text-sm sm:text-base"
              >
                {syncing ? (
                  <>
                    <Loader2 className="animate-spin flex-shrink-0" size={16} />
                    <span className="sm:inline">Syncing...</span>
                  </>
                ) : (
                  <>
                    <Users className="flex-shrink-0" size={16} />
                    <span className="sm:inline">Sync Test Accounts</span>
                  </>
                )}
              </button>
            )}
            {users.length > 0 && (
              <button
                onClick={handleCleanDuplicates}
                disabled={cleaningDuplicates}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white/20 text-white rounded-lg hover:bg-white/30 active:scale-[0.98] transition font-medium shadow-sm backdrop-blur-sm disabled:opacity-50 w-full sm:w-auto text-sm sm:text-base"
                title="Remove duplicate user entries (same email, different UIDs)"
              >
                {cleaningDuplicates ? (
                  <>
                    <Loader2 className="animate-spin flex-shrink-0" size={16} />
                    <span className="sm:inline">Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="flex-shrink-0" size={16} />
                    <span className="sm:inline">Clean Duplicates</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-blue-50 active:scale-[0.98] transition font-medium shadow-sm w-full sm:w-auto text-sm sm:text-base"
            >
              <UserPlus className="flex-shrink-0" size={16} />
              <span>Add New User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert for Acting Officers - Firebase Auth Help */}
      {users.some(u => u.email.toLowerCase() !== 'aedambullanwsdb@gmail.com') && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg shadow-sm">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <AlertCircle className="text-purple-600" size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-purple-900 flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <UserPlus size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Firebase Auth Account Management</span>
                </h3>
                <button
                  onClick={() => setShowAuthBanner(!showAuthBanner)}
                  className="p-1.5 sm:p-1 hover:bg-purple-100 rounded transition-colors active:scale-95 flex-shrink-0"
                  title={showAuthBanner ? "Hide" : "Show"}
                >
                  {showAuthBanner ? (
                    <ChevronUp size={16} className="sm:w-[18px] sm:h-[18px] text-purple-700" />
                  ) : (
                    <ChevronDown size={16} className="sm:w-[18px] sm:h-[18px] text-purple-700" />
                  )}
                </button>
              </div>
              {showAuthBanner && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs sm:text-sm text-purple-800 mb-2">
                    <strong>If users are getting "Invalid credentials" errors:</strong> Their Firebase Authentication accounts may be missing or deleted.
                  </p>
                  <div className="bg-white/60 rounded-lg p-2 sm:p-3 space-y-2">
                    <p className="text-[10px] sm:text-xs text-purple-700 font-medium flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 text-white rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      <span>Click the <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold"><UserPlus size={10} /> purple button</span> next to the Acting Officer</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-purple-700 font-medium flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 text-white rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      <span>The system will recreate their Firebase Auth account with their stored password</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-purple-700 font-medium flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 text-white rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      <span>User can then log in immediately with their credentials</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Users Info */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg shadow-sm">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg flex-shrink-0">
            <Users className="text-amber-600" size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <Trash2 size={14} className="sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Duplicate User Prevention</span>
              </h3>
              <button
                onClick={() => setShowDuplicateBanner(!showDuplicateBanner)}
                className="p-1.5 sm:p-1 hover:bg-amber-100 rounded transition-colors active:scale-95 flex-shrink-0"
                title={showDuplicateBanner ? "Hide" : "Show"}
              >
                {showDuplicateBanner ? (
                  <ChevronUp size={16} className="sm:w-[18px] sm:h-[18px] text-amber-700" />
                ) : (
                  <ChevronDown size={16} className="sm:w-[18px] sm:h-[18px] text-amber-700" />
                )}
              </button>
            </div>
            {showDuplicateBanner && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs sm:text-sm text-amber-800 mb-2">
                  The system now <strong>automatically removes duplicate users</strong> from the list. If you see the same email multiple times, click <strong>"Clean Duplicates"</strong> above.
                </p>
                <div className="bg-white/60 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-amber-700">
                  <p><strong>✓ Auto-Prevention:</strong> Login system now checks for existing email before creating new profiles</p>
                  <p><strong>✓ Display Filter:</strong> User table shows only the most recent entry for each email</p>
                  <p><strong>✓ Manual Cleanup:</strong> Use "Clean Duplicates" button to permanently remove old duplicate entries</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm border active:scale-[0.98] transition cursor-pointer">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <Users size={18} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Total Users</p>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">{users.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm border active:scale-[0.98] transition cursor-pointer">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-green-100 rounded-lg flex-shrink-0">
              <Shield size={18} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Active Users</p>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">{users.filter(u => !u.blocked).length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow-sm border active:scale-[0.98] transition cursor-pointer col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 lg:p-3 bg-red-100 rounded-lg flex-shrink-0">
              <ShieldOff size={18} className="sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-gray-500 truncate">Blocked Users</p>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">{users.filter(u => u.blocked).length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Office</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Session Info</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((userData) => (
                <tr key={userData.id} className={cn(
                  "hover:bg-gray-50 transition",
                  userData.blocked && "bg-red-50/50"
                )}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserIcon size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{userData.name}</p>
                          {userData.email.toLowerCase() !== 'aedambullanwsdb@gmail.com' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium" title="Acting Officer - Click purple button if login fails">
                              <UserIcon size={10} />
                              Acting Officer
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail size={12} />
                          {userData.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                      <Building2 size={14} />
                      {userData.office}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold",
                      userData.role === ROLES.REGIONAL_ENGINEER 
                        ? "bg-purple-100 text-purple-700"
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {userData.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {userData.blocked ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        <ShieldOff size={12} />
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                        <Shield size={12} />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs space-y-0.5 max-w-[180px]">
                      {userData.lastLogin && (
                        <div className="text-gray-700">
                          <span className="text-gray-500">Login:</span>{' '}
                          {formatRelativeTime(userData.lastLogin?.toDate?.())}
                        </div>
                      )}
                      {userData.lastActivity && (
                        <div className="text-gray-700">
                          <span className="text-gray-500">Active:</span>{' '}
                          {formatRelativeTime(userData.lastActivity?.toDate?.())}
                        </div>
                      )}
                      {userData.loginCount !== undefined && (
                        <div className="text-gray-700">
                          <span className="text-gray-500">Count:</span>{' '}
                          <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">
                            {userData.loginCount}
                          </span>
                        </div>
                      )}
                      {!userData.lastLogin && !userData.lastActivity && (
                        <p className="text-gray-400">No data</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {userData.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleBlock(userData.id, userData.blocked)}
                        className={cn(
                          "p-2 rounded-lg transition",
                          userData.blocked
                            ? "bg-green-100 hover:bg-green-200 text-green-700"
                            : "bg-orange-100 hover:bg-orange-200 text-orange-700"
                        )}
                        title={userData.blocked ? "Unblock user" : "Block user"}
                      >
                        {userData.blocked ? <Shield size={16} /> : <ShieldOff size={16} />}
                      </button>
                      {/* Recreate Auth - For all Acting Officers */}
                      {userData.email.toLowerCase() !== 'aedambullanwsdb@gmail.com' && (
                        <button
                          onClick={() => handleRecreateAuthAccount(userData.id, userData.name, userData.email)}
                          className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition group relative"
                          title="Recreate Firebase Auth account"
                        >
                          <UserPlus size={16} />
                          <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            🔄 Recreate Firebase Auth
                          </span>
                        </button>
                      )}
                      {/* Password Reset - Only for Acting Officers */}
                      {userData.email.toLowerCase() !== 'aedambullanwsdb@gmail.com' && (
                        <button
                          onClick={() => handleResetPassword(userData.id, userData.name, userData.email)}
                          className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition"
                          title="Reset password"
                        >
                          <Key size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(userData.id, userData.name)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <AlertCircle className="mx-auto mb-3 text-gray-400" size={48} />
                    <p className="text-gray-500 font-medium mb-2">No users found in Firestore</p>
                    <p className="text-sm text-gray-400 mb-4">
                      If you have existing Firebase Auth users, click "Sync Test Accounts" above
                      <br />
                      or create a new user to get started
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {users.map((userData) => (
          <div
            key={userData.id}
            className={cn(
              "bg-white rounded-xl shadow-sm border p-4 active:scale-[0.98] transition",
              userData.blocked && "bg-red-50/50 border-red-200"
            )}
          >
            {/* User Info */}
            <div className="flex items-start gap-3 mb-3 pb-3 border-b">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">{userData.name}</h3>
                  {userData.email.toLowerCase() !== 'aedambullanwsdb@gmail.com' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium flex-shrink-0" title="Acting Officer">
                      <UserIcon size={8} />
                      Acting
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5 break-all">
                  <Mail size={10} className="flex-shrink-0" />
                  {userData.email}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                    <Building2 size={10} className="flex-shrink-0" />
                    <span className="truncate">{userData.office}</span>
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    userData.role === ROLES.REGIONAL_ENGINEER 
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    {userData.role}
                  </span>
                  {userData.blocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-semibold">
                      <ShieldOff size={10} />
                      Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-semibold">
                      <Shield size={10} />
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Session Info */}
            <div className="mb-3 pb-3 border-b">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Session Information</p>
              <div className="text-xs space-y-1">
                {userData.lastLogin && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Login:</span>
                    <span className="text-gray-700 font-medium">{formatRelativeTime(userData.lastLogin?.toDate?.())}</span>
                  </div>
                )}
                {userData.lastActivity && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Active:</span>
                    <span className="text-gray-700 font-medium">{formatRelativeTime(userData.lastActivity?.toDate?.())}</span>
                  </div>
                )}
                {userData.loginCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Login Count:</span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-semibold">
                      {userData.loginCount}
                    </span>
                  </div>
                )}
                {!userData.lastLogin && !userData.lastActivity && (
                  <p className="text-gray-400 text-center py-1">No session data</p>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-700 font-medium">{userData.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleToggleBlock(userData.id, userData.blocked)}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition active:scale-95 text-xs font-medium",
                  userData.blocked
                    ? "bg-green-100 hover:bg-green-200 text-green-700"
                    : "bg-orange-100 hover:bg-orange-200 text-orange-700"
                )}
              >
                {userData.blocked ? (
                  <>
                    <Shield size={14} className="flex-shrink-0" />
                    <span>Unblock</span>
                  </>
                ) : (
                  <>
                    <ShieldOff size={14} className="flex-shrink-0" />
                    <span>Block</span>
                  </>
                )}
              </button>
              {userData.email.toLowerCase() !== 'aedambullanwsdb@gmail.com' && (
                <>
                  <button
                    onClick={() => handleRecreateAuthAccount(userData.id, userData.name, userData.email)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition active:scale-95 text-xs font-medium"
                    title="Recreate Firebase Auth"
                  >
                    <UserPlus size={14} className="flex-shrink-0" />
                    <span>Recreate Auth</span>
                  </button>
                  <button
                    onClick={() => handleResetPassword(userData.id, userData.name, userData.email)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition active:scale-95 text-xs font-medium"
                    title="Reset password"
                  >
                    <Key size={14} className="flex-shrink-0" />
                    <span>Reset Password</span>
                  </button>
                </>
              )}
              <button
                onClick={() => handleDeleteUser(userData.id, userData.name)}
                className={cn(
                  "flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition active:scale-95 text-xs font-medium",
                  userData.email.toLowerCase() !== 'aedambullanwsdb@gmail.com' ? "" : "col-span-1"
                )}
                title="Delete user"
              >
                <Trash2 size={14} className="flex-shrink-0" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <AlertCircle className="mx-auto mb-3 text-gray-400" size={40} />
            <p className="text-gray-500 font-medium mb-2 text-sm">No users found in Firestore</p>
            <p className="text-xs text-gray-400 mb-4">
              If you have existing Firebase Auth users, click "Sync Test Accounts" above
              or create a new user to get started
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Add New User</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">Create a new Acting Officer account</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition active:scale-95 flex-shrink-0 ml-2"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Enter full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="user@nwsdb.lk"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-base"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:scale-95"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 sm:px-4 py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-lg transition text-xs sm:text-sm font-medium whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              {/* Office */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Office <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.office}
                  onChange={(e) => setFormData(prev => ({ ...prev, office: e.target.value as Office }))}
                  className="w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                >
                  {OFFICE_LIST.filter(office => office.value !== OFFICES.REGIONAL_ENGINEER).map(office => (
                    <option key={office.value} value={office.value}>{office.label}</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
                  className="w-full px-3 sm:px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                >
                  <option value={ROLES.ACTING_OFFICER}>Acting Officer</option>
                  <option value={ROLES.REGIONAL_ENGINEER}>Regional Engineer</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-3 sm:px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition font-medium text-sm sm:text-base"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="animate-spin flex-shrink-0" size={16} />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="flex-shrink-0" size={16} />
                      <span>Create User</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowResetPasswordModal(false);
                setResetPasswordData({ userId: '', userName: '', newPassword: '' });
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-gray-600 active:scale-95 transition z-10"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>

            {/* Header */}
            <div className="p-4 sm:p-6 border-b">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Key className="text-blue-600" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 truncate">Reset Password</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">for {resetPasswordData.userName}</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPasswordReset} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {/* New Password */}
              <div className="relative">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={resetPasswordData.newPassword}
                    onChange={(e) => setResetPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:scale-95 transition"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetPasswordData({ userId: '', userName: '', newPassword: '' });
                  }}
                  className="flex-1 px-3 sm:px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98] transition font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition font-medium flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Key className="flex-shrink-0" size={16} />
                  <span>Reset Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UserManagement;
