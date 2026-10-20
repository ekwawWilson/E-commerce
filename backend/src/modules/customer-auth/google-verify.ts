import config from '../../config';
import { AppError, UnauthorizedError } from '../../middleware/errorHandler';

export interface VerifiedGoogleIdentity {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleTokenInfo {
  aud?: string;
  iss?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  exp?: string;
  name?: string;
  picture?: string;
}

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/**
 * Verify a Google ID token and return the identity it proves.
 *
 * Google's tokeninfo endpoint checks the signature and expiry; we then check the
 * token was issued to one of our OAuth clients. Everything about the user comes
 * from the verified token — never from the request body, which the caller controls.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
  const audiences = [config.google.clientId, config.google.webClientId, ...config.google.extraClientIds]
    .filter(Boolean);

  if (audiences.length === 0) {
    throw new AppError('Google sign-in is not configured', 503);
  }

  let info: GoogleTokenInfo;
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!response.ok) {
      throw new UnauthorizedError('Invalid Google sign-in token');
    }
    info = (await response.json()) as GoogleTokenInfo;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Could not reach Google to verify sign-in. Please try again.', 502);
  }

  if (!info.aud || !audiences.includes(info.aud)) {
    throw new UnauthorizedError('Google sign-in token was not issued for this app');
  }
  if (!info.iss || !GOOGLE_ISSUERS.includes(info.iss)) {
    throw new UnauthorizedError('Invalid Google sign-in token');
  }
  if (!info.exp || Number(info.exp) * 1000 < Date.now()) {
    throw new UnauthorizedError('Google sign-in token has expired');
  }
  if (!info.sub || !info.email) {
    throw new UnauthorizedError('Invalid Google sign-in token');
  }
  if (info.email_verified !== true && info.email_verified !== 'true') {
    throw new UnauthorizedError('Your Google account email is not verified');
  }

  return {
    googleId: info.sub,
    email: info.email.toLowerCase(),
    name: info.name || info.email.split('@')[0],
    picture: info.picture,
  };
}
