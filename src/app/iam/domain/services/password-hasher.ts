/** Puerto de cifrado de contraseñas (la implementación vive en infraestructura). */
export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;

  async matches(plain: string, hash: string): Promise<boolean> {
    return (await this.hash(plain)) === hash;
  }
}
