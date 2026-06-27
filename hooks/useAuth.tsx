import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthContextType, UserStatus, LoginRecord } from '../types';
import { auth, db } from '../src/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- START: Security Enhancements ---
// Helper to convert ArrayBuffer to a Hex string for storage
const arrayBufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Hashes a password with a given salt using the Web Crypto API
const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
};
// --- END: Security Enhancements ---


const MOCK_USERS_DB_KEY = 'techlens_users';
const MOCK_LOGIN_RECORDS_DB_KEY = 'techlens_login_records';

export const UserNotFoundError = 'USER_NOT_FOUND';
export const UserPendingApprovalError = 'USER_PENDING_APPROVAL';
export const UserRejectedError = 'USER_REJECTED';
export const AdminCannotSignUpError = 'ADMIN_CANNOT_SIGN_UP';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the stored user type which includes security fields
type StoredUser = User & { password?: string; passwordHash?: string; salt?: string };


// Helper to ensure default admin and test users exist and are secure
const initializeMockUsers = async () => {
  try {
    const usersJson = localStorage.getItem(MOCK_USERS_DB_KEY);
    let users: StoredUser[] = usersJson ? JSON.parse(usersJson) : [];
    const adminEmail = 'admin@inspec.ai';
    const testUserEmail = 'test@inspec.ai';

    // Migrate any existing users from plaintext passwords to hashed passwords
    const migrationPromises = users.map(async (user) => {
      if (user.password && !user.passwordHash) {
        console.log(`Migrating user ${user.email} to hashed password.`);
        const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)));
        user.salt = salt;
        user.passwordHash = await hashPassword(user.password, salt);
        delete user.password;
      }
      return user;
    });
    users = await Promise.all(migrationPromises);
    
    // Ensure Admin user exists
    let adminUser = users.find(u => u.email === adminEmail && u.role === UserRole.ADMIN);
    if (!adminUser) {
        const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)));
        const passwordHash = await hashPassword('Admin@123', salt);
        users.push({
            id: `admin_${Date.now()}`,
            email: adminEmail,
            name: 'Default Admin',
            role: UserRole.ADMIN,
            status: 'approved',
            salt,
            passwordHash
        });
    }

    // Ensure Test user exists
    let testUser = users.find(u => u.email === testUserEmail);
    if (!testUser) {
        const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)));
        const passwordHash = await hashPassword('test@123', salt);
        users.push({
            id: `test_${Date.now()}`,
            email: testUserEmail,
            name: 'Test Engineer',
            role: UserRole.SITE_ENGINEER,
            status: 'approved',
            salt,
            passwordHash
        });
    }

    localStorage.setItem(MOCK_USERS_DB_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("Error initializing mock users:", error);
  }
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [initialAuthCompleted, setInitialAuthCompleted] = useState(false);

  useEffect(() => {
    const initialize = async () => {
        await initializeMockUsers(); // Ensure users exist and are secure
        try {
            const storedUser = localStorage.getItem('techlens_currentUser');
            if (storedUser) {
              setCurrentUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Error loading user from localStorage:", error);
            localStorage.removeItem('techlens_currentUser');
        }

        // Sync default profiles to Firestore so they are recognized by database rules
        if (navigator.onLine) {
          try {
            const localUsers = getMockUsers();
            for (const user of localUsers) {
              const { password, passwordHash, salt, ...profile } = user;
              await setDoc(doc(db, 'users', user.id), profile, { merge: true });
            }
          } catch (e) {
            console.warn("Could not sync profiles to Firestore:", e);
          }
        }

        setInitialAuthCompleted(true);
    };
    initialize();
  }, []);

  const getMockUsers = (): StoredUser[] => {
    try {
      const users = localStorage.getItem(MOCK_USERS_DB_KEY);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error("Error loading mock users from localStorage:", error);
      return [];
    }
  };

  const saveMockUsers = (users: StoredUser[]): void => {
    try {
      const usersToSave = users.map(({ password, ...rest }) => rest);
      localStorage.setItem(MOCK_USERS_DB_KEY, JSON.stringify(usersToSave));
    } catch (error) {
      console.error("Error saving mock users to localStorage:", error);
    }
  };

  const getLoginRecords = (): LoginRecord[] => {
    try {
      const records = localStorage.getItem(MOCK_LOGIN_RECORDS_DB_KEY);
      return records ? JSON.parse(records).map((r: LoginRecord) => ({...r, loginTimestamp: new Date(r.loginTimestamp), logoutTimestamp: r.logoutTimestamp ? new Date(r.logoutTimestamp) : undefined })) : [];
    } catch (error) {
      console.error("Error loading login records:", error);
      return [];
    }
  };

  const saveLoginRecords = (records: LoginRecord[]): void => {
    try {
      localStorage.setItem(MOCK_LOGIN_RECORDS_DB_KEY, JSON.stringify(records));
    } catch (error) {
      console.error("Error saving login records:", error);
    }
  };

  const recordLogin = async (user: User) => {
    const records = getLoginRecords();
    const newRecord: LoginRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      loginTimestamp: new Date(),
    };
    records.push(newRecord);
    saveLoginRecords(records);

    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'loginRecords', newRecord.id), {
          ...newRecord,
          loginTimestamp: newRecord.loginTimestamp.toISOString(),
        });
      } catch (error) {
        console.warn("Could not write login record to Firestore:", error);
      }
    }
  };

  const recordLogout = async (userId: string) => {
    let records = getLoginRecords();
    const userLastLoginIndex = records.slice().reverse().findIndex(r => r.userId === userId && !r.logoutTimestamp);
    if (userLastLoginIndex !== -1) {
      const actualIndex = records.length - 1 - userLastLoginIndex;
      const finishedRecord = { ...records[actualIndex], logoutTimestamp: new Date() };
      records[actualIndex] = finishedRecord;
      saveLoginRecords(records);

      if (navigator.onLine) {
        try {
          await setDoc(doc(db, 'loginRecords', finishedRecord.id), {
            ...finishedRecord,
            loginTimestamp: finishedRecord.loginTimestamp.toISOString(),
            logoutTimestamp: finishedRecord.logoutTimestamp.toISOString(),
          }, { merge: true });
        } catch (error) {
          console.warn("Could not update logout record on Firestore:", error);
        }
      }
    }
  };

  const signIn = async (email: string, passwordAttempt: string): Promise<User | null> => {
    setIsActionLoading(true);
    let userToReturn: User | null = null;

    if (navigator.onLine) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, passwordAttempt);
        const uid = userCredential.user.uid;
        
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          userToReturn = userDoc.data() as User;
        } else {
          const users = getMockUsers();
          const localUser = users.find(u => u.email === email);
          const name = localUser?.name || `User-${email.split('@')[0]}`;
          const role = localUser?.role || UserRole.SITE_ENGINEER;
          const status = localUser?.status || 'approved';
          
          userToReturn = {
            id: uid,
            email,
            name,
            role,
            status
          };
          await setDoc(doc(db, 'users', uid), userToReturn);
        }
      } catch (fbError: any) {
        console.warn("Firebase sign in failed or not configured, falling back to local auth:", fbError);
      }
    }

    if (!userToReturn) {
      const users = getMockUsers();
      const existingUser = users.find(u => u.email === email);

      if (!existingUser) {
        setIsActionLoading(false);
        throw new Error(UserNotFoundError);
      }

      if (!existingUser.passwordHash || !existingUser.salt) {
        setIsActionLoading(false);
        throw new Error("Account is not configured correctly. Please contact an administrator.");
      }

      const calculatedHash = await hashPassword(passwordAttempt, existingUser.salt);
      if (calculatedHash !== existingUser.passwordHash) {
        setIsActionLoading(false);
        throw new Error("Invalid password.");
      }

      const { password, passwordHash, salt, ...rest } = existingUser;
      userToReturn = rest as User;
    }

    if (userToReturn.validUntil && new Date(userToReturn.validUntil) < new Date()) {
       setIsActionLoading(false);
       throw new Error("Your account has expired. Please contact an administrator.");
    }

    if (userToReturn.role === UserRole.SITE_ENGINEER) {
      if (userToReturn.status === 'pending') {
        setIsActionLoading(false);
        throw new Error(UserPendingApprovalError);
      }
      if (userToReturn.status === 'rejected') {
        setIsActionLoading(false);
        throw new Error(UserRejectedError);
      }
    }

    setCurrentUser(userToReturn);
    localStorage.setItem('techlens_currentUser', JSON.stringify(userToReturn));
    await recordLogin(userToReturn);
    
    if (navigator.onLine) {
      try {
        const { syncFirestoreToLocal } = await import('../src/db');
        await syncFirestoreToLocal();
      } catch (syncErr) {
        console.error("Post-login sync failed:", syncErr);
      }
    }

    setIsActionLoading(false);
    return userToReturn;
  };

  const signUp = async (email: string, passwordProvided: string, role: UserRole): Promise<User | null> => {
    if (role === UserRole.ADMIN) {
        throw new Error(AdminCannotSignUpError);
    }
    setIsActionLoading(true);
    let newUser: StoredUser | null = null;

    if (navigator.onLine) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, passwordProvided);
        const uid = userCredential.user.uid;

        newUser = {
          id: uid,
          email,
          name: `User-${email.split('@')[0]}`,
          role,
          status: 'pending',
        };

        await setDoc(doc(db, 'users', uid), newUser);
      } catch (fbError: any) {
        console.warn("Firebase sign up failed, registering locally:", fbError);
      }
    }

    if (!newUser) {
      let users = getMockUsers();
      if (users.find(u => u.email === email)) {
        setIsActionLoading(false);
        throw new Error("User already exists with this email.");
      }

      const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)));
      const passwordHash = await hashPassword(passwordProvided, salt);

      newUser = {
        id: crypto.randomUUID(),
        email,
        name: `User-${email.split('@')[0]}`,
        role,
        status: 'pending',
        salt,
        passwordHash,
      };

      users.push(newUser);
      saveMockUsers(users);
    } else {
      let users = getMockUsers();
      if (!users.find(u => u.email === email)) {
        const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)));
        const passwordHash = await hashPassword(passwordProvided, salt);
        users.push({
          ...newUser,
          salt,
          passwordHash
        });
        saveMockUsers(users);
      }
    }

    const { password, passwordHash: storedHash, salt: storedSalt, ...userToReturn } = newUser;
    setIsActionLoading(false);
    return userToReturn as User;
  };

  const signOut = async () => {
    if (currentUser) {
      await recordLogout(currentUser.id);
    }
    if (navigator.onLine) {
      try {
        await firebaseSignOut(auth);
      } catch (error) {
        console.error("Firebase sign out failed:", error);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('techlens_currentUser');
  };
  
  return (
    <AuthContext.Provider value={{ 
        currentUser, signIn, signUp, signOut, 
        loading: isActionLoading, initialAuthCompleted,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
