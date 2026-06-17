/**
 * Format phone number to WhatsApp JID format
 * @param {string} phone - Phone number in various formats
 * @returns {string} - Formatted JID (e.g., 628xxx@s.whatsapp.net)
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  // Already in JID format
  if (phone.includes('@s.whatsapp.net')) return phone;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Convert 08xxx to 628xxx
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  }
  
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export function validatePhoneNumber(phone) {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Must be at least 10 digits
  if (cleaned.length < 10) return false;
  
  // Must start with valid country code or local format
  return /^(62|08|\+62)/.test(phone);
}

/**
 * Check if string is valid WhatsApp JID
 * @param {string} jid - JID to validate
 * @returns {boolean}
 */
export function isValidJid(jid) {
  if (!jid) return false;
  return /^\d+@s\.whatsapp\.net$/.test(jid);
}
