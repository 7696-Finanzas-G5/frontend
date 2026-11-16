# CrediBarrio – Frontend (Angular 21)

Control de cuenta corriente de crédito para pequeños negocios (Finanzas e Ingeniería Económica · UPC 2026-02, Grupo 05).

## Ejecutar

```bash
npm install
npm start          # http://localhost:4200
npm test           # pruebas del modelo financiero (juegos de datos del punto 6.4)
```

> Requiere Node ≥ 22.12 (Angular 21).

### Credenciales de demostración

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador del Sistema | `admin` | `Admin2026` |
| Administrador del Negocio | `bodega.sanpedro` | `Negocio2026` |
| Cliente / Vecino | `juan.perez` | `Cliente2026` |

## Arquitectura (Domain-Driven Design)

El código se divide en **bounded contexts** y cada uno en cuatro capas:

| Capa | Contenido | Puede depender de |
|---|---|---|
| `domain` | Entidades, value objects, servicios de dominio puros y **puertos** de repositorio (clases abstractas) | solo `shared/domain` |
| `application` | Casos de uso (servicios de aplicación), comandos, ACL hacia otros contextos | `domain` propio y `application` de otros contextos |
| `infrastructure` | Adaptadores: repositorios en localStorage, cifrado, `provideX()` | `domain` propio, `shared/infrastructure` |
| `presentation` | Vistas, componentes y rutas Angular | `application` (y modelos de `domain` para tipado) |

| Contexto | Responsabilidad | Mockup |
|---|---|---|
| `shared` | Shared kernel: matemática financiera (6.3), repositorio base, `LocalDatabase`, UI común | — |
| `iam` | Usuarios, login, roles (RBAC), cambio de clave | 6.2.1 |
| `stores` | Alta y baja de tiendas multi-giro | 6.2.2 |
| `catalog` | Productos y servicios, precios contado/lista, modalidad | 6.2.3 |
| `customers` | Clientes y línea de crédito versionada (vigente/histórica) | 6.2.4 |
| `credits` | Originación de compras, cronograma francés, deuda y crédito disponible | 6.2.5 |
| `billing` | Listado al corte, mora, prelación de pagos, estado de cuenta | 6.2.6 |
| `audit` | Bitácora de auditoría inalterable | — |
| `dashboard` | Modelo de lectura que combina los demás contextos | — |

```
src/app/
  <contexto>/
    domain/          model/, services/, repositories/ (puertos)
    application/     *.service.ts (casos de uso), acl/
    infrastructure/  local-storage-*.repository.ts, <contexto>.providers.ts
    presentation/    views/, components/, <contexto>.routes.ts
  bootstrap/         Datos de demostración (raíz de composición)
  layout/shell.ts    Barra superior + menú lateral por rol
  app.config.ts      Registra los providers de infraestructura de cada contexto
  app.routes.ts      Compone las rutas de cada contexto
```

- `credits` no depende del dominio de `customers` ni de `catalog`. Usa sus propios modelos (`CondicionesFinancieras`, `ProductoOfertado`), que la capa anticorrupción `credits/application/acl/credit-context.adapter.ts` traduce desde los otros contextos.
- Para conectar un backend basta con crear nuevos adaptadores (p. ej. `HttpClienteRepository`) y cambiarlos en `<contexto>.providers.ts`.

## Notas

- Base 360/30, tasas sin redondeo interno y montos a 2 decimales (redondeo fila por fila en el cronograma).
- La TEM de una TEA 24 % es **1.8087582 %**; la tabla del juego 1 del informe indica 1.8087577 % (errata).
- Los datos se guardan en el navegador; *Configuración → Restablecer datos de demostración* (admin del sistema) los reinicia.
