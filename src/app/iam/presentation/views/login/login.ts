import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DEMO_CREDENCIALES } from '../../../../bootstrap/demo-credentials';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { Logo } from '../../../../shared/presentation/components/logo';
import { AuthService } from '../../../application/auth.service';
import { ROLES, Rol } from '../../../domain/model/usuario';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, HelpTip, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="login-layout">
        <form class="card login" [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-heading"><app-logo /><h2>Inicia sesión</h2><p>Accede a tu cuenta de CrediBarrio</p></div>

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
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh; display: grid; place-items: center; padding: 32px 20px; position: relative; isolation: isolate;
      background: url('/credibarrio-login-bg.png') center / cover no-repeat;
    }
    .page::before { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(90deg, rgba(8,28,45,.48), rgba(16,42,67,.16) 62%, rgba(16,42,67,.08)); }
    .login-layout { width: min(430px, 100%); }
    .login { width: 100%; display: flex; flex-direction: column; gap: 20px; padding: 34px 36px 28px; border: 1px solid rgba(255,255,255,.72); border-top: 3px solid var(--accent); border-radius: 0; background: rgba(255,255,255,.97); box-shadow: 0 18px 54px rgba(5,20,34,.27); clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px)); }
    .form-heading { margin-bottom: 4px; }
    .form-heading app-logo { display: flex; margin-bottom: 34px; }
    .form-heading h2 { margin-top: 0; font-size: 25px; letter-spacing: -.035em; }
    .form-heading p { margin: 7px 0 0; color: var(--muted); font-size: 13px; }
    .pass .input { padding-right: 42px; }
    .eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; }
    .secure { display: flex; gap: 6px; justify-content: center; align-items: center; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 14px; }
    .demo { font-size: 12px; color: var(--muted); }
    .demo summary { cursor: pointer; }
    .demo ul { padding-left: 16px; margin: 8px 0 0; display: flex; flex-direction: column; gap: 4px; }
    .link { border: 0; background: none; padding: 0; color: var(--primary); cursor: pointer; font: inherit; text-align: left; }
    @media (max-width: 480px) { .page { padding: 18px; } .login { padding: 28px 24px 24px; gap: 17px; } .form-heading app-logo { margin-bottom: 26px; } }
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
