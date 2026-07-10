import { getPersonal, guardarManipuladores, guardarTemperaturas, guardarSuperficies, guardarRecepcion, getHistorial } from './db.js'

// ── Estado global ──────────────────────────────────────────────────────────
const estado = {
  turno: 'Mañana',
  responsable: '',
  tabActiva: 'manipuladores',
  vistaHistorial: false,
  filtroHistorial: null,
  personal: [],
  personalTodos: [],
  prodCount: 1,
}

// ── Datos ──────────────────────────────────────────────────────────────────
const ITEMS_MANIP = [
  { label: 'Manos limpias', sub: 'Sin suciedad visible, uñas cortas y sin barniz' },
  { label: 'Sin accesorios', sub: 'Sin anillos, collares ni maquillaje excesivo' },
  { label: 'Uniforme completo', sub: 'Mandil, malla/gorro, polera manga larga' },
  { label: 'Estado de salud', sub: 'Sin síntomas evidentes (tos, heridas en manos)' },
]

const ITEMS_SUP = [
  { label: 'Horno', sub: 'Limpio y sanitizado', seccion: 'limpieza' },
  { label: 'Roller de vienesas', sub: 'Limpio sin residuos', seccion: 'limpieza' },
  { label: 'Campanas', sub: 'Limpias sin grasa', seccion: 'limpieza' },
  { label: 'Salseras de autoservicio', sub: 'Limpias sin chorreos', seccion: 'limpieza' },
  { label: 'Cajones de pan', sub: 'Limpios y ordenados', seccion: 'limpieza' },
  { label: 'Máquinas de café', sub: 'Limpias y operativas', seccion: 'limpieza' },
  { label: 'Mesón de atención', sub: 'Limpio y despejado', seccion: 'limpieza' },
  { label: 'Pisos, muros y canaletas', sub: 'Sin acumulación de residuos', seccion: 'limpieza' },
  { label: 'Dispensadores de jabón y papel', sub: 'Abastecidos y limpios', seccion: 'limpieza' },
  { label: 'Basureros con bolsa', sub: 'Con tapa, llenado máx 3/4', seccion: 'desechos' },
  { label: 'Envases químicos rotulados', sub: 'Identificados y en buen estado', seccion: 'quimicos' },
  { label: 'Rociadores identificados', sub: 'Rotulados con producto', seccion: 'quimicos' },
  { label: 'Almacenamiento químicos correcto', sub: 'Separados de alimentos', seccion: 'quimicos' },
]

