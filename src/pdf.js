// Generador de PDF para auditoría BPM
// Usa jsPDF cargado desde CDN

const AZUL = '#1B4F8A'
const VERDE = '#1A6B3C'
const ROJO = '#B91C1C'
const GRIS = '#6B7280'
const GRIS_CLARO = '#F3F4F6'
const NEGRO = '#111827'

function fechaLegible(str) {
  if (!str) return '—'
  const d = new Date(str + 'T12:00:00')
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`
}

function fechaCorta(str) {
  if (!str) return '—'
  const d = new Date(str + 'T12:00:00')
  return d.toLocaleDateString('es-CL')
}

async function cargarJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve(window.jspdf.jsPDF)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function cargarAutoTable() {
  if (window.jspdf?.jsPDF?.API?.autoTable) return
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export async function generarPDFDia(fecha, registrosDia, supabase) {
  const JsPDF = await cargarJsPDF()
  await cargarAutoTable()

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 15 // margen
  let y = M

  function nuevaPaginaSiNecesario(espacioNecesario = 30) {
    if (y + espacioNecesario > 270) {
      doc.addPage()
      y = M
      dibujarHeader()
    }
  }

  function dibujarHeader() {
    doc.setFillColor(AZUL)
    doc.rect(0, 0, W, 18, 'F')
    doc.setTextColor('#FFFFFF')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Registros BPM — Pronto Express', M, 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('EDS 40533 · Gobernadora Laura Pizarro N°111, Ovalle', M, 14)
    doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, W - M, 14, { align: 'right' })
    doc.setTextColor(NEGRO)
    y = 24
  }

  function seccionTitulo(texto, color = AZUL) {
    nuevaPaginaSiNecesario(20)
    doc.setFillColor(color)
    doc.rect(M, y, W - M * 2, 7, 'F')
    doc.setTextColor('#FFFFFF')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(texto, M + 3, y + 5)
    doc.setTextColor(NEGRO)
    y += 10
  }

  function metaInfo(turno, responsable, hora) {
    doc.setFillColor(GRIS_CLARO)
    doc.rect(M, y, W - M * 2, 8, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(GRIS)
    doc.text(`Turno: ${turno}`, M + 3, y + 5.5)
    doc.text(`Responsable: ${responsable}`, M + 35, y + 5.5)
    if (hora) doc.text(`Hora: ${hora}`, W - M - 3, y + 5.5, { align: 'right' })
    doc.setTextColor(NEGRO)
    y += 11
  }

  // ── INICIO DEL DOCUMENTO ──────────────────────────────────────────────────
  dibujarHeader()

  // Título del día
  doc.setFillColor(GRIS_CLARO)
  doc.rect(M, y, W - M * 2, 12, 'F')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(AZUL)
  doc.text(`Registros del día: ${fechaLegible(fecha)}`, M + 4, y + 8)
  doc.setTextColor(NEGRO)
  y += 16

  const TURNOS = ['Mañana', 'Tarde', 'Noche']
  const TIPOS = ['manipuladores', 'temperatura', 'superficies', 'recepcion']
  const TIPO_LABELS = { manipuladores: 'Higiene de Manipuladores', temperatura: 'Control de Temperatura', superficies: 'Higiene de Superficies y Químicos', recepcion: 'Recepción de Materias Primas' }

  for (const turno of TURNOS) {
    const registrosTurno = registrosDia.filter(r => r.turno === turno)
    if (registrosTurno.length === 0) {
      nuevaPaginaSiNecesario(20)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(AZUL)
      doc.text(`Turno ${turno}`, M, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(ROJO)
      doc.text('Sin registros para este turno', M + 30, y)
      doc.setTextColor(NEGRO)
      y += 8
      continue
    }

    nuevaPaginaSiNecesario(15)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(AZUL)
    doc.text(`Turno ${turno}`, M, y)
    doc.setTextColor(NEGRO)
    y += 6

    for (const reg of registrosTurno) {
      const hora = reg.created_at ? new Date(reg.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : null

      seccionTitulo(TIPO_LABELS[reg.tipo] || reg.tipo)
      metaInfo(turno, reg.responsable, hora)

      if (reg.tipo === 'manipuladores' && reg.detalles) {
        const personas = [...new Set(reg.detalles.map(d => d.persona))]
        for (const persona of personas) {
          nuevaPaginaSiNecesario(25)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(AZUL)
          doc.text(`Manipulador: ${persona}`, M, y)
          doc.setTextColor(NEGRO)
          y += 4

          const itemsPersona = reg.detalles.filter(d => d.persona === persona)
          const rows = itemsPersona.map(d => [
            d.item,
            d.resultado === 'C' ? 'Cumple' : d.resultado === 'NC' ? 'No cumple' : 'N/A',
            d.accion_correctiva || '—'
          ])

          doc.autoTable({
            startY: y,
            head: [['Ítem', 'Resultado', 'Acción correctiva']],
            body: rows,
            margin: { left: M, right: M },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [235, 242, 251], textColor: [27, 79, 138], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 65 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 'auto' } },
            didParseCell: (data) => {
              if (data.column.index === 1 && data.section === 'body') {
                if (data.cell.raw === 'No cumple') data.cell.styles.textColor = [185, 28, 28]
                if (data.cell.raw === 'Cumple') data.cell.styles.textColor = [26, 107, 60]
              }
            },
            didDrawPage: () => { y = doc.lastAutoTable.finalY + 4 }
          })
          y = doc.lastAutoTable.finalY + 6
        }
      }

      if (reg.tipo === 'temperatura' && reg.detalles) {
        const rows = reg.detalles.map(d => [
          d.equipo,
          d.rango_min !== null && d.rango_max !== null ? `${d.rango_min}°C – ${d.rango_max}°C` : d.rango_max === null ? `≥ ${d.rango_min}°C` : `≤ ${d.rango_max}°C`,
          d.temperatura !== null ? `${d.temperatura}°C` : '—',
          d.resultado === 'OK' ? 'OK' : d.resultado === 'FUERA_RANGO' ? 'Fuera de rango' : '—',
          d.accion_correctiva || '—'
        ])
        doc.autoTable({
          startY: y,
          head: [['Equipo / Producto', 'Rango', 'Temperatura', 'Resultado', 'Acción correctiva']],
          body: rows,
          margin: { left: M, right: M },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [235, 242, 251], textColor: [27, 79, 138], fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 25 }, 2: { cellWidth: 22, halign: 'center' }, 3: { cellWidth: 25, halign: 'center' }, 4: { cellWidth: 'auto' } },
          didParseCell: (data) => {
            if (data.column.index === 3 && data.section === 'body') {
              if (data.cell.raw === 'Fuera de rango') data.cell.styles.textColor = [185, 28, 28]
              if (data.cell.raw === 'OK') data.cell.styles.textColor = [26, 107, 60]
            }
          },
          didDrawPage: () => { y = doc.lastAutoTable.finalY + 4 }
        })
        y = doc.lastAutoTable.finalY + 6
      }

      if (reg.tipo === 'superficies' && reg.detalles) {
        const secciones = { limpieza: 'Limpieza y sanitización', desechos: 'Manejo de desechos', quimicos: 'Manejo de químicos' }
        for (const [sec, secLabel] of Object.entries(secciones)) {
          const itemsSec = reg.detalles.filter(d => d.seccion === sec)
          if (itemsSec.length === 0) continue
          nuevaPaginaSiNecesario(20)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(GRIS)
          doc.text(secLabel.toUpperCase(), M, y)
          doc.setTextColor(NEGRO)
          y += 3
          const rows = itemsSec.map(d => [
            d.item,
            d.resultado === 'C' ? 'Cumple' : d.resultado === 'NC' ? 'No cumple' : 'N/A',
            d.accion_correctiva || '—'
          ])
          doc.autoTable({
            startY: y,
            body: rows,
            margin: { left: M, right: M },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 'auto' } },
            didParseCell: (data) => {
              if (data.column.index === 1 && data.section === 'body') {
                if (data.cell.raw === 'No cumple') data.cell.styles.textColor = [185, 28, 28]
                if (data.cell.raw === 'Cumple') data.cell.styles.textColor = [26, 107, 60]
              }
            },
            didDrawPage: () => { y = doc.lastAutoTable.finalY + 4 }
          })
          y = doc.lastAutoTable.finalY + 4
        }
        y += 2
      }

      if (reg.tipo === 'recepcion' && reg.detalles) {
        const rows = reg.detalles.map(d => [
          d.producto,
          d.proveedor || '—',
          d.temperatura !== null ? `${d.temperatura}°C` : '—',
          fechaCorta(d.fecha_vencimiento),
          d.estado_empaque || '—',
          d.decision
        ])
        doc.autoTable({
          startY: y,
          head: [['Producto', 'Proveedor', 'T°', 'Vencimiento', 'Empaque', 'Decisión']],
          body: rows,
          margin: { left: M, right: M },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [235, 242, 251], textColor: [27, 79, 138], fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 35 }, 2: { cellWidth: 15, halign: 'center' }, 3: { cellWidth: 22, halign: 'center' }, 4: { cellWidth: 22, halign: 'center' }, 5: { cellWidth: 'auto', halign: 'center' } },
          didParseCell: (data) => {
            if (data.column.index === 5 && data.section === 'body') {
              if (data.cell.raw === 'Rechaza') data.cell.styles.textColor = [185, 28, 28]
              if (data.cell.raw === 'Acepta') data.cell.styles.textColor = [26, 107, 60]
            }
          },
          didDrawPage: () => { y = doc.lastAutoTable.finalY + 4 }
        })
        y = doc.lastAutoTable.finalY + 6
      }
    }

    // Línea separadora entre turnos
    doc.setDrawColor(GRIS_CLARO)
    doc.line(M, y, W - M, y)
    y += 6
  }

  // Pie de página en todas las páginas
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(GRIS)
    doc.text(`Página ${i} de ${totalPaginas}`, W / 2, 290, { align: 'center' })
    doc.text('TurnoDoc BPM — Pronto Express EDS 40533', M, 290)
    doc.text(`Impreso: ${new Date().toLocaleString('es-CL')}`, W - M, 290, { align: 'right' })
  }

  const nombreArchivo = `BPM_${fecha}_EDS40533.pdf`
  doc.save(nombreArchivo)
}

export async function generarPDFPeriodo(fechaDesde, fechaHasta, registros, supabase) {
  const JsPDF = await cargarJsPDF()
  await cargarAutoTable()

  // Agrupar por fecha
  const porFecha = {}
  registros.forEach(r => {
    if (!porFecha[r.fecha]) porFecha[r.fecha] = []
    porFecha[r.fecha].push(r)
  })

  // Construir TODOS los días del rango (incluyendo los que no tienen ningún registro)
  const TIPOS_OBLIGATORIOS = ['manipuladores', 'temperatura', 'superficies']
  const diasDelRango = []
  const cursor = new Date(fechaDesde + 'T12:00:00')
  const fin = new Date(fechaHasta + 'T12:00:00')
  while (cursor <= fin) {
    const f = cursor.toISOString().split('T')[0]
    const regsDelDia = porFecha[f] || []
    const tiposDelDia = new Set(regsDelDia.map(r => r.tipo))
    const completo = TIPOS_OBLIGATORIOS.every(t => tiposDelDia.has(t))
    const tieneRetro = regsDelDia.some(r => r.retroactivo)
    const tieneNC = regsDelDia.some(r => r.tiene_nc)
    diasDelRango.push({
      fecha: f,
      registros: regsDelDia,
      completo,
      tieneRetro,
      tieneNC,
      tieneManip: tiposDelDia.has('manipuladores'),
      tieneTemp: tiposDelDia.has('temperatura'),
      tieneSuperf: tiposDelDia.has('superficies'),
      tieneRecep: tiposDelDia.has('recepcion'),
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 15

  function dibujarHeader() {
    doc.setFillColor(AZUL)
    doc.rect(0, 0, W, 18, 'F')
    doc.setTextColor('#FFFFFF')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Registros BPM — Pronto Express', M, 8)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Período: ${fechaCorta(fechaDesde)} al ${fechaCorta(fechaHasta)} · EDS 40533`, M, 14)
    doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, W - M, 14, { align: 'right' })
    doc.setTextColor(NEGRO)
  }

  dibujarHeader()
  let y = 24

  // ─────────────────────────────────────────────
  // RESUMEN EJECUTIVO DEL PERÍODO
  // ─────────────────────────────────────────────
  const totalDias = diasDelRango.length
  const diasCompletos = diasDelRango.filter(d => d.completo && !d.tieneRetro).length
  const diasRetroactivos = diasDelRango.filter(d => d.completo && d.tieneRetro).length
  const diasIncompletos = diasDelRango.filter(d => !d.completo && d.registros.length > 0).length
  const diasSinRegistros = diasDelRango.filter(d => d.registros.length === 0).length
  const diasConNC = diasDelRango.filter(d => d.tieneNC).length

  doc.setFillColor(GRIS_CLARO)
  doc.rect(M, y, W - M * 2, 34, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(NEGRO)
  doc.text('Resumen del período', M + 3, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Total de días en el período: ${totalDias}`, M + 3, y + 13)

  doc.setTextColor(VERDE)
  doc.text(`Completos: ${diasCompletos}`, M + 3, y + 20)
  doc.setTextColor('#D97706')
  doc.text(`Completos con retroactivo: ${diasRetroactivos}`, M + 55, y + 20)

  doc.setTextColor(ROJO)
  doc.text(`Incompletos: ${diasIncompletos}`, M + 3, y + 27)
  doc.setTextColor(GRIS)
  doc.text(`Sin registros: ${diasSinRegistros}`, M + 55, y + 27)

  if (diasConNC > 0) {
    doc.setTextColor(ROJO)
    doc.text(`Días con incumplimientos (NC): ${diasConNC}`, M + 110, y + 20)
  }
  doc.setTextColor(NEGRO)
  y += 40

  // ─────────────────────────────────────────────
  // TABLA COMPACTA: UNA FILA POR DÍA
  // ─────────────────────────────────────────────
  const filas = diasDelRango.map(d => {
    const fechaFmt = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    let estado = 'Sin registros'
    if (d.registros.length > 0) {
      estado = d.completo ? (d.tieneRetro ? 'Retroactivo' : 'Completo') : 'Incompleto'
    }
    return [
      fechaFmt,
      d.tieneManip ? 'Si' : '-',
      d.tieneTemp ? 'Si' : '-',
      d.tieneSuperf ? 'Si' : '-',
      d.tieneRecep ? 'Si' : '-',
      d.tieneNC ? 'Si' : 'No',
      estado,
    ]
  })

  doc.autoTable({
    startY: y,
    head: [['Fecha', 'Manip.', 'Temp.', 'Superf.', 'Recep.', 'NC', 'Estado del día']],
    body: filas,
    theme: 'grid',
    headStyles: { fillColor: AZUL, textColor: '#FFFFFF', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, halign: 'center' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 32 },
      6: { halign: 'left', cellWidth: 32 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const texto = String(data.cell.raw)
        if (data.column.index === 6) {
          if (texto === 'Completo') data.cell.styles.textColor = VERDE
          else if (texto === 'Retroactivo') data.cell.styles.textColor = '#D97706'
          else if (texto === 'Incompleto') data.cell.styles.textColor = ROJO
          else data.cell.styles.textColor = GRIS
        }
        if (data.column.index === 5 && texto === 'Si') {
          data.cell.styles.textColor = ROJO
          data.cell.styles.fontStyle = 'bold'
        }
        if ([1, 2, 3, 4].includes(data.column.index)) {
          data.cell.styles.textColor = texto === 'Si' ? VERDE : GRIS
        }
      }
    },
    margin: { left: M, right: M },
    didDrawPage: () => { dibujarHeader() },
  })

  y = doc.lastAutoTable.finalY + 8

  // ─────────────────────────────────────────────
  // DETALLE DE INCUMPLIMIENTOS (si los hay)
  // ─────────────────────────────────────────────
  const diasConIncumplimientos = diasDelRango.filter(d => d.tieneNC)
  if (diasConIncumplimientos.length > 0) {
    if (y > 250) { doc.addPage(); dibujarHeader(); y = 24 }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(ROJO)
    doc.text('Detalle de incumplimientos (NC) en el período', M, y)
    doc.setTextColor(NEGRO)
    y += 6

    diasConIncumplimientos.forEach(d => {
      if (y > 270) { doc.addPage(); dibujarHeader(); y = 24 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(fechaLegible(d.fecha), M, y)
      y += 4

      d.registros.filter(r => r.tiene_nc).forEach(reg => {
        const tipoLabel = { manipuladores: 'Manipuladores', temperatura: 'Temperatura', superficies: 'Superficies', recepcion: 'Recepción' }[reg.tipo]
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(ROJO)
        const texto = `- [${reg.turno}] ${tipoLabel} - incumplimiento registrado`
        doc.text(texto, M + 3, y)
        doc.setTextColor(NEGRO)
        y += 4
      })
      y += 2
    })
  }

  // ─────────────────────────────────────────────
  // NOTA SOBRE DÍAS RETROACTIVOS (si los hay)
  // ─────────────────────────────────────────────
  const diasConRetro = diasDelRango.filter(d => d.tieneRetro)
  if (diasConRetro.length > 0) {
    if (y > 250) { doc.addPage(); dibujarHeader(); y = 24 }
    y += 4
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#D97706')
    doc.text('Registros retroactivos en el período', M, y)
    doc.setTextColor(NEGRO)
    y += 6

    diasConRetro.forEach(d => {
      if (y > 270) { doc.addPage(); dibujarHeader(); y = 24 }
      const regsRetro = d.registros.filter(r => r.retroactivo)
      regsRetro.forEach(r => {
        const tipoLabel = { manipuladores: 'Manipuladores', temperatura: 'Temperatura', superficies: 'Superficies', recepcion: 'Recepción' }[r.tipo]
        const horaReal = r.created_at ? new Date(r.created_at).toLocaleString('es-CL') : '—'
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        const texto = `- ${fechaCorta(d.fecha)} [${r.turno}] ${tipoLabel} - llenado el ${horaReal} - motivo: "${r.motivo_retroactivo || 'sin motivo registrado'}"`
        const lineas = doc.splitTextToSize(texto, W - M * 2 - 5)
        doc.text(lineas, M + 3, y)
        y += lineas.length * 4
      })
    })
  }

  // ─────────────────────────────────────────────
  // PIE DE PÁGINA
  // ─────────────────────────────────────────────
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(GRIS)
    doc.text(`Página ${i} de ${totalPaginas}`, W / 2, 290, { align: 'center' })
    doc.text('TurnoDoc BPM — Pronto Express EDS 40533', M, 290)
    doc.text(`Impreso: ${new Date().toLocaleString('es-CL')}`, W - M, 290, { align: 'right' })
  }

  const nombreArchivo = `BPM_Resumen_${fechaDesde}_al_${fechaHasta}_EDS40533.pdf`
  doc.save(nombreArchivo)
}
