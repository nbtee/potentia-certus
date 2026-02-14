'use client';

import { logout } from '@/app/login/actions';

export function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
    >
      Sign out
    </button>
  );
}
