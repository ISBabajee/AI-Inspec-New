import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, LoginRecord, UserStatus, UserRole } from '../types';
import { useAuth } from './useAuth';
import { db } from '../src/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

const MOCK_USERS_DB_KEY = 'techlens_users';
const MOCK_LOGIN_RECORDS_DB_KEY = 'techlens_login_records';
type StoredUser = User & { password?: string; passwordHash?: string; salt?: string };

const arrayBufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
};


interface AdminContextType {
  allUsers: User[];
  allLoginRecords: LoginRecord[];
  loading: boolean;
  error: string | null;
  refreshAdminData: () => void;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<boolean>;
  adminCreateUser: (name: string, email: string, phoneNumber?: string, validUntil?: string) => Promise<(User & {password?: string}) | null>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allLoginRecords, setAllLoginRecords] = useState<LoginRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const { initialAuthCompleted } = useAuth();

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
  
    const fetchAdminData = useCallback(async () => {
        if (!initialAuthCompleted) return;
        setLoading(true);
        setError(null);
        try {
            // Standard Mock Data Loading
            const usersWithSecurityFields = getMockUsers();
            let usersForContext = usersWithSecurityFields.map(u => {
              const { password, passwordHash, salt, ...userWithoutPassword } = u;
              return userWithoutPassword as User;
            });

            const recordsJson = localStorage.getItem(MOCK_LOGIN_RECORDS_DB_KEY);
            let records = recordsJson ? JSON.parse(recordsJson).map((r: LoginRecord) => ({...r, loginTimestamp: new Date(r.loginTimestamp), logoutTimestamp: r.logoutTimestamp ? new Date(r.logoutTimestamp) : undefined })) : [];

            // If online, let's sync and load real-time users and records from Firestore
            if (navigator.onLine) {
              try {
                // Fetch users
                const userSnap = await getDocs(collection(db, 'users'));
                const fsUsers: User[] = [];
                userSnap.forEach(snap => {
                  fsUsers.push(snap.data() as User);
                });

                // Merge and update local storage users (so local mock DB has all Firestore users)
                const mergedUsers = [...usersWithSecurityFields];
                fsUsers.forEach(fUser => {
                  const idx = mergedUsers.findIndex(mu => mu.id === fUser.id || mu.email === fUser.email);
                  if (idx === -1) {
                    mergedUsers.push({ ...fUser });
                  } else {
                    mergedUsers[idx] = { ...mergedUsers[idx], ...fUser };
                  }
                });
                localStorage.setItem(MOCK_USERS_DB_KEY, JSON.stringify(mergedUsers));
                usersForContext = mergedUsers.map(({ password, passwordHash, salt, ...u }) => u);

                // Fetch login records
                const loginSnap = await getDocs(collection(db, 'loginRecords'));
                const fsRecords: LoginRecord[] = [];
                loginSnap.forEach(snap => {
                  const data = snap.data();
                  fsRecords.push({
                    ...data,
                    loginTimestamp: new Date(data.loginTimestamp),
                    logoutTimestamp: data.logoutTimestamp ? new Date(data.logoutTimestamp) : undefined
                  } as LoginRecord);
                });

                // Merge login records
                const mergedRecords = [...records];
                fsRecords.forEach(fRec => {
                  if (!mergedRecords.some(r => r.id === fRec.id)) {
                    mergedRecords.push(fRec);
                  }
                });
                localStorage.setItem(MOCK_LOGIN_RECORDS_DB_KEY, JSON.stringify(mergedRecords));
                records = mergedRecords;

              } catch (e) {
                console.warn("Could not sync admin view with Firestore:", e);
              }
            }

            setAllUsers(usersForContext);
            setAllLoginRecords(records);

        } catch (err) {
            console.error("Error fetching admin data:", err);
            setError("Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    }, [initialAuthCompleted]);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    const updateUserStatus = async (userId: string, status: UserStatus): Promise<boolean> => {
        setActionLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        let users = getMockUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].status = status;
            saveMockUsers(users);

            if (navigator.onLine) {
              try {
                await updateDoc(doc(db, 'users', userId), { status: status });
              } catch (e) {
                console.warn("Failed to update status on Firestore:", e);
              }
            }

            setActionLoading(false);
            fetchAdminData(); // Refresh data after update
            return true;
        }
        setActionLoading(false);
        return false;
    };

    const adminCreateUser = async (name: string, email: string, phoneNumber?: string, validUntil?: string): Promise<(User & {password?: string}) | null> => {
        setActionLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        let users = getMockUsers();
        if (users.find(u => u.email === email)) {
            setActionLoading(false);
            throw new Error("User already exists with this email.");
        }

        const generatedPassword = `${name.split(' ')[0]}@${phoneNumber ? phoneNumber.slice(-4) : new Date().getFullYear().toString().slice(-2)}`;
        const salt = arrayBufferToHex(crypto.getRandomValues(new Uint8Array(16)));
        const passwordHash = await hashPassword(generatedPassword, salt);

        const newUser: StoredUser = {
            id: crypto.randomUUID(),
            email, name, phoneNumber, validUntil,
            role: UserRole.SITE_ENGINEER,
            status: 'approved',
            salt, passwordHash,
        };

        users.push(newUser);
        saveMockUsers(users);

        if (navigator.onLine) {
          try {
            const { password, passwordHash: storedHash, salt: storedSalt, ...profile } = newUser;
            await setDoc(doc(db, 'users', newUser.id), profile);
          } catch (e) {
            console.warn("Failed to save newly created user to Firestore:", e);
          }
        }

        setActionLoading(false);
        fetchAdminData(); // Refresh
        
        const { passwordHash: storedHash, salt: storedSalt, ...userToReturn } = newUser;
        return { ...userToReturn, password: generatedPassword };
    };

    const value = {
        allUsers,
        allLoginRecords,
        loading: loading || actionLoading,
        error,
        refreshAdminData: fetchAdminData,
        updateUserStatus,
        adminCreateUser,
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
