/**
 * Dynamische API-Konfiguration für lokale und Netzwerk-Zugriffe
 */

// Funktion zur automatischen Erkennung der richtigen API-URL
export function getApiUrl(): string {
  // Im Browser-Kontext
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Wenn über localhost zugegriffen wird
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_STRAPI_URL_LOCALHOST || 'http://localhost:1337';
    }
    
    // Wenn über Netzwerk-IP zugegriffen wird
    return process.env.NEXT_PUBLIC_STRAPI_URL_NETWORK || `http://${hostname.replace('3000', '1337')}`;
  }
  
  // Server-side rendering fallback
  return process.env.NEXT_PUBLIC_STRAPI_URL_LOCALHOST || 'http://localhost:1337';
}

// Exportiere die API-URL als Konstante für einfache Verwendung
export const API_URL = getApiUrl();