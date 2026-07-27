import type { AuthenticationResult,Configuration,PublicClientApplication } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID ?? '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID ?? 'common'}`,
    // Redirect flow returns to the app root; the SPA finishes login on load.
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
};

let _instance: PublicClientApplication | null = null;

/** The library is ~200 kB and only two paths need it — clicking the Microsoft
 *  button, and landing back from its redirect — so it is fetched at that point
 *  rather than on every page load. */
async function getInstance(): Promise<PublicClientApplication> {
  if (!_instance) {
    const { PublicClientApplication } = await import('@azure/msal-browser');
    _instance = new PublicClientApplication(msalConfig);
    await _instance.initialize();
  }
  return _instance;
}

/** True when the current URL carries a Microsoft redirect response. */
export function hasRedirectResponse(): boolean {
  return /(?:code|state|error|session_state)=/.test(window.location.hash + window.location.search);
}

/**
 * Starts the Microsoft login via full-page redirect.
 * The browser navigates away to Microsoft, so this does NOT return a result;
 * the response is handled on app load by completeMicrosoftRedirect().
 */
export async function signInWithMicrosoft(): Promise<void> {
  const instance = await getInstance();
  await instance.loginRedirect({
    scopes: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  });
}

/**
 * Call once on app startup. If the user just came back from a Microsoft
 * redirect, returns the auth result; otherwise returns null.
 *
 * Returns early on an ordinary load: with no redirect response in the URL there
 * is nothing to complete, and skipping keeps MSAL out of the normal startup.
 */
export async function completeMicrosoftRedirect(): Promise<AuthenticationResult | null> {
  if (!hasRedirectResponse()) return null;
  const instance = await getInstance();
  return instance.handleRedirectPromise();
}