const EQUIPOS_TEMP = [
  { equipo: 'Refrigerador Grab & Go', min: 0, max: 5, unidad: '°C', correctiva: 'Entre 5°C y 7°C → enfriar / sobre 7°C → mermar' },
  { equipo: 'Vitrina refrigerada', min: 0, max: 5, unidad: '°C', correctiva: 'Entre 5°C y 7°C → enfriar / sobre 7°C → mermar' },
  { equipo: 'Congelador 1', min: -99, max: -18, unidad: '°C', correctiva: 'Sobre -12°C → usar productos de inmediato' },
  { equipo: 'Congelador 2', min: -99, max: -18, unidad: '°C', correctiva: 'Sobre -12°C → usar productos de inmediato' },
  { equipo: 'Vienesas en mantención (roller)', min: 65, max: 999, unidad: '°C', correctiva: '60°C–65°C → recalentar / bajo 60°C → mermar' },
  { equipo: 'Vienesas en cocción', min: 74, max: 999, unidad: '°C', correctiva: 'Prolongar cocción hasta alcanzar 74°C' },
  { equipo: 'Mayonesa en salsera', min: 0, max: 5, unidad: '°C', correctiva: 'Reemplazar producto, mantener cadena de frío' },
  { equipo: 'Mostaza en salsera', min: 0, max: 5, unidad: '°C', correctiva: 'Reemplazar producto, mantener cadena de frío' },
  { equipo: 'Ketchup en salsera', min: 0, max: 5, unidad: '°C', correctiva: 'Reemplazar producto, mantener cadena de frío' },
  { equipo: 'Salsa de ajo en salsera', min: 0, max: 5, unidad: '°C', correctiva: 'Reemplazar producto, mantener cadena de frío' },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function hoy() {
  const d = new Date()
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
}

function horaActual() {
  return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
}

function mostrarToast(msg, tipo = 'ok') {
  const t = document.getElementById('toast')
  t.innerHTML = `<i class="ti ${tipo === 'ok' ? 'ti-check' : 'ti-alert-circle'}"></i> ${msg}`
  t.className = `toast show ${tipo === 'error' ? 'error' : ''}`
  setTimeout(() => t.className = 'toast', 3000)
}

function makeSelectPersonal(todos = false) {
  const lista = todos ? estado.personalTodos : estado.personal
  return lista.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('')
}

// ── Render principal ───────────────────────────────────────────────────────
function renderApp() {
  document.getElementById('app').innerHTML = `
    <header class="app-header">
      <div class="logo"><i class="ti ti-clipboard-check"></i></div>
      <div>
        <h1>Registros BPM</h1>
        <p>Pronto Express — EDS 40533</p>
      </div>
      <button class="btn-historial" onclick="toggleHistorial()">
        <i class="ti ti-history"></i> Historial
      </button>
    </header>

    <div class="meta-bar">
      <span class="fecha-txt"><i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;margin-right:4px"></i>${hoy()}</span>
      <div class="turno-grupo">
        ${['Mañana','Tarde','Noche'].map(t =>
          `<button class="turno-btn ${estado.turno === t ? 'activo' : ''}" onclick="setTurno('${t}')">${t[0]}</button>`
        ).join('')}
      </div>
    </div>

    <div class="resp-bar">
      <i class="ti ti-shield-check"></i>
      <select id="resp-select" onchange="setResponsable(this.value)">
        <option value="">— Responsable del turno —</option>
        ${makeSelectPersonal(true)}
      </select>
    </div>

    <div class="tabs">
      ${[
        { id: 'manipuladores', icon: 'ti-user-check', label: 'Manipuladores' },
        { id: 'temperatura', icon: 'ti-temperature', label: 'Temperatura' },
        { id: 'superficies', icon: 'ti-spray', label: 'Superficies' },
        { id: 'recepcion', icon: 'ti-truck-delivery', label: 'Recepción' },
      ].map(t => `
        <button class="tab-btn ${estado.tabActiva === t.id ? 'activo' : ''}" onclick="setTab('${t.id}')">
          <i class="ti ${t.icon}"></i>${t.label}
        </button>
      `).join('')}
    </div>

    ${renderManipuladores()}
    ${renderTemperatura()}
    ${renderSuperficies()}
    ${renderRecepcion()}

    <div id="historial-panel" class="historial-panel ${estado.vistaHistorial ? 'activo' : ''}">
      <div class="historial-filtros">
        ${[null,'manipuladores','temperatura','superficies','recepcion'].map((f,i) => {
          const labels = ['Todos','Manipuladores','Temperatura','Superficies','Recepción']
          return `<button class="filtro-btn ${estado.filtroHistorial === f ? 'activo' : ''}" onclick="setFiltroHistorial(${JSON.stringify(f)})">${labels[i]}</button>`
        }).join('')}
      </div>
      <div id="historial-lista"><p class="empty-historial">Cargando historial...</p></div>
    </div>

    <div class="toast" id="toast"></div>
  `
  if (estado.vistaHistorial) cargarHistorial()
}

function renderManipuladores() {
  return `
  <div class="tab-content ${estado.tabActiva === 'manipuladores' ? 'activo' : ''}" id="tab-manipuladores">
    <div class="seccion-titulo">Personal en turno</div>
    <div class="card">
      <div class="persona-selector" id="personal-lista">
        <div class="persona-fila">
          <select onchange="actualizarPersonal()">
            <option value="">— Seleccionar persona —</option>
            ${makeSelectPersonal()}
          </select>
          <button class="btn-remove-persona" onclick="quitarPersona(this)">×</button>
        </div>
      </div>
      <button class="btn-agregar-persona" onclick="agregarPersonaFila()">
        <i class="ti ti-plus"></i> Agregar otra persona
      </button>
    </div>

    <div class="seccion-titulo">Higiene de manipuladores</div>
    <div id="manipuladores-items">
      <div class="empty-msg">Selecciona al menos una persona para continuar</div>
    </div>

    <div class="submit-area">
      <button class="btn-guardar" id="btn-guardar-manip" onclick="guardarManip()">
        <i class="ti ti-device-floppy"></i> Guardar registro
      </button>
    </div>
  </div>`
}

function renderTemperatura() {
  return `
  <div class="tab-content ${estado.tabActiva === 'temperatura' ? 'activo' : ''}" id="tab-temperatura">
    <div class="seccion-titulo">Equipos y alimentos</div>
    ${EQUIPOS_TEMP.map((eq, i) => {
      const rango = eq.max === 999 ? `≥ ${eq.min}°C` : eq.min === -99 ? `≤ ${eq.max}°C` : `${eq.min}°C – ${eq.max}°C`
      return `
      <div class="card">
        <div class="card-label">${eq.equipo}</div>
        <div class="card-sub">Rango: ${rango}</div>
        <div class="temp-fila">
          <label>Temperatura</label>
          <input type="number" id="temp-${i}" placeholder="—" step="0.1"
            oninput="checkTemp(this,${eq.min},${eq.max},'tbadge-${i}','tcorr-${i}')">
          <span class="temp-uc">°C</span>
          <span class="temp-badge" id="tbadge-${i}"></span>
        </div>
        <div class="correctiva-temp" id="tcorr-${i}">
          <textarea placeholder="${eq.correctiva}"></textarea>
        </div>
      </div>`
    }).join('')}

    <div class="submit-area">
      <button class="btn-guardar" onclick="guardarTemp()">
        <i class="ti ti-device-floppy"></i> Guardar registro
      </button>
    </div>
  </div>`
}

function renderSuperficies() {
  return `
  <div class="tab-content ${estado.tabActiva === 'superficies' ? 'activo' : ''}" id="tab-superficies">
    <div class="seccion-titulo">Limpieza y sanitización</div>
    ${ITEMS_SUP.filter(i => i.seccion === 'limpieza').map(renderCNItem).join('')}
    <div class="seccion-titulo">Manejo de desechos</div>
    ${ITEMS_SUP.filter(i => i.seccion === 'desechos').map(renderCNItem).join('')}
    <div class="seccion-titulo">Manejo de químicos</div>
    ${ITEMS_SUP.filter(i => i.seccion === 'quimicos').map(renderCNItem).join('')}
    <div class="submit-area">
      <button class="btn-guardar" onclick="guardarSup()">
        <i class="ti ti-device-floppy"></i> Guardar registro
      </button>
    </div>
  </div>`
}

function renderCNItem(item, i) {
  return `
  <div class="card" data-item="${item.label}" data-seccion="${item.seccion}">
    <div class="card-label">${item.label}</div>
    <div class="card-sub">${item.sub}</div>
    <div class="cn-row">
      <button class="cn-btn" onclick="setCN(this,'cumple')"><i class="ti ti-check"></i> Cumple</button>
      <button class="cn-btn" onclick="setCN(this,'nocumple')"><i class="ti ti-x"></i> No cumple</button>
      <button class="cn-btn" onclick="setCN(this,'na')">N/A</button>
    </div>
    <div class="correctiva"><textarea placeholder="Acción correctiva tomada..."></textarea></div>
  </div>`
}

function renderRecepcion() {
  return `
  <div class="tab-content ${estado.tabActiva === 'recepcion' ? 'activo' : ''}" id="tab-recepcion">
    <div class="seccion-titulo">Datos del proveedor</div>
    <div class="card">
      <div class="grid-2">
        <div><label>Proveedor</label><input type="text" id="rec-proveedor" placeholder="Nombre"></div>
        <div><label>N° factura</label><input type="text" id="rec-factura" placeholder="000000"></div>
        <div><label>Patente camión</label><input type="text" id="rec-patente" placeholder="XXXX-XX"></div>
        <div><label>Higiene camión</label>
          <select id="rec-higiene">
            <option value="">Seleccionar</option>
            <option>Cumple</option>
            <option>No cumple</option>
          </select>
        </div>
      </div>
    </div>

    <div class="seccion-titulo">Productos recibidos</div>
    <div id="productos-lista">
      ${renderProducto(1)}
    </div>
    <button class="btn-agregar-producto" onclick="agregarProducto()">
      <i class="ti ti-plus"></i> Agregar otro producto
    </button>

    <div class="seccion-titulo">Responsable de recepción</div>
    <div class="card">
      <select id="rec-responsable" style="width:100%;font-size:14px;padding:8px 10px;border:1px solid var(--gris-borde);border-radius:var(--radio);background:var(--gris-1);color:var(--texto)">
        <option value="">— Seleccionar responsable —</option>
        ${makeSelectPersonal(true)}
      </select>
    </div>

    <div class="submit-area">
      <button class="btn-guardar" onclick="guardarRec()">
        <i class="ti ti-device-floppy"></i> Guardar registro
      </button>
    </div>
  </div>`
}

function renderProducto(n) {
  return `
  <div class="card producto-card" id="prod-${n}">
    <div class="card-label">Producto ${n}</div>
    <div class="grid-2">
      <div><label>Producto</label><input type="text" placeholder="Ej: Vienesas"></div>
      <div><label>Temperatura</label><input type="number" placeholder="°C" step="0.5"></div>
      <div><label>Fecha elaboración</label><input type="date" style="border-color:var(--gris-borde)"></div>
      <div><label>Fecha vencimiento *</label><input type="date" required></div>
      <div><label>Estado empaque</label>
        <select><option value="">Seleccionar</option><option>Cumple</option><option>No cumple</option></select>
      </div>
      <div><label>Decisión</label>
        <select><option value="">Seleccionar</option><option>Acepta</option><option>Rechaza</option></select>
      </div>
    </div>
  </div>`
}

// ── Acciones UI ────────────────────────────────────────────────────────────
window.setTurno = (t) => { estado.turno = t; renderApp() }
window.setTab = (t) => {
  estado.tabActiva = t
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'))
  document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('activo'))
  document.querySelector(`.tab-btn[onclick="setTab('${t}')"]`).classList.add('activo')
  document.getElementById(`tab-${t}`).classList.add('activo')
}
window.setResponsable = (v) => { estado.responsable = v }

