/**
 * Datos de demostración. Reproducen los mockups (6.2) y los juegos de datos de prueba (6.4).
 * Es parte de la raíz de composición: conoce los modelos de todos los bounded contexts.
 */
import { RegistroAuditoria } from '../audit/domain/model/registro-auditoria';
import { ProductoServicio } from '../catalog/domain/model/producto-servicio';
import { Compra } from '../credits/domain/model/compra';
import { Cuota, cuotasDesdeCronograma } from '../credits/domain/model/cuota';
import { Cliente } from '../customers/domain/model/cliente';
import { CondicionCredito, TasaCondicion } from '../customers/domain/model/condicion-credito';
import { Usuario } from '../iam/domain/model/usuario';
import { PasswordHasher } from '../iam/domain/services/password-hasher';
import { cronogramaFrances, fechaPagoCiclo, tasaEfectivaDiaria } from '../shared/domain/finance/financial-math';
import { DatabaseSnapshot } from '../shared/infrastructure/persistence/local-database';
import { Tienda } from '../stores/domain/model/tienda';
import { DEMO_CREDENCIALES } from './demo-credentials';

const T0 = '2026-09-01T08:00';

function tasas(comp: number, mora: number): TasaCondicion[] {
  return [
    { finalidad: 'COMPENSATORIA', tipoTasa: 'EFECTIVA', valorTasa: comp, periodoTasaDias: 360, capitalizacionDias: null },
    { finalidad: 'MORATORIA', tipoTasa: 'EFECTIVA', valorTasa: mora, periodoTasaDias: 360, capitalizacionDias: null },
  ];
}

function condicion(id: number, idCliente: number, limite: number, nMax: number, comp: number, mora: number, corte: number, pago: number): CondicionCredito {
  return {
    id,
    idCliente,
    moneda: 'PEN',
    limiteCredito: limite,
    plazoMaxMeses: nMax,
    diaCorte: corte,
    horaCorte: '23:59:59',
    diaPago: pago,
    vigenteDesde: '2026-09-01',
    vigenteHasta: null,
    estado: 'VIGENTE',
    tasas: tasas(comp, mora),
  };
}

