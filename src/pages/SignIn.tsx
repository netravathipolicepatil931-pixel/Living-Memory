import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { useLivingMemory } from '../context/LivingMemoryContext';

export const SignIn: React.FC = () => {
  const { loginDemo, connectGoogleWorkspace, pushToast } = useLivingMemory();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('alex.chen@university.edu');
  const [password, setPassword] = useState('living-memory-demo');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 400));
      setLoading(false);
      setResetSent(true);
      pushToast('Demo password reset instruction prepared locally', 'info');
      return;
    }

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    setLoading(false);
    loginDemo(email.trim(), 'Alex');
    navigate('/dashboard');
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await connectGoogleWorkspace();
      navigate('/dashboard');
    } catch {
      // Error toast is already handled honestly by connectGoogleWorkspace when OAuth isn't provisioned
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoWorkspace = () => {
    loginDemo('alex.chen@university.edu', 'Alex');
    navigate('/dashboard');
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
          onClick={handleDemoWorkspace}
          className="rounded-lg border border-[#DADCE0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-medium text-[#1A73E8] hover:bg-[#E8F0FE]"
        >
          Open Demo Workspace
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="ws-card w-full max-w-md rounded-2xl p-7 sm:p-8">
          <BrandLogo />

          <h1 className="mt-5 font-serif-editorial text-2xl text-[#202124]">
            {mode === 'signin' ? 'Sign in to Living Memory' : 'Reset password'}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#5F6368]">
            {mode === 'signin'
              ? 'Sign in with Google to connect read-only Gmail & Calendar, or explore the built-in Demo Workspace.'
              : 'Prepare a local demo workspace password reset confirmation.'}
          </p>

          {mode === 'signin' && (
            <div className="mt-5 space-y-2.5">
              <GoogleSignInButton
                onClick={handleGoogleSignIn}
                loading={googleLoading}
                label="Sign in with Google Workspace"
                className="w-full py-2.5"
              />
              <div className="my-4 flex items-center gap-3 text-[11px] text-[#80868B]">
                <div className="h-px flex-1 bg-[#DADCE0]" />
                <span>or explore with local demo credentials</span>
                <div className="h-px flex-1 bg-[#DADCE0]" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#5F6368]">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.chen@university.edu"
                className="mt-1.5 w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 text-sm text-[#202124] placeholder:text-[#80868B] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
              />
            </div>

            {mode === 'signin' && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#5F6368]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setResetSent(false);
                      setError('');
                    }}
                    className="text-xs font-medium text-[#1A73E8] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2.5 pr-10 text-sm text-[#202124] focus:border-[#1A73E8] focus:bg-[#FFFFFF] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#80868B] hover:text-[#202124]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-[#FCE8E6] px-3 py-2 text-xs font-medium text-[#C5221F]">
                {error}
              </div>
            )}

            {resetSent && mode === 'forgot' && (
              <div className="rounded-lg bg-[#CEEAD6] px-3 py-2 text-xs font-medium text-[#137333]">
                Demo reset confirmation ready for {email}. You may return to Sign In.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A73E8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1765CC] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Continue to Demo Workspace' : 'Send Reset Link (Demo)'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="w-full text-center text-xs text-[#5F6368] hover:text-[#202124]"
              >
                Return to Sign In
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-[#5F6368]">
            New to Living Memory?{' '}
            <Link to="/signup" className="font-medium text-[#1A73E8] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};
