import { Provider } from '@angular/core';
import { UsuarioRepository } from '../domain/repositories/usuario.repository';
import { PasswordHasher } from '../domain/services/password-hasher';
import { LocalStorageUsuarioRepository } from './local-storage-usuario.repository';
import { Sha256PasswordHasher } from './sha256-password-hasher';

export const provideIam = (): Provider[] => [
  { provide: UsuarioRepository, useClass: LocalStorageUsuarioRepository },
  { provide: PasswordHasher, useClass: Sha256PasswordHasher },
];
