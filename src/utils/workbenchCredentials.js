/**
 * Generates a formatted Workbench License Key
 * Format: WB-XXXX-XXXX-XXXX
 */
export function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const randomPart = (length) =>
    Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  return `WB-${randomPart(4)}-${randomPart(4)}-${randomPart(4)}`;
}

/**
 * Generates a secure, readable Workbench Access Password
 * Format: Wb-XXXXXX
 */
export function generateAccessPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomPart = (length) =>
    Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  return `Wb-${randomPart(6)}`;
}
