import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { Logo } from '../../../../shared/presentation/components/logo';
import { TiendasService } from '../../../../stores/application/tiendas.service';
import { GIROS_NEGOCIO, RUC_PATTERN } from '../../../../stores/domain/model/tienda';
import { AuthService } from '../../../application/auth.service';
import { CLAVE_MAX, CLAVE_MIN } from '../../../domain/model/usuario';

/** Registro público de un negocio: crea la tienda y su Administrador del Negocio e inicia sesión. */
@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, HelpTip, Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <form class="card registro" [formGroup]="form" (ngSubmit)="submit()">
        <app-logo [big]="true" />
        <div class="intro">
          <h1>Registre su negocio</h1>
          <p>Cree su tienda y su usuario Administrador del Negocio para empezar a otorgar créditos.</p>
        </div>

        <fieldset>
          <legend>Datos del negocio</legend>
          <div class="field">
            <label for="nc">Nombre Comercial <app-help title="Nombre Comercial" text="Nombre con el que el negocio es conocido en el barrio. Obligatorio, máximo 120 caracteres." /></label>
            <div class="input-icon"><app-icon name="store" /><input id="nc" class="input" formControlName="nombreComercial" placeholder="Ej. Bodega San Pedro" /></div>
            @if (form.controls.nombreComercial.touched && form.controls.nombreComercial.invalid) { <span class="error">El nombre comercial es obligatorio (máximo 120 caracteres).</span> }
          </div>
          <div class="field">
            <label for="ruc">RUC <app-help title="RUC" text="Registro Único de Contribuyentes: 11 dígitos, inicia con 10, 15, 17 o 20." /></label>
            <div class="input-icon"><app-icon name="doc" /><input id="ruc" class="input" formControlName="ruc" placeholder="Ej. 20123456789" maxlength="11" inputmode="numeric" /></div>
            @if (form.controls.ruc.touched && form.controls.ruc.invalid) { <span class="error">Ingrese un RUC válido de 11 dígitos (10, 15, 17 o 20…).</span> }
          </div>
          <div class="field">
            <label for="giro">Giro del Negocio <app-help title="Giro" text="Rubro del establecimiento: bodega, frutería, carnicería, panadería, peluquería, spa, entre otros." /></label>
            <select id="giro" class="input" formControlName="giroNegocio">
              @for (g of giros(); track g) { <option [value]="g">{{ g }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="dir">Dirección / Zona de Influencia <app-help title="Dirección" text="Dirección del local y zona del barrio donde opera. Máximo 250 caracteres." /></label>
            <div class="input-icon"><app-icon name="home" /><input id="dir" class="input" formControlName="direccion" placeholder="Ej. Av. Los Olivos 123, Urb. San Martín" /></div>
            @if (form.controls.direccion.touched && form.controls.direccion.invalid) { <span class="error">La dirección es obligatoria (máximo 250 caracteres).</span> }
          </div>
        </fieldset>

        <fieldset>
          <legend>Usuario Administrador del Negocio</legend>
          <div class="field">
            <label for="user">Usuario <app-help title="Usuario" text="Identificador con el que ingresará a CrediBarrio (4 a 80 caracteres)." /></label>
            <div class="input-icon"><app-icon name="user" /><input id="user" class="input" formControlName="username" placeholder="Ej. bodega.sanpedro" autocomplete="username" /></div>
            @if (form.controls.username.touched && form.controls.username.invalid) { <span class="error">El usuario debe tener entre 4 y 80 caracteres.</span> }
          </div>
          <div class="field">
            <label for="pass">Contraseña <app-help title="Contraseña" text="De 8 a 64 caracteres. Se almacena cifrada." /></label>
            <div class="input-icon pass">
              <app-icon name="lock" />
              <input id="pass" class="input" [type]="showPass() ? 'text' : 'password'" formControlName="clave" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
              <button type="button" class="eye" (click)="showPass.set(!showPass())" [attr.aria-label]="showPass() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <app-icon [name]="showPass() ? 'eye' : 'eye-off'" />
              </button>
            </div>
            @if (form.controls.clave.touched && form.controls.clave.invalid) { <span class="error">La contraseña debe tener entre 8 y 64 caracteres.</span> }
          </div>
          <div class="field">
            <label for="pass2">Confirmar contraseña</label>
            <div class="input-icon"><app-icon name="lock" /><input id="pass2" class="input" [type]="showPass() ? 'text' : 'password'" formControlName="confirmacion" placeholder="Repita la contraseña" autocomplete="new-password" /></div>
            @if (form.controls.confirmacion.touched && noCoincide()) { <span class="error">Las contraseñas no coinciden.</span> }
          </div>
        </fieldset>

        @if (error()) {
          <div class="alert alert-danger"><app-icon name="alert" /> {{ error() }}</div>
        }

        <button class="btn btn-primary btn-lg" type="submit" [disabled]="loading()">
          Registrar negocio <app-icon name="arrow" />
        </button>
        <div class="secure">¿Ya tiene una cuenta? <a routerLink="/login">Ingresar</a></div>
      </form>
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
      background: radial-gradient(circle at 15% 20%, #e3edff 0, transparent 45%), radial-gradient(circle at 85% 80%, #e8f0ff 0, transparent 40%), var(--bg);
    }
    .registro { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 18px; padding: 32px 30px; }
    .intro h1 { margin: 0 0 4px; font-size: 20px; }
    .intro p { margin: 0; color: var(--muted); font-size: 14px; }
    fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
    legend { font-weight: 600; font-size: 14px; margin-bottom: 10px; padding: 0; }
    .pass .input { padding-right: 42px; }
    .eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; }
    .secure { display: flex; gap: 6px; justify-content: center; align-items: center; color: var(--muted); font-size: 13px; border-top: 1px solid var(--border); padding-top: 14px; }
    .secure a { color: var(--primary); }
  `,
})
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly tiendas = inject(TiendasService);
  private readonly router = inject(Router);
  protected readonly giros = signal<string[]>(GIROS_NEGOCIO);
  protected readonly showPass = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombreComercial: ['', [Validators.required, Validators.maxLength(120)]],
    ruc: ['', [Validators.required, Validators.pattern(RUC_PATTERN)]],
    giroNegocio: ['Bodega', Validators.required],
    direccion: ['', [Validators.required, Validators.maxLength(250)]],
    username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(80)]],
    clave: ['', [Validators.required, Validators.minLength(CLAVE_MIN), Validators.maxLength(CLAVE_MAX)]],
    confirmacion: ['', Validators.required],
  });

  constructor() {
    this.tiendas.giros().then((g) => this.giros.set(g));
  }

  protected noCoincide(): boolean {
    const { clave, confirmacion } = this.form.getRawValue();
    return clave !== confirmacion;
  }

  async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.noCoincide()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const { nombreComercial, ruc, giroNegocio, direccion, username, clave } = this.form.getRawValue();
      const user = await this.auth.registrarNegocio({
        nombreComercial: nombreComercial.trim(),
        ruc,
        direccion: direccion.trim(),
        giroNegocio,
        username,
        clave,
      });
      await this.router.navigateByUrl(this.auth.homeFor(user.rol));
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
}