window.setCN = (btn, tipo) => {
  const row = btn.closest('.cn-row')
  row.querySelectorAll('.cn-btn').forEach(b => b.classList.remove('cumple','nocumple','na'))
  btn.classList.add(tipo)
  const corr = btn.closest('.card').querySelector('.correctiva')
  corr.classList.toggle('visible', tipo === 'nocumple')
}

window.checkTemp = (input, min, max, badgeId, corrId) => {
  const v = parseFloat(input.value)
  const badge = document.getElementById(badgeId)
  const corr = document.getElementById(corrId)
  if (isNaN(v)) { badge.textContent = ''; badge.className = 'temp-badge'; corr.classList.remove('visible'); return }
  const ok = v >= min && v <= max
  badge.textContent = ok ? 'OK' : 'Fuera de rango'
  badge.className = `temp-badge ${ok ? 'ok' : 'mal'}`
  corr.classList.toggle('visible', !ok)
}

window.agregarPersonaFila = () => {
  const lista = document.getElementById('personal-lista')
  const fila = document.createElement('div')
  fila.className = 'persona-fila'
  fila.innerHTML = `
    <select onchange="actualizarPersonal()">
      <option value="">— Seleccionar persona —</option>
      ${makeSelectPersonal()}
    </select>
    <button class="btn-remove-persona" onclick="quitarPersona(this)">×</button>`
  lista.appendChild(fila)
}

