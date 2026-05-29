import { PublicClientApplication,type AuthenticationResult,type Configuration } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID ?? '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID ?? 'common'}`,
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
    // Clear any stale interaction state from a previous incomplete popup/redirect
    await _instance.handleRedirectPromise().catch(() => null);
  }
  return _instance;
}

function clearMsalInteractionLock() {
  for (const key of Object.keys(sessionStorage)) {
    if (key.includes('interaction.status') || key.includes('interaction_status')) {
      sessionStorage.removeItem(key);
    }
  }
}

export async function signInWithMicrosoft(): Promise<AuthenticationResult> {
  clearMsalInteractionLock();
  const instance = await getInstance();
  return instance.loginPopup({
    scopes: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  });
}
