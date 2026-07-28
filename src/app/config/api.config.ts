declare global {
  interface Window {
    __KSB_CONFIG__?: {
      apiOrigin?: string;
    };
  }
}

export const API_ORIGIN =
  window.__KSB_CONFIG__?.apiOrigin ||
  'https://ksb-net-backend-production.up.railway.app';
export const API_BASE_URL = `${API_ORIGIN}/api`;