export async function buildDemoSeed(hasher: PasswordHasher): Promise<DatabaseSnapshot> {
  const [hAdmin, hNeg, hCli] = await Promise.all(DEMO_CREDENCIALES.map((c) => hasher.hash(c.clave)));

  const tiendas: Tienda[] = [
    { id: 1, nombreComercial: 'Bodega San Pedro', ruc: '20123456789', direccion: 'Urb. San Martín', giroNegocio: 'Bodega', estado: 'ACTIVA', fechaRegistro: T0 },
    { id: 2, nombreComercial: 'Frutas del Valle', ruc: '20567890123', direccion: 'Av. Los Olivos', giroNegocio: 'Frutería', estado: 'ACTIVA', fechaRegistro: T0 },
    { id: 3, nombreComercial: 'Panadería Don Luis', ruc: '20678901234', direccion: 'Calle Central', giroNegocio: 'Panadería', estado: 'ACTIVA', fechaRegistro: T0 },
    { id: 4, nombreComercial: 'Spa Bella Vida', ruc: '20456789012', direccion: 'Urb. Miraflores', giroNegocio: 'Spa', estado: 'INACTIVA', fechaRegistro: T0 },
  ];

  const usuarios: Usuario[] = [
    { id: 1, idTienda: null, idCliente: null, username: 'admin', claveHash: hAdmin, rol: 'ADMIN_SISTEMA', estado: 'ACTIVO', ultimoAcceso: null, fechaRegistro: T0 },
    { id: 2, idTienda: 1, idCliente: null, username: 'bodega.sanpedro', claveHash: hNeg, rol: 'ADMIN_NEGOCIO', estado: 'ACTIVO', ultimoAcceso: null, fechaRegistro: T0 },
    { id: 3, idTienda: 2, idCliente: null, username: 'maria.torres', claveHash: hNeg, rol: 'ADMIN_NEGOCIO', estado: 'ACTIVO', ultimoAcceso: null, fechaRegistro: T0 },
    { id: 4, idTienda: 3, idCliente: null, username: 'jorge.ramirez', claveHash: hNeg, rol: 'ADMIN_NEGOCIO', estado: 'ACTIVO', ultimoAcceso: null, fechaRegistro: T0 },
    { id: 5, idTienda: 4, idCliente: null, username: 'ana.perez', claveHash: hNeg, rol: 'ADMIN_NEGOCIO', estado: 'INACTIVO', ultimoAcceso: null, fechaRegistro: T0 },
    { id: 6, idTienda: 1, idCliente: 1, username: 'juan.perez', claveHash: hCli, rol: 'CLIENTE', estado: 'ACTIVO', ultimoAcceso: null, fechaRegistro: T0 },
  ];

  const producto = (p: Omit<ProductoServicio, 'idTienda' | 'imagenUrl'>): ProductoServicio => ({ ...p, idTienda: 1, imagenUrl: null });
  const productos: ProductoServicio[] = [
    producto({ id: 1, codigo: 'P-001', tipoItem: 'PRODUCTO', proveedor: 'Alicorp', marca: 'Primor', descripcion: 'Canasta Familiar Mensual', unidadMedida: 'Pack x 12 unidades', precioContado: 550, precioCredito: 600, modalidadPermitida: 'AMBAS', estado: 'ACTIVO' }),
    producto({ id: 2, codigo: 'P-002', tipoItem: 'PRODUCTO', proveedor: 'Distribuidora Norte', marca: 'Primor', descripcion: 'Aceite Vegetal x Caja', unidadMedida: 'Caja x 12', precioContado: 180, precioCredito: 210, modalidadPermitida: 'FIN_MES', estado: 'ACTIVO' }),
    producto({ id: 3, codigo: 'S-001', tipoItem: 'SERVICIO', proveedor: 'Operador Local', marca: 'CrediBarrio Express', descripcion: 'Servicio de Delivery Barrial', unidadMedida: 'Servicio', precioContado: 12, precioCredito: 15, modalidadPermitida: 'CUOTAS', estado: 'ACTIVO' }),
    producto({ id: 4, codigo: 'P-003', tipoItem: 'PRODUCTO', proveedor: 'Mayorista Centro', marca: 'Sapolio', descripcion: 'Combo Aseo Hogar', unidadMedida: 'Pack', precioContado: 75, precioCredito: 89, modalidadPermitida: 'AMBAS', estado: 'INACTIVO' }),
    producto({ id: 5, codigo: 'P-004', tipoItem: 'PRODUCTO', proveedor: null, marca: 'Varios', descripcion: 'Compra de Abarrotes', unidadMedida: 'Bolsa', precioContado: 92, precioCredito: 100, modalidadPermitida: 'FIN_MES', estado: 'ACTIVO' }),
    producto({ id: 6, codigo: 'P-005', tipoItem: 'PRODUCTO', proveedor: 'Gloria S.A.', marca: 'Gloria', descripcion: 'Compra de Lácteos', unidadMedida: 'Pack', precioContado: 74, precioCredito: 80, modalidadPermitida: 'FIN_MES', estado: 'ACTIVO' }),
  ];

  const cliente = (c: Omit<Cliente, 'idTienda' | 'correo' | 'fechaRegistro'>): Cliente => ({ ...c, idTienda: 1, correo: null, fechaRegistro: T0 });
  const clientes: Cliente[] = [
    cliente({ id: 1, dni: '74859612', nombres: 'Juan', apellidos: 'Pérez Gómez', direccion: 'Calle Los Cedros 240, San Miguel', telefono: '987654321', estado: 'ACTIVO' }),
    cliente({ id: 2, dni: '46782915', nombres: 'María', apellidos: 'Castillo Ruiz', direccion: 'Jr. Las Flores 120', telefono: null, estado: 'ACTIVO' }),
    cliente({ id: 3, dni: '70345621', nombres: 'Luis', apellidos: 'Rojas Vargas', direccion: 'Av. Principal 455', telefono: null, estado: 'ACTIVO' }),
    cliente({ id: 4, dni: '42890177', nombres: 'Carmen', apellidos: 'Aquino Flores', direccion: 'Psje. Los Pinos 12', telefono: null, estado: 'INACTIVO' }),
  ];

  const condiciones: CondicionCredito[] = [
    condicion(1, 1, 1500, 3, 0.24, 0.12, 20, 26),
    condicion(2, 2, 2000, 6, 0.22, 0.1, 15, 25),
    condicion(3, 3, 1000, 3, 0.2, 0.1, 10, 25),
    condicion(4, 4, 800, 2, 0.24, 0.12, 20, 26),
  ];

  // Juego de datos 1: compra en 3 cuotas con gracia total
  const ted = tasaEfectivaDiaria({ tipo: 'EFECTIVA', valor: 0.24, periodoDias: 360 });
  const fechaCompraCuotas = '2026-09-15T11:30';
  const pago1 = fechaPagoCiclo(fechaCompraCuotas, 20, 26);
  const cuotas: Cuota[] = cuotasDesdeCronograma(3, cronogramaFrances(600, ted, fechaCompraCuotas, pago1, 3)).map((q, i) => ({ ...q, id: i + 1 }));

  const compra = (c: Omit<Compra, 'idCliente' | 'idCondicion' | 'estado' | 'fechaRegistro'>): Compra => ({
    ...c,
    idCliente: 1,
    idCondicion: 1,
    estado: 'REGISTRADA',
    fechaRegistro: c.fechaHoraCompra,
  });
  const compras: Compra[] = [
    // Juego de datos 2: compras a fin de mes antes del corte del 20/09/2026
    compra({ id: 1, fechaHoraCompra: '2026-09-05T09:15', modalidad: 'FIN_MES', numeroCuotas: null, capital: 100, fechaPago: '2026-09-26', detalle: [{ idProducto: 5, descripcionItem: 'Compra de Abarrotes', cantidad: 1, precioUnitarioCredito: 100, subtotal: 100 }] }),
    compra({ id: 2, fechaHoraCompra: '2026-09-12T18:40', modalidad: 'FIN_MES', numeroCuotas: null, capital: 80, fechaPago: '2026-09-26', detalle: [{ idProducto: 6, descripcionItem: 'Compra de Lácteos', cantidad: 1, precioUnitarioCredito: 80, subtotal: 80 }] }),
    compra({ id: 3, fechaHoraCompra: fechaCompraCuotas, modalidad: 'CUOTAS', numeroCuotas: 3, capital: 600, fechaPago: pago1, detalle: [{ idProducto: 1, descripcionItem: 'Canasta Familiar Mensual', cantidad: 1, precioUnitarioCredito: 600, subtotal: 600 }] }),
  ];

  const bitacora: RegistroAuditoria[] = [
    { id: 1, idUsuario: null, accion: 'INICIALIZAR', entidad: 'sistema', idRegistro: null, detalle: 'Carga de datos de demostración', fechaHora: T0 },
  ];

  return {
    tienda: tiendas,
    usuario: usuarios,
    producto_servicio: productos,
    cliente: clientes,
    condicion_credito: condiciones,
    compra: compras,
    cuota: cuotas,
    liquidacion: [],
    pago: [],
    bitacora_auditoria: bitacora,
  };
}