window.quitarPersona = (btn) => {
  const filas = document.querySelectorAll('#personal-lista .persona-fila')
  if (filas.length <= 1) { btn.closest('.persona-fila').querySelector('select').value = ''; actualizarPersonal(); return }
  btn.closest('.persona-fila').remove()
  actualizarPersonal()
}

window.actualizarPersonal = () => {
  const seleccionados = []
  document.querySelectorAll('#personal-lista select').forEach(s => {
    if (s.value && !seleccionados.includes(s.value)) seleccionados.push(s.value)
  })
  const lista = document.getElementById('manipuladores-items')
  if (seleccionados.length === 0) {
    lista.innerHTML = '<div class="empty-msg">Selecciona al menos una persona para continuar</div>'
    return
  }
  lista.innerHTML = seleccionados.map(nombre => `
    <div style="margin-bottom:1rem">
      <div class="persona-header"><i class="ti ti-user"></i><span>${nombre}</span></div>
      ${ITEMS_MANIP.map(item => `
        <div class="card" data-persona="${nombre}" data-item="${item.label}" style="margin-bottom:0.5rem">
          <div class="card-label">${item.label}</div>
          <div class="card-sub">${item.sub}</div>
          <div class="cn-row">
            <button class="cn-btn" onclick="setCN(this,'cumple')"><i class="ti ti-check"></i> Cumple</button>
            <button class="cn-btn" onclick="setCN(this,'nocumple')"><i class="ti ti-x"></i> No cumple</button>
            <button class="cn-btn" onclick="setCN(this,'na')">N/A</button>
          </div>
          <div class="correctiva"><textarea placeholder="Acción correctiva tomada..."></textarea></div>
        </div>`).join('')}
    </div>`).join('')
}

