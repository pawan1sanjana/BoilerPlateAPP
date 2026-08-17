/**
 * WebAuthn (Passkeys) utility library.
 * Wraps the native browser navigator.credentials API for biometric authentication.
 * Works with fingerprint, Face ID, Windows Hello, and Touch ID.
 */

const RP_NAME = 'My Application'

// ─── Encoding Helpers ──────────────────────────────────────────────────────────

/** Convert an ArrayBuffer to a base64url-encoded string (safe for storage/transport). */
export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const byte of bytes) {
    str += String.fromCharCode(byte)
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Convert a base64url string back to an ArrayBuffer. */
export function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// ─── Feature Detection ─────────────────────────────────────────────────────────

/** Returns true if the browser supports the WebAuthn API. */
export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && window.PublicKeyCredential)
}

/**
 * Returns true if this device has a platform authenticator with user verification
 * (i.e. fingerprint sensor, Face ID, Windows Hello, Touch ID).
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// ─── Registration ──────────────────────────────────────────────────────────────

export interface RegisterCredentialResult {
  credentialId: string
  publicKey: string
}

/**
 * Prompts the user to register a new passkey (biometric credential) for this device.
 *
 * @param userId    The Supabase user UUID
 * @param userName  The user's display name
 * @param userEmail The user's email address (used as WebAuthn account name)
 * @returns         The credential ID and public key (base64url encoded) for Supabase storage
 * @throws          NotAllowedError if the user cancels or times out
 */
export async function registerBiometric(
  userId: string,
  userName: string,
  userEmail: string,
): Promise<RegisterCredentialResult> {
  // Generate a cryptographically random challenge
  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge.buffer,
      rp: {
        name: RP_NAME,
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userEmail,
        displayName: userName,
      },
      // Support both EC (preferred, smaller keys) and RSA (wider compat)
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256 (ECDSA with SHA-256)
        { type: 'public-key', alg: -257 },  // RS256 (RSASSA-PKCS1-v1_5)
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Use device biometric only (not USB key)
        userVerification: 'required',         // Force fingerprint/face/PIN
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none', // We don't need attestation for this use case
    },
  })) as PublicKeyCredential | null

  if (!credential) {
    throw new Error('No credential was created. The user may have cancelled.')
  }

  const response = credential.response as AuthenticatorAttestationResponse
  const credentialId = bufferToBase64url(credential.rawId)

  // Extract the public key bytes from the attestation response (for storage)
  let publicKeyStr = credentialId // Fallback to credentialId if extraction fails
  try {
    const pubKeyBytes = response.getPublicKey?.()
    if (pubKeyBytes) {
      publicKeyStr = bufferToBase64url(pubKeyBytes)
    }
  } catch {
    // getPublicKey not available on older browsers; credentialId serves as identifier
  }

  return { credentialId, publicKey: publicKeyStr }
}

// ─── Authentication ────────────────────────────────────────────────────────────

/**
 * Prompts the user to authenticate with their registered biometric credential.
 *
 * @param credentialId The base64url-encoded credential ID stored in localStorage
 * @returns            true if authentication succeeded, false if user cancelled
 * @throws             Any error other than NotAllowedError (user cancel)
 */
export async function authenticateWithBiometric(credentialId: string): Promise<boolean> {
  const challenge = new Uint8Array(32)
  crypto.getRandomValues(challenge)

  try {
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64urlToBuffer(credentialId),
            transports: ['internal'], // 'internal' = platform/built-in authenticator
          },
        ],
        userVerification: 'required', // Requires biometric/PIN confirmation
        timeout: 60000,
      },
    })) as PublicKeyCredential | null

    // If we reach here without throwing, the device verified the user's biometric.
    return !!credential
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      // User dismissed the dialog or timed out — not an error, just "cancelled"
      return false
    }
    throw err
  }
}
