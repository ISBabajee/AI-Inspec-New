

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserNotFoundError, UserPendingApprovalError, UserRejectedError } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserRole } from '../types';

interface ErrorInfo {
  message: React.ReactNode;
  type: 'error' | 'info' | 'warning';
}

const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('test@inspec.ai');
  const [password, setPassword] = useState('test@123');
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (newEmail.toLowerCase() === 'admin@inspec.ai') {
        setPassword('Admin@123');
    } else if (newEmail.toLowerCase() === 'test@inspec.ai') {
        setPassword('test@123');
    } else {
        setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    try {
      const user = await signIn(email, password);
      if (user) {
        if (user.role === UserRole.ADMIN) {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrorInfo({ message: 'Invalid password. Please try again.', type: 'error' });
      }
    } catch (err) {
      const error = err as Error;
      if (error.message === UserNotFoundError) {
        setErrorInfo({
          message: (
            <>
              User with email <strong>{email}</strong> not found. Please{' '}
              <Link
                to="/signup"
                state={{ email: email }}
                className="font-medium text-brand-light-blue hover:text-sky-300 underline"
              >
                sign up
              </Link>
              .
            </>
          ),
          type: 'info'
        });
      } else if (error.message === UserPendingApprovalError) {
        setErrorInfo({ message: 'Your account is pending admin approval. Please check back later.', type: 'warning' });
      } else if (error.message === UserRejectedError) {
         setErrorInfo({ message: 'Your account registration was not approved. Please contact support.', type: 'error' });
      } else {
        setErrorInfo({ message: error.message || 'Failed to sign in. Please try again.', type: 'error' });
      }
    }
  };

  return (
    <div 
      className="min-h-[calc(100vh-104px)] sm:min-h-[calc(100vh-120px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/assets/images/ir-scanner-background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-slate-900/80 backdrop-blur-sm p-6 sm:p-10 rounded-xl shadow-2xl relative border border-slate-700">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errorInfo && (
            <div className={`text-sm p-3 rounded-md border ${
              errorInfo.type === 'info' ? 'bg-blue-900/60 text-blue-200 border-blue-700' : 
              errorInfo.type === 'warning' ? 'bg-amber-900/60 text-amber-200 border-amber-700' :
              'bg-red-900/60 text-red-300 border-red-700'
            }`}
            role={errorInfo.type === 'error' ? 'alert' : 'status'}
            >
              {errorInfo.message}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 bg-slate-800/50 border border-slate-600 placeholder-slate-400 text-white rounded-t-md focus:outline-none focus:ring-2 focus:ring-brand-light-blue focus:border-brand-light-blue focus:z-10 text-sm sm:text-base"
                placeholder="Email address"
                value={email}
                onChange={handleEmailChange}
              />
            </div>
            <div>
              <label htmlFor="password_signin" className="sr-only">Password</label>
              <input
                id="password_signin"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 bg-slate-800/50 border border-slate-600 placeholder-slate-400 text-white rounded-b-md focus:outline-none focus:ring-2 focus:ring-brand-light-blue focus:border-brand-light-blue focus:z-10 text-sm sm:text-base"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-light-blue hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 disabled:bg-sky-300/50 dark:focus:ring-offset-slate-900"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-brand-light-blue hover:text-sky-300">
            Sign up as Site Engineer
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
