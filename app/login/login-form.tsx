'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, forgotPassword } from './actions';
import Link from 'next/link';
import Image from 'next/image';

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [loginState, loginAction] = useActionState(login, null);
  const [resetState, resetAction] = useActionState(forgotPassword, null);

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/tech_stack_app_bg.jpg')" }}
    >
      <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
        <div>
          <Image
            src="/Potentia_logo_full.svg"
            alt="Potentia"
            width={160}
            height={40}
            className="mx-auto mb-4"
            priority
          />
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {mode === 'login' ? 'Sign in to Potentia Certus' : 'Reset your password'}
          </h2>
          {mode === 'login' && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link href="/signup" className="font-medium text-primary hover:text-brand-dark transition-colors">
                create a new account
              </Link>
            </p>
          )}
          {mode === 'forgot' && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          )}
        </div>

        {mode === 'login' && loginState?.error && (
          <div className="rounded-md bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">{loginState.error}</h3>
          </div>
        )}

        {mode === 'forgot' && resetState?.error && (
          <div className="rounded-md bg-red-50 p-4">
            <h3 className="text-sm font-medium text-red-800">{resetState.error}</h3>
          </div>
        )}

        {mode === 'forgot' && resetState?.success && (
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="text-sm font-medium text-green-800">
              If an account exists with that email, a reset link has been sent. Check your inbox.
            </h3>
          </div>
        )}

        {mode === 'login' && (
          <form className="mt-8 space-y-6" action={loginAction}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-sm font-medium text-primary hover:text-brand-dark transition-colors"
              >
                Forgot your password?
              </button>
            </div>

            <div>
              <SubmitButton label="Sign in" pendingLabel="Signing in..." />
            </div>
          </form>
        )}

        {mode === 'forgot' && !resetState?.success && (
          <form className="mt-8 space-y-6" action={resetAction}>
            <div>
              <label htmlFor="reset-email" className="sr-only">
                Email address
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>

            <div>
              <SubmitButton label="Send reset link" pendingLabel="Sending..." />
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-sm font-medium text-primary hover:text-brand-dark transition-colors"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
