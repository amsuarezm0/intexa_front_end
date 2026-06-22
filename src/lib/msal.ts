import { PublicClientApplication,type AuthenticationResult,type Configuration } from '@azure/msal-browser';

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

async function getInstance(): Promise<PublicClientApplication> {
  if (!_instance) {
    _instance = new PublicClientApplication(msalConfig);
    await _instance.initialize();
  }
  return _instance;
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
 */
export async function completeMicrosoftRedirect(): Promise<AuthenticationResult | null> {
  const instance = await getInstance();
  return instance.handleRedirectPromise();
}
