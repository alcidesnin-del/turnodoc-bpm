import { supabase } from './supabase.js'

const EDS_CODIGO = '40533'

// ─────────────────────────────────────────────
// TURNOS (modelo de 2 turnos)
// Día:   09:00 – 21:00
// Noche: 21:01 – 08:59 (cruza medianoche)
// Un registro de Noche pertenece a la JORNADA en que el turno comenzó:
// entre 00:00 y 08:59 la jornada vigente es la del día anterior.
// ─────────────────────────────────────────────
export const BLOQUES = [
  { id: 'dia',   label: 'Día',   inicio: '09:00', fin: '21:00' },
  { id: 'noche', label: 'Noche', inicio: '21:01', fin: '08:59' },
]

// A partir de esta fecha rige el modelo de 2 turnos. Antes, los días solo
// se evalúan por tipo de formulario (modelo antiguo de 3 turnos).
export const FECHA_CORTE_2_TURNOS = '2026-10-14'

// Fecha local (YYYY-MM-DD) sin el desfase de UTC
export function fechaLocal(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// Fecha de la jornada vigente: antes de las 09:00 sigue siendo la jornada de ayer
export function jornadaActual(d = new Date()) {
  const ref = new Date(d)
  if (ref.getHours() < 9) ref.setDate(ref.getDate() - 1)
  return fechaLocal(ref)
}

export function getBloqueActual() {
  const now = new Date()
  const minutos = now.getHours() * 60 + now.getMinutes()
  return minutos >= 9 * 60 && minutos <= 21 * 60 ? 'dia' : 'noche'
}

export function getTurnoActual() {
  return getBloqueActual() === 'dia' ? 'Día' : 'Noche'
}

// Los registros antiguos usan Mañana/Tarde (se leen como Día) y Noche
export function normalizarTurno(t) {
  if (t === 'Mañana' || t === 'Tarde' || t === 'Día') return 'Día'
  if (t === 'Noche') return 'Noche'
  return t
}

export function esRetroactivo(fechaStr) {
  return fechaStr !== jornadaActual()
}

async function getEdsId() {
  const { data } = await supabase.from('eds').select('id').eq('codigo', EDS_CODIGO).single()
  return data?.id
}

export async function getPersonal(rol = null) {
  const edsId = await getEdsId()
  let query = supabase.from('personal').select('*').eq('eds_id', edsId).eq('activo', true)
    .order('rol', { ascending: true }).order('nombre', { ascending: true })
  if (rol) query = query.eq('rol', rol)
  const { data } = await query
  return data || []
}

// ─────────────────────────────────────────────
// GUARDAR REGISTROS (con retroactivo + motivo)
// ─────────────────────────────────────────────
export async function guardarManipuladores({ turno, responsable, items, fecha, motivoRetroactivo }) {
  const edsId = await getEdsId()
  const fechaRegistro = fecha || jornadaActual()
  const retroactivo = esRetroactivo(fechaRegistro)
  const { data: registro, error } = await supabase.from('registros_bpm').insert({
    eds_id: edsId, tipo: 'manipuladores', fecha: fechaRegistro, turno, responsable,
    tiene_nc: items.some(i => i.resultado === 'NC'),
    retroactivo, motivo_retroactivo: retroactivo ? (motivoRetroactivo || null) : null,
  }).select().single()
  if (error) throw error
  const { error: err2 } = await supabase.from('registro_manipuladores').insert(
    items.map(i => ({ registro_id: registro.id, persona: i.persona, item: i.item, resultado: i.resultado, accion_correctiva: i.accion_correctiva || null }))
  )
  if (err2) throw err2
  return registro
}

export async function guardarTemperaturas({ turno, responsable, items, fecha, motivoRetroactivo }) {
  const edsId = await getEdsId()
  const fechaRegistro = fecha || jornadaActual()
  const retroactivo = esRetroactivo(fechaRegistro)
  const { data: registro, error } = await supabase.from('registros_bpm').insert({
    eds_id: edsId, tipo: 'temperatura', fecha: fechaRegistro, turno, responsable,
    tiene_nc: items.some(i => i.resultado === 'FUERA_RANGO'),
    retroactivo, motivo_retroactivo: retroactivo ? (motivoRetroactivo || null) : null,
  }).select().single()
  if (error) throw error
  const { error: err2 } = await supabase.from('registro_temperaturas').insert(
    items.map(i => ({ registro_id: registro.id, equipo: i.equipo, rango_min: i.rango_min, rango_max: i.rango_max, temperatura: i.temperatura, resultado: i.resultado, accion_correctiva: i.accion_correctiva || null }))
  )
  if (err2) throw err2
  return registro
}

export async function guardarSuperficies({ turno, responsable, items, fecha, motivoRetroactivo }) {
  const edsId = await getEdsId()
  const fechaRegistro = fecha || jornadaActual()
  const retroactivo = esRetroactivo(fechaRegistro)
  const { data: registro, error } = await supabase.from('registros_bpm').insert({
    eds_id: edsId, tipo: 'superficies', fecha: fechaRegistro, turno, responsable,
    tiene_nc: items.some(i => i.resultado === 'NC'),
    retroactivo, motivo_retroactivo: retroactivo ? (motivoRetroactivo || null) : null,
  }).select().single()
  if (error) throw error
  const { error: err2 } = await supabase.from('registro_superficies').insert(
    items.map(i => ({ registro_id: registro.id, item: i.item, seccion: i.seccion, resultado: i.resultado, accion_correctiva: i.accion_correctiva || null }))
  )
  if (err2) throw err2
  return registro
}

export async function guardarRecepcion({ responsable, proveedor, nFactura, patenteCamion, higieneCamion, productos, fecha, motivoRetroactivo }) {
  const edsId = await getEdsId()
  const fechaRegistro = fecha || jornadaActual()
  const retroactivo = esRetroactivo(fechaRegistro)
  const { data: registro, error } = await supabase.from('registros_bpm').insert({
    eds_id: edsId, tipo: 'recepcion', fecha: fechaRegistro, turno: '—', responsable,
    tiene_nc: productos.some(p => p.decision === 'Rechaza'),
    retroactivo, motivo_retroactivo: retroactivo ? (motivoRetroactivo || null) : null,
  }).select().single()
  if (error) throw error
  const { error: err2 } = await supabase.from('registro_recepcion').insert(
    productos.map(p => ({ registro_id: registro.id, proveedor, n_factura: nFactura, patente_camion: patenteCamion, higiene_camion: higieneCamion, producto: p.producto, temperatura: p.temperatura || null, fecha_elaboracion: p.fechaElaboracion || null, fecha_vencimiento: p.fechaVencimiento, estado_empaque: p.estadoEmpaque, decision: p.decision }))
  )
  if (err2) throw err2
  return registro
}

// ─────────────────────────────────────────────
// ESTADO DEL DÍA
// ─────────────────────────────────────────────
export async function getEstadoDia(fecha = null) {
  const edsId = await getEdsId()
  const fechaConsulta = fecha || jornadaActual()
  const { data } = await supabase.from('registros_bpm').select('tipo, turno, created_at, retroactivo, motivo_retroactivo').eq('eds_id', edsId).eq('fecha', fechaConsulta)
  const registros = data || []
  return {
    fecha: fechaConsulta,
    manipuladores: registros.filter(r => r.tipo === 'manipuladores'),
    temperatura: registros.filter(r => r.tipo === 'temperatura'),
    superficies: registros.filter(r => r.tipo === 'superficies'),
    recepcion: registros.filter(r => r.tipo === 'recepcion'),
  }
}

// ─────────────────────────────────────────────
// COMPLETITUD POR TURNO
// ─────────────────────────────────────────────
const TIPOS_OBLIGATORIOS = ['manipuladores', 'temperatura', 'superficies']

// Devuelve [{ turno, faltantes[] }] según las reglas del modelo vigente para esa fecha
function faltantesDelDia(registrosDia, fecha, jornada) {
  const regs = registrosDia || []
  // Días anteriores al corte: regla antigua (solo tipos, sin turno)
  if (fecha < FECHA_CORTE_2_TURNOS) {
    const tipos = new Set(regs.map(r => r.tipo))
    const f = TIPOS_OBLIGATORIOS.filter(t => !tipos.has(t))
    return f.length ? [{ turno: 'Día', faltantes: f }] : []
  }
  // En la jornada vigente solo se exige el turno Día (la Noche aún no cierra)
  const turnos = fecha === jornada ? ['Día'] : ['Día', 'Noche']
  const out = []
  turnos.forEach(turno => {
    const tipos = new Set(regs.filter(r => normalizarTurno(r.turno) === turno).map(r => r.tipo))
    const f = TIPOS_OBLIGATORIOS.filter(t => !tipos.has(t))
    if (f.length) out.push({ turno, faltantes: f })
  })
  return out
}

function recorrerFechas(desdeStr, hastaStr, fn) {
  const cursor = new Date(desdeStr + 'T12:00:00')
  const fin = new Date(hastaStr + 'T12:00:00')
  while (cursor <= fin) {
    fn(fechaLocal(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
}

// ─────────────────────────────────────────────
// PANEL DE SUPERVISIÓN
// ─────────────────────────────────────────────
export async function getPanelSupervision(diasAtras = 7) {
  const edsId = await getEdsId()
  const jornada = jornadaActual()
  const base = new Date(jornada + 'T12:00:00')
  base.setDate(base.getDate() - diasAtras)
  const fechaDesde = fechaLocal(base)

  const { data: registros } = await supabase.from('registros_bpm')
    .select('fecha, tipo, turno, responsable, created_at, retroactivo, motivo_retroactivo, tiene_nc')
    .eq('eds_id', edsId).gte('fecha', fechaDesde).lte('fecha', jornada)
    .order('fecha', { ascending: false }).order('created_at', { ascending: true })

  const porFecha = {}
  recorrerFechas(fechaDesde, jornada, f => {
    porFecha[f] = { fecha: f, registros: [], completo: false, tieneRetroactivos: false, tieneNC: false, faltantes: [] }
  })

  ;(registros || []).forEach(r => {
    if (porFecha[r.fecha]) {
      porFecha[r.fecha].registros.push(r)
      if (r.retroactivo) porFecha[r.fecha].tieneRetroactivos = true
      if (r.tiene_nc) porFecha[r.fecha].tieneNC = true
    }
  })

  Object.values(porFecha).forEach(d => {
    d.faltantes = faltantesDelDia(d.registros, d.fecha, jornada)
    d.completo = d.faltantes.length === 0
  })

  return Object.values(porFecha).sort((a, b) => b.fecha.localeCompare(a.fecha))
}

// ─────────────────────────────────────────────
// DÍAS PENDIENTES
// Devuelve [{ fecha, faltantes: [{ turno, faltantes[] }] }]
// ─────────────────────────────────────────────
export async function getDiasPendientes(diasAtras = 30) {
  const edsId = await getEdsId()
  const jornada = jornadaActual()
  const base = new Date(jornada + 'T12:00:00')
  base.setDate(base.getDate() - diasAtras)
  // La lista de pendientes parte desde la fecha de corte (no se arrastra historial anterior)
  let fechaDesde = fechaLocal(base)
  if (fechaDesde < FECHA_CORTE_2_TURNOS) fechaDesde = FECHA_CORTE_2_TURNOS

  const { data: registros } = await supabase.from('registros_bpm').select('fecha, tipo, turno').eq('eds_id', edsId).gte('fecha', fechaDesde).lte('fecha', jornada)

  const porFecha = {}
  ;(registros || []).forEach(r => {
    if (!porFecha[r.fecha]) porFecha[r.fecha] = []
    porFecha[r.fecha].push(r)
  })

  const pendientes = []
  recorrerFechas(fechaDesde, jornada, f => {
    const falt = faltantesDelDia(porFecha[f], f, jornada)
    if (falt.length > 0) pendientes.push({ fecha: f, faltantes: falt })
  })
  return pendientes
}

// ─────────────────────────────────────────────
// HISTORIAL Y DETALLE
// ─────────────────────────────────────────────
export async function getHistorial(tipo = null) {
  let query = supabase.from('historial_bpm').select('*')
  if (tipo) query = query.eq('tipo', tipo)
  const { data } = await query
  return data || []
}

export async function getDetalleRegistro(registroId, tipo) {
  const tablas = { manipuladores: 'registro_manipuladores', temperatura: 'registro_temperaturas', superficies: 'registro_superficies', recepcion: 'registro_recepcion' }
  const { data } = await supabase.from(tablas[tipo]).select('*').eq('registro_id', registroId)
  return data || []
}

export async function getRegistrosDia(fecha) {
  const { data: registros } = await supabase.from('registros_bpm').select('*').eq('fecha', fecha).order('created_at', { ascending: true })
  if (!registros || registros.length === 0) return []
  const tablas = { manipuladores: 'registro_manipuladores', temperatura: 'registro_temperaturas', superficies: 'registro_superficies', recepcion: 'registro_recepcion' }
  return Promise.all(registros.map(async reg => {
    const { data: detalles } = await supabase.from(tablas[reg.tipo]).select('*').eq('registro_id', reg.id)
    return { ...reg, detalles: detalles || [] }
  }))
}

export async function getRegistrosPeriodo(fechaDesde, fechaHasta) {
  const { data: registros } = await supabase.from('registros_bpm').select('*').gte('fecha', fechaDesde).lte('fecha', fechaHasta).order('fecha', { ascending: true }).order('created_at', { ascending: true })
  if (!registros || registros.length === 0) return []
  const tablas = { manipuladores: 'registro_manipuladores', temperatura: 'registro_temperaturas', superficies: 'registro_superficies', recepcion: 'registro_recepcion' }
  return Promise.all(registros.map(async reg => {
    const { data: detalles } = await supabase.from(tablas[reg.tipo]).select('*').eq('registro_id', reg.id)
    return { ...reg, detalles: detalles || [] }
  }))
}
