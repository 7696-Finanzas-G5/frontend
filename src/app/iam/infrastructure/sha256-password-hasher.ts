import { Injectable } from '@angular/core';
import { PasswordHasher } from '../domain/services/password-hasher';

/** SHA-256 con Web Crypto. En producción el cifrado debe hacerse en el backend (bcrypt/argon2). */
@Injectable()
export class Sha256PasswordHasher extends PasswordHasher {
  async hash(plain: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
