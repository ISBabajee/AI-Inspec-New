
import React, { useState, useMemo, useRef } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { User, UserRole, UserStatus } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAccessibility } from '../../hooks/useAccessibility';

const CreateUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onUserCreated: (user: User, password?: string) => void;
}> = ({ isOpen, onClose, onUserCreated }) => {
    const { adminCreateUser, loading: adminLoading } = useAdmin();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    useAccessibility(modalRef, isOpen, onClose);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name || !email) {
            setError("Name and Email are required.");
            return;
        }
        try {
            const newUser = await adminCreateUser(name, email, phoneNumber, validUntil);
            if (newUser) {
                onUserCreated(newUser, newUser.password);
                onClose();
                // Reset form
                setName(''); setEmail(''); setPhoneNumber(''); setValidUntil('');
            }
        } catch (err) {
            setError((err as Error).message || "Failed to create user.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div 
                ref={modalRef} 
                className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-lg" 
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-user-modal-title"
            >
                <h3 id="create-user-modal-title" className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Create New Site Engineer</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-300 p-3 rounded-md text-sm" role="alert">{error}</p>}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Full Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Email Address</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Phone Number (Optional)</label>
                        <input type="tel" id="phoneNumber" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="validUntil" className="block text-sm font-medium text-slate-700 dark:text-gray-300">Valid Until (Optional)</label>
                        <input type="date" id="validUntil" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-slate-900 dark:text-white" />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={adminLoading} className="px-4 py-2 bg-brand-light-blue text-white rounded-md hover:bg-sky-500 disabled:bg-sky-400 flex items-center">{adminLoading ? <LoadingSpinner size="sm" /> : "Create User"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagementPage: React.FC = () => {
  const { allUsers, updateUserStatus, loading: adminLoading } = useAdmin();
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserFeedback, setNewUserFeedback] = useState<{message: string, isError: boolean} | null>(null);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesStatus && matchesRole;
    });
  }, [allUsers, statusFilter, roleFilter]);

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
    setActionLoading(prev => ({...prev, [userId]: true}));
    const success = await updateUserStatus(userId, newStatus);
    if (!success) {
      alert(`Failed to update status for user ${userId}.`);
    }
    setActionLoading(prev => ({...prev, [userId]: false}));
  };

  const handleUserCreated = (user: User, password?: string) => {
    setNewUserFeedback({ message: `User "${user.name}" created successfully. Password: ${password}`, isError: false });
    setTimeout(() => setNewUserFeedback(null), 10000); // Hide feedback after 10 seconds
  };
  
  const getValidityStatus = (user: User): { text: string, className: string } => {
    if (!user.validUntil) {
        return { text: 'Active (No Limit)', className: 'text-green-700 dark:text-green-400' };
    }
    const validDate = new Date(user.validUntil);
    const today = new Date();
    today.setHours(0,0,0,0); // Compare dates only
    validDate.setHours(23,59,59,999); // Validity lasts until the end of the day

    if (validDate < today) {
        return { text: 'Expired', className: 'text-red-700 dark:text-red-400' };
    }
    return { text: 'Active', className: 'text-green-700 dark:text-green-400' };
  };

  if (adminLoading && !Object.values(actionLoading).some(v => v)) {
    return <LoadingSpinner text="Loading users..." />;
  }
  
  const getStatusClass = (status: UserStatus) => {
    switch(status) {
        case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
        case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
        default: return 'bg-slate-100 text-slate-700';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">User Management</h1>
        <button onClick={() => setIsModalOpen(true)} className="mt-3 sm:mt-0 bg-brand-light-blue hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors">
            + Create New User
        </button>
      </div>
      
      {newUserFeedback && (
        <div className={`p-3 rounded-md text-sm ${newUserFeedback.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {newUserFeedback.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col">
            <label htmlFor="roleFilter" className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">Role:</label>
            <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-brand-light-blue focus:border-brand-light-blue sm:text-sm"
            >
            <option value="all">All Roles</option>
            <option value={UserRole.SITE_ENGINEER}>Site Engineer</option>
            <option value={UserRole.ADMIN}>Admin</option>
            </select>
        </div>
        <div className="flex flex-col">
            <label htmlFor="statusFilter" className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-1">Status:</label>
            <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
            className="px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-brand-light-blue focus:border-brand-light-blue sm:text-sm"
            >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-2 md:p-6 rounded-lg shadow-xl overflow-x-auto">
        {filteredUsers.length === 0 ? (
            <p className="text-slate-500 dark:text-gray-400 text-center py-4">No users found matching these filters.</p>
        ) : (
        <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
          <thead className="bg-slate-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Email / Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Valid Until</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Validity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-slate-200 dark:divide-gray-700">
            {filteredUsers.map(user => {
              const validity = getValidityStatus(user);
              return (
              <tr key={user.id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{user.name}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-gray-300">{user.role}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-gray-300">
                    <div>{user.email}</div>
                    <div className="text-xs">{user.phoneNumber || 'No phone'}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-gray-300">{user.validUntil ? new Date(user.validUntil).toLocaleDateString() : 'N/A'}</td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${validity.className}`}>{validity.text}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(user.status)}`}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                  {actionLoading[user.id] ? <LoadingSpinner size="sm" /> : (
                    <>
                    {user.status === 'pending' && (
                        <>
                        <button onClick={() => handleUpdateStatus(user.id, 'approved')} className="text-green-600 hover:text-green-800 font-medium">Approve</button>
                        <button onClick={() => handleUpdateStatus(user.id, 'rejected')} className="text-red-600 hover:text-red-800 font-medium">Reject</button>
                        </>
                    )}
                    {user.status === 'approved' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'rejected')} className="text-orange-600 hover:text-orange-800 font-medium">Revoke</button>
                    )}
                    {user.status === 'rejected' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'approved')} className="text-blue-600 hover:text-blue-800 font-medium">Re-Approve</button>
                    )}
                    </>
                  )}
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        )}
      </div>

      <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUserCreated={handleUserCreated} />
    </div>
  );
};

export default UserManagementPage;
