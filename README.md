# CrediBarrio – Frontend (Angular 21)

## Ejecutar

El frontend consume la API REST del backend Spring Boot
([7696-Finanzas-G5/backend](https://github.com/7696-Finanzas-G5/backend)); primero levante el backend:

```bash
# en el repositorio del backend
./mvnw spring-boot:run      # http://localhost:8080/api/v1 (carga los datos de demostración)
```

Luego el frontend:

```bash
npm install
npm start          # http://localhost:4200
npm test            
```

> Requiere Node ≥ 22.12 (Angular 21).

La URL del backend se configura en `src/environments/environment.development.ts` (desarrollo) y
`src/environments/environment.ts` (producción). La sesión usa el JWT que emite `POST /auth/login`, guardado en
`sessionStorage`; los adaptadores HTTP de cada bounded context están en `src/app/*/infrastructure/*.api.ts`.

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
| `domain` | Entidades, value objects y servicios de dominio puros (modelo financiero para las vistas previas) | solo `shared/domain` |
| `application` | Casos de uso (servicios de aplicación), comandos, ACL hacia otros contextos | `domain` propio y `application` de otros contextos |
| `infrastructure` | Adaptadores HTTP hacia la API REST del backend (`*.api.ts`) | `domain` propio, `shared/infrastructure` |
| `presentation` | Vistas, componentes y rutas Angular | `application` (y modelos de `domain` para tipado) |

| Contexto | Responsabilidad | Mockup |
|---|---|---|
| `shared` | Shared kernel: matemática financiera (6.3), cliente HTTP + interceptor JWT, UI común | — |
| `iam` | Usuarios, login, roles (RBAC), cambio de clave | 6.2.1 |
| `stores` | Alta y baja de tiendas multi-giro | 6.2.2 |
| `catalog` | Productos y servicios, precios contado/lista, modalidad | 6.2.3 |
| `customers` | Clientes y línea de crédito versionada (vigente/histórica) | 6.2.4 |
| `credits` | Originación de compras, cronograma francés, deuda y crédito disponible | 6.2.5 |
| `billing` | Listado al corte, mora, prelación de pagos, estado de cuenta | 6.2.6 |
| `dashboard` (bitácora) | La bitácora de auditoría la registra el backend y se muestra en el inicio | — |
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
- Los servicios de aplicación mantienen el estado en *signals* cargados desde la API; los comandos (altas, compras, pagos) los valida y persiste el backend. La simulación de compra se calcula en el navegador con el mismo modelo matemático (vista previa inmediata) y el backend la recalcula al registrar.

## Notas

- Base 360/30, tasas sin redondeo interno y montos a 2 decimales (redondeo fila por fila en el cronograma).
- La TEM de una TEA 24 % es **1.8087582 %**; la tabla del juego 1 del informe indica 1.8087577 % (errata).
- Los datos viven en el backend (H2 por defecto: borre la carpeta `data/` del backend para volver a los datos de demostración).
