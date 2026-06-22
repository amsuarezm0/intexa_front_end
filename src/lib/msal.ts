import { PublicClientApplication,type AuthenticationResult,type Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID ?? '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID ?? 'common'}`,
    // Dedicated blank page so the popup does NOT reload the full SPA on return.
    // Prevents block_nested_popups. Must be registered as a redirect URI in Entra.
    redirectUri: `${window.location.origin}/blank.html`,
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
    // Resolve any pending response before a new interaction is started.
    await _instance.handleRedirectPromise().catch(() => null);
  }
  return _instance;
}

export async function signInWithMicrosoft(): Promise<AuthenticationResult> {
  const instance = await getInstance();
  return instance.loginPopup({
    scopes: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  });
}
