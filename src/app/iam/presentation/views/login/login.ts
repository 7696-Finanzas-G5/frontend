import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DEMO_CREDENCIALES } from '../../../../bootstrap/demo-credentials';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { Logo } from '../../../../shared/presentation/components/logo';
import { AuthService } from '../../../application/auth.service';
import { ROLES, Rol } from '../../../domain/model/usuario';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, HelpTip, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <form class="card login" [formGroup]="form" (ngSubmit)="submit()">
        <app-logo [big]="true" />

        <div class="field">
          <label for="rol">Rol <app-help title="Ayuda de Rol" text="Seleccione Administrador del Sistema (tiendas), Administrador del Negocio (créditos) o Cliente (consultas)." /></label>
          <select id="rol" class="input" formControlName="rol">
            @for (r of roles; track r.value) { <option [value]="r.value">{{ r.label }}</option> }
          </select>
        </div>

        <div class="field">
          <label for="user">Usuario / Correo <app-help title="Ayuda de Usuario" text="Ingrese su identificador único o correo registrado en la plataforma." /></label>
          <div class="input-icon">
            <app-icon name="user" />
            <input id="user" class="input" formControlName="username" placeholder="Ingrese su usuario o correo electrónico" autocomplete="username" />
          </div>
        </div>

        <div class="field">
          <label for="pass">Contraseña <app-help title="Ayuda de Clave" text="Ingrese su contraseña alfanumérica cifrada de 8 a 64 caracteres." /></label>
          <div class="input-icon pass">
            <app-icon name="lock" />
            <input id="pass" class="input" [type]="showPass() ? 'text' : 'password'" formControlName="clave" placeholder="Ingrese su contraseña" autocomplete="current-password" />
            <button type="button" class="eye" (click)="showPass.set(!showPass())" [attr.aria-label]="showPass() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <app-icon [name]="showPass() ? 'eye' : 'eye-off'" />
            </button>
          </div>
          @if (form.controls.clave.touched && form.controls.clave.invalid) {
            <span class="error">La contraseña debe tener entre 8 y 64 caracteres.</span>
          }
        </div>

        @if (error()) {
          <div class="alert alert-danger"><app-icon name="alert" /> {{ error() }}</div>
        }

        <button class="btn btn-primary btn-lg" type="submit" [disabled]="loading()">
          Ingresar al Sistema <app-icon name="arrow" />
        </button>
        <div class="register">¿Tiene un negocio y aún no tiene cuenta? <a routerLink="/registro">Registre su negocio</a></div>
        <div class="secure"><app-icon name="shield" [size]="16" /> Acceso seguro a CrediBarrio</div>

        <details class="demo">
          <summary>Credenciales de demostración</summary>
          <ul>
            @for (c of demo; track c.username) {
              <li><button type="button" class="link" (click)="fill(c.rol, c.username, c.clave)">{{ c.label }}: <code>{{ c.username }}</code> / <code>{{ c.clave }}</code></button></li>
            }
          </ul>
        </details>
      </form>
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05)),
        url('/login-bg.svg') center bottom / cover no-repeat,
        var(--bg);
    }
    .login { width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(23, 105, 255, 0.18); display: flex; flex-direction: column; gap: 18px; padding: 32px 30px; }
    .pass .input { padding-right: 42px; }
    .eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; }
    .secure { display: flex; gap: 6px; justify-content: center; align-items: center; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 14px; }
    .register { text-align: center; font-size: 13px; color: var(--muted); }
    .register a { color: var(--primary); font-weight: 600; }
    .demo { font-size: 12px; color: var(--muted); }
    .demo summary { cursor: pointer; }
    .demo ul { padding-left: 16px; margin: 8px 0 0; display: flex; flex-direction: column; gap: 4px; }
    .link { border: 0; background: none; padding: 0; color: var(--primary); cursor: pointer; font: inherit; text-align: left; }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly roles = ROLES;
  protected readonly demo = DEMO_CREDENCIALES;
  protected readonly showPass = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    rol: ['ADMIN_SISTEMA' as Rol, Validators.required],
    username: ['', [Validators.required, Validators.maxLength(80)]],
    clave: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(64)]],
  });

  fill(rol: Rol, username: string, clave: string) {
    this.form.setValue({ rol, username, clave });
  }

  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { rol, username, clave } = this.form.getRawValue();
      const user = await this.auth.login(rol, username, clave);
      await this.router.navigateByUrl(this.auth.homeFor(user.rol));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
