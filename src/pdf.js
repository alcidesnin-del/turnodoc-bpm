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

  const fechasOrdenadas = Object.keys(porFecha).sort()
  
  // Generar PDF por cada día y combinar
  // Por simplicidad generamos un PDF con todas las fechas
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 15
  let y = M
  let primeraPagina = true

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
    y = 24
  }

  dibujarHeader()

  // Resumen ejecutivo
  const totalRegistros = registros.length
  const conNC = registros.filter(r => r.tiene_nc).length
  const sinNC = totalRegistros - conNC

  doc.setFillColor(GRIS_CLARO)
  doc.rect(M, y, W - M * 2, 18, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(NEGRO)
  doc.text('Resumen del período', M + 3, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Total de registros: ${totalRegistros}`, M + 3, y + 12)
  doc.setTextColor(VERDE)
  doc.text(`Sin incumplimientos: ${sinNC}`, M + 50, y + 12)
  doc.setTextColor(ROJO)
  doc.text(`Con incumplimientos: ${conNC}`, M + 100, y + 12)
  doc.setTextColor(NEGRO)
  y += 22

  for (const fecha of fechasOrdenadas) {
    if (!primeraPagina) {
      doc.addPage()
      dibujarHeader()
    }
    primeraPagina = false

    doc.setFillColor('#EBF2FB')
    doc.rect(M, y, W - M * 2, 10, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(AZUL)
    doc.text(fechaLegible(fecha), M + 3, y + 7)
    doc.setTextColor(NEGRO)
    y += 13

    const regsDelDia = porFecha[fecha]
    const TURNOS = ['Mañana', 'Tarde', 'Noche']

    for (const turno of TURNOS) {
      const regsTurno = regsDelDia.filter(r => r.turno === turno)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(AZUL)
      doc.text(`Turno ${turno}:`, M, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(NEGRO)

      if (regsTurno.length === 0) {
        doc.setTextColor(ROJO)
        doc.text('Sin registros', M + 22, y)
        doc.setTextColor(NEGRO)
        y += 5
        continue
      }

      const tipos = regsTurno.map(r => {
        const tieneNC = r.tiene_nc
        const label = { manipuladores: 'Manip.', temperatura: 'Temp.', superficies: 'Superf.', recepcion: 'Recep.' }[r.tipo]
        return { label, tieneNC }
      })

      let xPos = M + 22
      tipos.forEach(t => {
        doc.setTextColor(t.tieneNC ? ROJO : VERDE)
        doc.text(`${t.tieneNC ? '✗' : '✓'} ${t.label}`, xPos, y)
        xPos += 28
      })
      doc.setTextColor(NEGRO)
      y += 5
    }

    // Detalles de NC si los hay
    const regsConNC = regsDelDia.filter(r => r.tiene_nc && r.detalles)
    if (regsConNC.length > 0) {
      y += 2
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(ROJO)
      doc.text('Incumplimientos del día:', M, y)
      doc.setTextColor(NEGRO)
      y += 4

      regsConNC.forEach(reg => {
        const tipoLabel = { manipuladores: 'Manipuladores', temperatura: 'Temperatura', superficies: 'Superficies', recepcion: 'Recepción' }[reg.tipo]
        if (reg.detalles) {
          const ncs = reg.detalles.filter(d => d.resultado === 'NC' || d.resultado === 'FUERA_RANGO' || d.decision === 'Rechaza')
          ncs.forEach(nc => {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            const texto = `• [${tipoLabel} - ${reg.turno}] ${nc.item || nc.equipo || nc.producto}: ${nc.accion_correctiva || 'Sin acción registrada'}`
            const lineas = doc.splitTextToSize(texto, W - M * 2 - 5)
            doc.text(lineas, M + 3, y)
            y += lineas.length * 4
          })
        }
      })
    }

    doc.setDrawColor('#E5E7EB')
    doc.line(M, y + 2, W - M, y + 2)
    y += 6
  }

  // Pie de página
  const totalPaginas = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(GRIS)
    doc.text(`Página ${i} de ${totalPaginas}`, W / 2, 290, { align: 'center' })
    doc.text('TurnoDoc BPM — Pronto Express EDS 40533', M, 290)
    doc.text(`Impreso: ${new Date().toLocaleString('es-CL')}`, W - M, 290, { align: 'right' })
  }

  const nombreArchivo = `BPM_${fechaDesde}_al_${fechaHasta}_EDS40533.pdf`
  doc.save(nombreArchivo)
}