window.agregarProducto = () => {
  estado.prodCount++
  const lista = document.getElementById('productos-lista')
  lista.insertAdjacentHTML('beforeend', renderProducto(estado.prodCount))
}

window.toggleHistorial = () => {
  estado.vistaHistorial = !estado.vistaHistorial
  renderApp()
}

window.setFiltroHistorial = (f) => {
  estado.filtroHistorial = f
  renderApp()
}

// ── Guardar ────────────────────────────────────────────────────────────────
window.guardarManip = async () => {
  if (!estado.responsable) { mostrarToast('Selecciona el responsable del turno', 'error'); return }
  const cards = document.querySelectorAll('#manipuladores-items .card[data-persona]')
  if (cards.length === 0) { mostrarToast('Selecciona al menos una persona', 'error'); return }

  const items = []
  cards.forEach(card => {
    const activo = card.querySelector('.cn-btn.cumple,.cn-btn.nocumple,.cn-btn.na')
    const resultado = activo?.classList.contains('cumple') ? 'C' : activo?.classList.contains('nocumple') ? 'NC' : 'NA'
    items.push({
      persona: card.dataset.persona,
      item: card.dataset.item,
      resultado: resultado || 'NA',
      accion_correctiva: card.querySelector('.correctiva textarea')?.value || null
    })
  })

  const btn = document.getElementById('btn-guardar-manip')
  btn.classList.add('guardando')
  btn.innerHTML = '<i class="ti ti-loader"></i> Guardando...'
  btn.disabled = true

  try {
    await guardarManipuladores({ turno: estado.turno, responsable: estado.responsable, items })
    mostrarToast(`Registro guardado — ${horaActual()}`)
  } catch(e) {
    mostrarToast('Error al guardar. Verifica la conexión.', 'error')
  }
  btn.classList.remove('guardando')
  btn.innerHTML = '<i class="ti ti-device-floppy"></i> Guardar registro'
  btn.disabled = false
}

window.guardarTemp = async () => {
  if (!estado.responsable) { mostrarToast('Selecciona el responsable del turno', 'error'); return }
  const items = EQUIPOS_TEMP.map((eq, i) => {
    const input = document.getElementById(`temp-${i}`)
    const v = parseFloat(input?.value)
    const resultado = isNaN(v) ? null : (v >= eq.min && v <= eq.max ? 'OK' : 'FUERA_RANGO')
    const corr = document.getElementById(`tcorr-${i}`)?.querySelector('textarea')?.value
    return { equipo: eq.equipo, rango_min: eq.min === -99 ? null : eq.min, rango_max: eq.max === 999 ? null : eq.max, temperatura: isNaN(v) ? null : v, resultado, accion_correctiva: corr || null }
  })
  try {
    await guardarTemperaturas({ turno: estado.turno, responsable: estado.responsable, items })
    mostrarToast(`Registro guardado — ${horaActual()}`)
  } catch(e) {
    mostrarToast('Error al guardar. Verifica la conexión.', 'error')
  }
}

