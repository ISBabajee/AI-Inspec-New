
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, AdminCannotSignUpError } from '../hooks/useAuth';
import { UserRole } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const SignUpPage: React.FC = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Role is fixed to Site Engineer for public sign-up
  const role: UserRole = UserRole.SITE_ENGINEER;
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.email && email === '') {
      setEmail(location.state.email);
    }
  }, [location.state, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    try {
      const user = await signUp(email, password, role);
      if (user) {
        // Instead of navigating, show a success message about pending approval
        setSuccessMessage("Registration successful! Your account is pending admin approval. You will be notified once it's active.");
        // Optionally, redirect to sign-in page after a delay or let user click
        // setTimeout(() => navigate('/signin'), 5000); 
      }
    } catch (err) {
       if ((err as Error).message === AdminCannotSignUpError) {
            setError("Admin accounts cannot be created through this form.");
       } else {
            setError((err as Error).message || 'Failed to sign up. Please try again.');
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
            Create a Site Engineer account
          </h2>
        </div>
        {successMessage ? (
          <div className="text-center p-4 rounded-md bg-green-900/60 text-green-200 border border-green-700">
            <p className="font-semibold text-lg">Success!</p>
            <p className="mt-2 text-sm">{successMessage}</p>
            <Link to="/signin" className="mt-4 inline-block font-medium text-brand-light-blue hover:text-sky-300 underline">
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-900/60 border border-red-700 text-red-300 px-4 py-3 rounded-md relative text-sm" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address-signup" className="sr-only">Email address</label>
                <input
                  id="email-address-signup"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 bg-slate-800/50 border border-slate-600 placeholder-slate-400 text-white rounded-t-md focus:outline-none focus:ring-2 focus:ring-brand-light-blue focus:border-brand-light-blue focus:z-10 text-sm sm:text-base"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password_signup" className="sr-only">Password</label>
                <input
                  id="password_signup"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 bg-slate-800/50 border border-slate-600 placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-brand-light-blue focus:border-brand-light-blue focus:z-10 text-sm sm:text-base"
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 sm:py-3 bg-slate-800/50 border border-slate-600 placeholder-slate-400 text-white rounded-b-md focus:outline-none focus:ring-2 focus:ring-brand-light-blue focus:border-brand-light-blue focus:z-10 text-sm sm:text-base"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-light-blue hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 disabled:bg-sky-300/50 dark:focus:ring-offset-slate-900"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Sign up'}
              </button>
            </div>
          </form>
        )}
        <p className="mt-2 text-center text-xs sm:text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/signin" className="font-medium text-brand-light-blue hover:text-sky-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;