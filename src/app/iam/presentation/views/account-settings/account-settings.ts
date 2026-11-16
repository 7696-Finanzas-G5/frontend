import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DemoDataService } from '../../../../shared/application/demo-data.service';
import { HelpTip } from '../../../../shared/presentation/components/help-tip';
import { Icon } from '../../../../shared/presentation/components/icon';
import { PageHeader } from '../../../../shared/presentation/components/page-header';
import { AuthService } from '../../../application/auth.service';
import { CLAVE_MAX, CLAVE_MIN } from '../../../domain/model/usuario';

@Component({
  selector: 'app-account-settings',
  imports: [ReactiveFormsModule, HelpTip, Icon, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack">
      <app-page-header icon="settings" title="Configuración" subtitle="Cuenta de usuario y datos de la aplicación" />

      <form class="card" [formGroup]="form" (ngSubmit)="cambiar()">
        <div class="card-title"><h2><app-icon name="lock" /> Cambiar contraseña</h2></div>
        <div class="form-grid form-grid-3">
          <div class="field"><label for="a">Contraseña actual <app-help title="Contraseña actual" text="Ingrese su contraseña vigente." /></label>
            <input id="a" class="input" type="password" formControlName="actual" autocomplete="current-password" /></div>
          <div class="field"><label for="n">Nueva contraseña <app-help title="Nueva contraseña" text="Entre 8 y 64 caracteres alfanuméricos. Se almacena cifrada." /></label>
            <input id="n" class="input" type="password" formControlName="nueva" autocomplete="new-password" /></div>
          <div class="field"><label for="c">Confirmar contraseña <app-help title="Confirmación" text="Repita la nueva contraseña." /></label>
            <input id="c" class="input" type="password" formControlName="confirmar" autocomplete="new-password" /></div>
        </div>
        @if (msg(); as m) { <div class="alert" [class.alert-ok]="m.ok" [class.alert-danger]="!m.ok" style="margin-top:14px">{{ m.text }}</div> }
        <div class="actions" style="margin-top:16px"><button class="btn btn-primary" [disabled]="form.invalid">Actualizar contraseña</button></div>
      </form>

      @if (auth.rol() === 'ADMIN_SISTEMA') {
        <section class="card">
          <div class="card-title"><h2><app-icon name="refresh" /> Datos de demostración</h2></div>
          <p class="muted">Los datos se guardan en el navegador (localStorage). Puede restaurar los datos iniciales de prueba del informe (juegos de datos 1 y 2).</p>
          <div class="actions"><button class="btn btn-danger" (click)="reset()">Restablecer datos de demostración</button></div>
        </section>
      }
    </div>
  `,
})
export class AccountSettings {
  protected readonly auth = inject(AuthService);
  private readonly demo = inject(DemoDataService);
  private readonly router = inject(Router);
  protected readonly msg = signal<{ ok: boolean; text: string } | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, Validators.minLength(CLAVE_MIN), Validators.maxLength(CLAVE_MAX)]],
    confirmar: ['', Validators.required],
  });

  async cambiar() {
    const { actual, nueva, confirmar } = this.form.getRawValue();
    if (nueva !== confirmar) return this.msg.set({ ok: false, text: 'Las contraseñas no coinciden.' });
    try {
      await this.auth.cambiarClave(actual, nueva);
      this.form.reset();
      this.msg.set({ ok: true, text: 'Contraseña actualizada correctamente.' });
    } catch (e) {
      this.msg.set({ ok: false, text: (e as Error).message });
    }
  }

  async reset() {
    if (!confirm('Se eliminarán todos los cambios y se cargarán los datos de demostración. ¿Continuar?')) return;
    await this.demo.reset();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
