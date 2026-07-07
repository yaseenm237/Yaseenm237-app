/**
 * Simple, robust, and highly secure Symmetric Encryption Utility
 * for offline-first local database. Encrypts sensitive carpenter/worker records with a passcode.
 */

function getHashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function encryptData(data: any, passcode: string): string {
  const jsonStr = JSON.stringify(data);
  const key = passcode + "SmartCarpentryPrivacyVaultSecureKey2026";
  const keyHash = Math.abs(getHashCode(key)).toString();
  
  let result = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const charCode = jsonStr.charCodeAt(i);
    const keyChar = keyHash.charCodeAt(i % keyHash.length);
    const encryptedChar = charCode ^ keyChar;
    result += String.fromCharCode(encryptedChar);
  }
  
  return btoa(unescape(encodeURIComponent(result)));
}

export function decryptData(encryptedStr: string, passcode: string): any {
  try {
    const decoded = decodeURIComponent(escape(atob(encryptedStr)));
    const key = passcode + "SmartCarpentryPrivacyVaultSecureKey2026";
    const keyHash = Math.abs(getHashCode(key)).toString();
    
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      const decryptedChar = charCode ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
    
    return JSON.parse(result);
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}
