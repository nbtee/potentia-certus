/**
 * Test user credentials — read from environment variables.
 *
 * Set in .env.local or export before running tests:
 *   TEST_ADMIN_EMAIL, TEST_CONSULTANT_EMAIL, TEST_PASSWORD
 */
export const testUsers = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? '',
    password: process.env.TEST_PASSWORD ?? '',
  },
  consultant: {
    email: process.env.TEST_CONSULTANT_EMAIL ?? '',
    password: process.env.TEST_PASSWORD ?? '',
  },
} as const;

export function validateTestUsers() {
  if (!testUsers.admin.email || !testUsers.admin.password) {
    throw new Error(
      'Missing TEST_ADMIN_EMAIL or TEST_PASSWORD environment variables. ' +
        'Set them in .env.local or export before running tests.'
    );
  }
  if (!testUsers.consultant.email) {
    throw new Error(
      'Missing TEST_CONSULTANT_EMAIL environment variable. ' +
        'Set it in .env.local or export before running tests.'
    );
  }
}
