
/**
 * RFC 5322 Compliant Email Validation
 * Ensures the email follows the standard username@domain.tld format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!email || email.length > 254) return false;
  
  const valid = emailRegex.test(email);
  if (!valid) return false;

  // Additional check for domain parts
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  
  const domainParts = parts[1].split(".");
  if (domainParts.length < 2) return false; // Must have at least one dot and a TLD
  
  return true;
};
