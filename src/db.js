import { supabase } from './supabase.js'

const EDS_CODIGO = '40533'

// Obtener ID de la EDS
async function getEdsId() {
  const { data } = await supabase
    .from('eds')
    .select('id')
    .eq('codigo', EDS_CODIGO)
    .single()
  return data?.id
}

// Obtener personal activo
export async function getPersonal(rol = null) {
  const edsId = await getEdsId()
  let query = supabase
    .from('personal')
    .select('*')
    .eq('eds_id', edsId)
    .eq('activo', true)
    .order('rol', { ascending: true })
    .order('nombre', { ascending: true })

  if (rol) query = query.eq('rol', rol)
  const { data } = await query
  return data || []
}

// Guardar registro de manipuladores
export async function guardarManipuladores({ turno, responsable, items }) {
  const edsId = await getEdsId()

  const { data: registro, error } = await supabase
    .from('registros_bpm')
    .insert({
      eds_id: edsId,
      tipo: 'manipuladores',
      fecha: new Date().toISOString().split('T')[0],
      turno,
      responsable,
      tiene_nc: items.some(i => i.resultado === 'NC')
    })
    .select()
    .single()

  if (error) throw error

  const detalles = items.map(i => ({
    registro_id: registro.id,
    persona: i.persona,
    item: i.item,
    resultado: i.resultado,
    accion_correctiva: i.accion_correctiva || null
  }))

  const { error: err2 } = await supabase
    .from('registro_manipuladores')
    .insert(detalles)

  if (err2) throw err2
  return registro
}

// Guardar registro de temperaturas
export async function guardarTemperaturas({ turno, responsable, items }) {
  const edsId = await getEdsId()

  const { data: registro, error } = await supabase
    .from('registros_bpm')
    .insert({
      eds_id: edsId,
      tipo: 'temperatura',
      fecha: new Date().toISOString().split('T')[0],
      turno,
      responsable,
      tiene_nc: items.some(i => i.resultado === 'FUERA_RANGO')
    })
    .select()
    .single()

  if (error) throw error

  const detalles = items.map(i => ({
    registro_id: registro.id,
    equipo: i.equipo,
    rango_min: i.rango_min,
    rango_max: i.rango_max,
    temperatura: i.temperatura,
    resultado: i.resultado,
    accion_correctiva: i.accion_correctiva || null
  }))

  const { error: err2 } = await supabase
    .from('registro_temperaturas')
    .insert(detalles)

  if (err2) throw err2
  return registro
}

// Guardar registro de superficies
export async function guardarSuperficies({ turno, responsable, items }) {
  const edsId = await getEdsId()

  const { data: registro, error } = await supabase
    .from('registros_bpm')
    .insert({
      eds_id: edsId,
      tipo: 'superficies',
      fecha: new Date().toISOString().split('T')[0],
      turno,
      responsable,
      tiene_nc: items.some(i => i.resultado === 'NC')
    })
    .select()
    .single()

  if (error) throw error

  const detalles = items.map(i => ({
    registro_id: registro.id,
    item: i.item,
    seccion: i.seccion,
    resultado: i.resultado,
    accion_correctiva: i.accion_correctiva || null
  }))

  const { error: err2 } = await supabase
    .from('registro_superficies')
    .insert(detalles)

  if (err2) throw err2
  return registro
}

// Guardar registro de recepción
export async function guardarRecepcion({ responsable, proveedor, nFactura, patenteCamion, higieneCamion, productos }) {
  const edsId = await getEdsId()

  const { data: registro, error } = await supabase
    .from('registros_bpm')
    .insert({
      eds_id: edsId,
      tipo: 'recepcion',
      fecha: new Date().toISOString().split('T')[0],
      turno: '—',
      responsable,
      tiene_nc: productos.some(p => p.decision === 'Rechaza')
    })
    .select()
    .single()

  if (error) throw error

  const detalles = productos.map(p => ({
    registro_id: registro.id,
    proveedor,
    n_factura: nFactura,
    patente_camion: patenteCamion,
    higiene_camion: higieneCamion,
    producto: p.producto,
    temperatura: p.temperatura || null,
    fecha_elaboracion: p.fechaElaboracion || null,
    fecha_vencimiento: p.fechaVencimiento,
    estado_empaque: p.estadoEmpaque,
    decision: p.decision
  }))

  const { error: err2 } = await supabase
    .from('registro_recepcion')
    .insert(detalles)

  if (err2) throw err2
  return registro
}

// Obtener historial de los últimos 3 meses
export async function getHistorial(tipo = null) {
  let query = supabase
    .from('historial_bpm')
    .select('*')

  if (tipo) query = query.eq('tipo', tipo)
  const { data } = await query
  return data || []
}

// Obtener detalle de un registro
export async function getDetalleRegistro(registroId, tipo) {
  const tablas = {
    manipuladores: 'registro_manipuladores',
    temperatura: 'registro_temperaturas',
    superficies: 'registro_superficies',
    recepcion: 'registro_recepcion'
  }
  const { data } = await supabase
    .from(tablas[tipo])
    .select('*')
    .eq('registro_id', registroId)
  return data || []
}