window.guardarSup = async () => {
  if (!estado.responsable) { mostrarToast('Selecciona el responsable del turno', 'error'); return }
  const items = []
  document.querySelectorAll('#tab-superficies .card').forEach(card => {
    if (!card.dataset.item) return
    const activo = card.querySelector('.cn-btn.cumple,.cn-btn.nocumple,.cn-btn.na')
    const resultado = activo?.classList.contains('cumple') ? 'C' : activo?.classList.contains('nocumple') ? 'NC' : 'NA'
    items.push({ item: card.dataset.item, seccion: card.dataset.seccion, resultado: resultado || 'NA', accion_correctiva: card.querySelector('.correctiva textarea')?.value || null })
  })
  try {
    await guardarSuperficies({ turno: estado.turno, responsable: estado.responsable, items })
    mostrarToast(`Registro guardado — ${horaActual()}`)
  } catch(e) {
    mostrarToast('Error al guardar. Verifica la conexión.', 'error')
  }
}

window.guardarRec = async () => {
  const responsable = document.getElementById('rec-responsable')?.value
  if (!responsable) { mostrarToast('Selecciona el responsable de recepción', 'error'); return }

  const productos = []
  document.querySelectorAll('.producto-card').forEach(card => {
    const inputs = card.querySelectorAll('input')
    const selects = card.querySelectorAll('select')
    const fv = inputs[3]?.value
    if (!fv) return
    productos.push({
      producto: inputs[0]?.value || '—',
      temperatura: parseFloat(inputs[1]?.value) || null,
      fechaElaboracion: inputs[2]?.value || null,
      fechaVencimiento: fv,
      estadoEmpaque: selects[0]?.value || null,
      decision: selects[1]?.value || 'Acepta'
    })
  })

  if (productos.length === 0) { mostrarToast('Ingresa al menos un producto con fecha de vencimiento', 'error'); return }

  try {
    await guardarRecepcion({
      responsable,
      proveedor: document.getElementById('rec-proveedor')?.value,
      nFactura: document.getElementById('rec-factura')?.value,
      patenteCamion: document.getElementById('rec-patente')?.value,
      higieneCamion: document.getElementById('rec-higiene')?.value,
      productos
    })
    mostrarToast(`Recepción guardada — ${horaActual()}`)
  } catch(e) {
    mostrarToast('Error al guardar. Verifica la conexión.', 'error')
  }
}

// ── Historial ──────────────────────────────────────────────────────────────
async function cargarHistorial() {
  const lista = document.getElementById('historial-lista')
  if (!lista) return
  try {
    const data = await getHistorial(estado.filtroHistorial)
    if (data.length === 0) {
      lista.innerHTML = '<p class="empty-historial">No hay registros en los últimos 3 meses</p>'
      return
    }
    const tipos = { manipuladores: 'Manipuladores', temperatura: 'Temperatura', superficies: 'Superficies', recepcion: 'Recepción' }
    lista.innerHTML = data.map(r => `
      <div class="historial-item">
        <div class="nc-dot ${r.tiene_nc ? 'tiene-nc' : ''}"></div>
        <div class="info">
          <strong>${tipos[r.tipo] || r.tipo} — ${r.turno}</strong>
          <span>${new Date(r.fecha).toLocaleDateString('es-CL')} · ${r.responsable} ${r.tiene_nc ? '· <span style="color:var(--rojo)">Con NC</span>' : ''}</span>
        </div>
      </div>`).join('')
  } catch(e) {
    lista.innerHTML = '<p class="empty-historial">Error al cargar historial</p>'
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  renderApp()
  try {
    const todos = await getPersonal()
    estado.personal = todos.filter(p => p.rol !== 'supervisora')
    estado.personalTodos = todos
    renderApp()
  } catch(e) {
    // Sin conexión a Supabase: usar lista hardcodeada para demo
    estado.personal = [
      { nombre: 'Zoila Caimanque', rol: 'tienda' },
      { nombre: 'Vianca Rivera', rol: 'tienda' },
      { nombre: 'Ivonne Rojas', rol: 'tienda' },
      { nombre: 'Gabriela Lara', rol: 'tienda' },
      { nombre: 'Vanessa Guerrero', rol: 'tienda' },
    ]
    estado.personalTodos = [
      { nombre: 'María Luisa Acuña', rol: 'supervisora' },
      ...estado.personal
    ]
    renderApp()
  }
}

init()
