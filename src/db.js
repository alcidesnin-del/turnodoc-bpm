import { supabase } from './supabase.js'

const EDS_CODIGO = '40533'

// ─────────────────────────────────────────────
// BLOQUES HORARIOS
// Día:   09:00 – 12:59  (alerta a las 09:30)
// Tarde: 13:00 – 16:59  (alerta a las 12:59)
// Noche: 17:00 – 21:00  (alerta a las 16:59)
// ─────────────────────────────────────────────
export const BLOQUES = [
  { id: 'dia',   label: 'Día',   inicio: '09:00', fin: '12:59', alertaHH: 9,  alertaMM: 30 },
  { id: 'tarde', label: 'Tarde', inicio: '13:00', fin: '16:59', alertaHH: 12, alertaMM: 59 },
  { id: 'noche', label: 'Noche', inicio: '17:00', fin: '21:00', alertaHH: 16, alertaMM: 59 },
]

export function getBloqueActual() {
  const now = new Date()
  const minutos = now.getHours() * 60 + now.getMinutes()
  if (minutos >= 9*60 && minutos <= 12*60+59) return 'dia'
  if (minutos >= 13*60 && minutos <= 16*60+59) return 'tarde'
  if (minutos >= 17*60 && minutos <= 21*60) return 'noche'
  return null
}

export function esRetroactivo(fechaStr) {
  const hoy = new Date().toISOString().split('T')[0]
  return fechaStr !== hoy
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
  const fechaRegistro = fecha || new Date().toISOString().split('T')[0]
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
  const fechaRegistro = fecha || new Date().toISOString().split('T')[0]
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
  const fechaRegistro = fecha || new Date().toISOString().split('T')[0]
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
  const fechaRegistro = fecha || new Date().toISOString().split('T')[0]
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
  const fechaConsulta = fecha || new Date().toISOString().split('T')[0]
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
// PANEL DE SUPERVISIÓN
// ─────────────────────────────────────────────
export async function getPanelSupervision(diasAtras = 7) {
  const edsId = await getEdsId()
  const hoy = new Date()
  const desde = new Date(hoy)
  desde.setDate(desde.getDate() - diasAtras)
  const fechaDesde = desde.toISOString().split('T')[0]
  const fechaHoy = hoy.toISOString().split('T')[0]

  const { data: registros } = await supabase.from('registros_bpm')
    .select('fecha, tipo, turno, responsable, created_at, retroactivo, motivo_retroactivo, tiene_nc')
    .eq('eds_id', edsId).gte('fecha', fechaDesde).lte('fecha', fechaHoy)
    .order('fecha', { ascending: false }).order('created_at', { ascending: true })

  const porFecha = {}
  const TIPOS = ['manipuladores', 'temperatura', 'superficies']
  const cursor = new Date(desde)
  while (cursor <= hoy) {
    const f = cursor.toISOString().split('T')[0]
    porFecha[f] = { fecha: f, registros: [], completo: false, tieneRetroactivos: false, tieneNC: false }
    cursor.setDate(cursor.getDate() + 1)
  }

  ;(registros || []).forEach(r => {
    if (porFecha[r.fecha]) {
      porFecha[r.fecha].registros.push(r)
      if (r.retroactivo) porFecha[r.fecha].tieneRetroactivos = true
      if (r.tiene_nc) porFecha[r.fecha].tieneNC = true
    }
  })

  Object.values(porFecha).forEach(d => {
    const tipos = new Set(d.registros.map(r => r.tipo))
    d.completo = TIPOS.every(t => tipos.has(t))
  })

  return Object.values(porFecha).sort((a, b) => b.fecha.localeCompare(a.fecha))
}

// ─────────────────────────────────────────────
// DÍAS PENDIENTES
// ─────────────────────────────────────────────
export async function getDiasPendientes(diasAtras = 30) {
  const edsId = await getEdsId()
  const hoy = new Date()
  const desde = new Date(hoy)
  desde.setDate(desde.getDate() - diasAtras)
  const fechaDesde = desde.toISOString().split('T')[0]
  const fechaHoy = hoy.toISOString().split('T')[0]

  const { data: registros } = await supabase.from('registros_bpm').select('fecha, tipo').eq('eds_id', edsId).gte('fecha', fechaDesde).lte('fecha', fechaHoy)

  const porFecha = {}
  ;(registros || []).forEach(r => {
    if (!porFecha[r.fecha]) porFecha[r.fecha] = new Set()
    porFecha[r.fecha].add(r.tipo)
  })

  const TIPOS_OBLIGATORIOS = ['manipuladores', 'temperatura', 'superficies']
  const pendientes = []
  const cursor = new Date(desde)
  while (cursor <= hoy) {
    const fechaStr = cursor.toISOString().split('T')[0]
    const faltantes = TIPOS_OBLIGATORIOS.filter(t => !(porFecha[fechaStr] || new Set()).has(t))
    if (faltantes.length > 0) pendientes.push({ fecha: fechaStr, faltantes })
    cursor.setDate(cursor.getDate() + 1)
  }
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
