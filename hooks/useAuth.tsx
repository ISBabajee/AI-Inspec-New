
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, AuthContextType, UserStatus, LoginRecord } from '../types';

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
  // Simple but effective: concatenate password and salt before hashing.
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
    // If initialization fails, we can't proceed securely.
    localStorage.removeItem(MOCK_USERS_DB_KEY);
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
      // Ensure no plaintext passwords are saved. The `password` property is transient.
      const usersToSave = users.map(({ password, ...rest }) => rest);
      localStorage.setItem(MOCK_USERS_DB_KEY, JSON.stringify(usersToSave));
    } catch (error) {
      console.error("Error saving mock users to localStorage:", error);
    }
  };

  // Login records are now managed in useAdmin, but signIn/signOut still need to interact with them.
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

  const recordLogin = (user: User) => {
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
  };

  const recordLogout = (userId: string) => {
    let records = getLoginRecords();
    const userLastLoginIndex = records.slice().reverse().findIndex(r => r.userId === userId && !r.logoutTimestamp);
    if (userLastLoginIndex !== -1) {
      const actualIndex = records.length - 1 - userLastLoginIndex;
      records[actualIndex].logoutTimestamp = new Date();
      saveLoginRecords(records);
    }
  };

  const signIn = async (email: string, passwordAttempt: string): Promise<User | null> => {
    setIsActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const users = getMockUsers();
    const existingUser = users.find(u => u.email === email);

    if (!existingUser) {
      setIsActionLoading(false);
      throw new Error(UserNotFoundError);
    }

    // --- START: Security Enhancement ---
    if (!existingUser.passwordHash || !existingUser.salt) {
      // This case should not happen with the new initialization logic, but is a safeguard.
      console.error(`User ${email} has no stored password hash or salt.`);
      setIsActionLoading(false);
      throw new Error("Account is not configured correctly. Please contact an administrator.");
    }
    
    const attemptHash = await hashPassword(passwordAttempt, existingUser.salt);

    if (existingUser.passwordHash !== attemptHash) {
      setIsActionLoading(false);
      return null; // Incorrect password
    }
    // --- END: Security Enhancement ---


    // Check validity period
    if (existingUser.validUntil && new Date(existingUser.validUntil) < new Date()) {
       setIsActionLoading(false);
       throw new Error("Your account has expired. Please contact an administrator.");
    }

    // Check status for Site Engineers
    if (existingUser.role === UserRole.SITE_ENGINEER) {
      if (existingUser.status === 'pending') {
        setIsActionLoading(false);
        throw new Error(UserPendingApprovalError);
      }
      if (existingUser.status === 'rejected') {
        setIsActionLoading(false);
        throw new Error(UserRejectedError);
      }
    }
    
    // Login successful
    const { password, passwordHash, salt, ...userToReturn } = existingUser;
    setCurrentUser(userToReturn as User);
    localStorage.setItem('techlens_currentUser', JSON.stringify(userToReturn));
    recordLogin(userToReturn as User);
    setIsActionLoading(false);
    return userToReturn as User;
  };

  const signUp = async (email: string, passwordProvided: string, role: UserRole): Promise<User | null> => {
    if (role === UserRole.ADMIN) {
        throw new Error(AdminCannotSignUpError);
    }
    setIsActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    let users = getMockUsers();
    if (users.find(u => u.email === email)) {
      setIsActionLoading(false);
      throw new Error("User already exists with this email.");
    }

    // --- START: Security Enhancement ---
    const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashPassword(passwordProvided, salt);

    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email,
      name: `User-${email.split('@')[0]}`,
      role,
      status: role === UserRole.SITE_ENGINEER ? 'pending' : 'approved',
      salt,
      passwordHash,
    };
    // --- END: Security Enhancement ---

    users.push(newUser);
    saveMockUsers(users);

    const { password, passwordHash: storedHash, salt: storedSalt, ...userToReturn } = newUser;
    // For site engineers, sign up does not mean immediate login due to pending status
    if (userToReturn.role === UserRole.ADMIN) { // Should not happen with current UI flow but for completeness
        setCurrentUser(userToReturn as User);
        localStorage.setItem('techlens_currentUser', JSON.stringify(userToReturn));
        recordLogin(userToReturn as User);
    }
    setIsActionLoading(false);
    return userToReturn as User; // Return user object, but UI will handle pending status message
  };

  const signOut = () => {
    if (currentUser) {
      recordLogout(currentUser.id);
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