import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const SignUp: React.FC = () => {
  const { loginDemo, connectGoogleWorkspace } = useLivingMemory();
  const navigate = useNavigate();

  const [name, setName] = useState('Alex');
  const [email, setEmail] = useState('alex.chen@university.edu');
  const [password, setPassword] = useState('living-memory-demo');
  const [confirmPassword, setConfirmPassword] = useState('living-memory-demo');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    setLoading(false);
    loginDemo(email.trim(), name.trim());
    navigate('/onboarding');
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await connectGoogleWorkspace();
      navigate('/onboarding');
    } catch {
      // Handled cleanly in context
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124] flex flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#5F6368] hover:text-[#202124]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Overview
        </Link>
        <button
          type="button"
          onClick={() => {
            loginDemo('alex.chen@university.edu', 'Alex');
            navigate('/dashboard');
          }}
          className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#1A73E8] hover:bg-[#E8F0FE]"
        >
          Skip to Demo Dashboard
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="ws-card w-full max-w-md rounded-2xl p-7 sm:p-8">
          <BrandLogo />

          <h1 className="mt-5 font-serif-editorial text-2xl text-[#202124]">
            Create your memory workspace
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368]">
            Set up your personal context profile and choose which information sources to analyze.
          </p>

          <div className="mt-5">
            <GoogleSignInButton
              onClick={handleGoogleSignUp}
              loading={googleLoading}
              label="Continue with Google Workspace"
              className="w-full py-2.5"
            />
            <div className="my-4 flex items-center gap-3 text-[11px] text-[#80868B]">
              <div className="h-px flex-1 bg-[#DADCE0]" />
              <span>or set up a local demo profile</span>
              <div className="h-px flex-1 bg-[#DADCE0]" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-sm text-[#202124] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-sm text-[#202124] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 pr-10 text-sm text-[#202124] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#80868B] hover:text-[#202124]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-sm text-[#202124] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-[#FCE8E6] px-3 py-2 text-xs font-medium text-[#C5221F]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A73E8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1765CC] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account & Continue
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#5F6368]">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-[#1A73E8] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};
