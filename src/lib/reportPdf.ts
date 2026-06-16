import type { ReportPeriod, ReportSummary } from '../services';

// ── Brand palette (RGB tuples for jsPDF) ─────────────────────────────────────
const B = {
  primary:   [122, 154,   1] as [number, number, number],
  accent:    [216,  96,  24] as [number, number, number],
  warning:   [242, 169,   0] as [number, number, number],
  dark:      [ 83,  86,  90] as [number, number, number],
  secondary: [136, 137, 141] as [number, number, number],
  bg:        [247, 247, 247] as [number, number, number],
  slate100:  [237, 237, 238] as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  success:   [122, 154,   1] as [number, number, number],
  danger:    [216,  96,  24] as [number, number, number],
};

export const PDF_BAR_COLORS: [number, number, number][] = [
  B.primary,
  B.accent,
  B.warning,
  B.dark,
  B.secondary,
  [168, 200,  64], // #A8C840 tint primary
  [232, 144,  80], // #E89050 tint accent
  [245, 200,  64], // #F5C840 tint warning
];

// Hex equivalents for use in Tailwind inline styles
export const PDF_BAR_HEX = [
  '#7A9A01',
  '#D86018',
  '#F2A900',
  '#53565A',
  '#88898D',
  '#A8C840',
  '#E89050',
  '#F5C840',
];

const CHART_TITLES: Record<ReportPeriod, string> = {
  mensual:     'Flujo de Caja Mensual',
  trimestral:  'Flujo de Caja Trimestral',
  anual:       'Flujo de Caja Anual',
};

const CHART_SUBTITLES: Record<ReportPeriod, string> = {
  mensual:    'Ingresos vs. Egresos — Últimos 6 Meses',
  trimestral: 'Ingresos vs. Egresos — Q1 a Q4 del Año en Curso',
  anual:      'Ingresos vs. Egresos — ENE a DIC del Año en Curso',
};

const BREAKDOWN_SUBTITLE: Record<ReportPeriod, string> = {
  mensual:    'Egresos — Últimos 6 meses',
  trimestral: 'Egresos — Trimestre en curso',
  anual:      'Egresos — Año en curso (YTD)',
};

const PROJECTION_META: Record<ReportPeriod, { title: string; desc: string }> = {
  mensual: {
    title: 'Proyección al Cierre del Año',
    desc: 'Basado en el promedio mensual de los últimos 3 meses, Intexa ArCa proyecta el cierre del año.',
  },
  trimestral: {
    title: 'Proyección al Cierre del Año',
    desc: 'Basado en el promedio de los trimestres anteriores, Intexa ArCa proyecta los trimestres restantes.',
  },
  anual: {
    title: 'Proyección al Cierre del Año',
    desc: 'Basado en el ritmo acumulado del año en curso, Intexa ArCa proyecta el cierre de diciembre.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pageHeader(doc: any, subtitle: string, W: number, MARGIN: number) {
  doc.setFillColor(...B.dark);
  doc.rect(0, 0, W, 22, 'F');

  // Logo dot
  doc.setFillColor(...B.primary);
  doc.circle(MARGIN + 4, 11, 3.5, 'F');

  // Brand name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...B.white);
  doc.text('INTEXA ARCA', MARGIN + 12, 12);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(190, 190, 190);
  doc.text(subtitle, MARGIN + 12, 17.5);

  // Date — top right
  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(today, W - MARGIN, 17.5, { align: 'right' });
}

function pageFooter(doc: any, pageNum: number, totalPages: number, W: number, H: number, MARGIN: number) {
  doc.setFillColor(...B.slate100);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...B.secondary);
  doc.text('© 2026 Intexa ArCa — Información financiera confidencial', MARGIN, H - 3.5);
  doc.text(`Pág. ${pageNum} / ${totalPages}`, W - MARGIN, H - 3.5, { align: 'right' });
}

function sectionTitle(doc: any, title: string, subtitle: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...B.dark);
  doc.text(title, x, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...B.secondary);
  doc.text(subtitle.toUpperCase(), x, y + 5);
  return y + 10;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function downloadReportPDF(
  data: ReportSummary,
  period: ReportPeriod,
  formatCurrency: (n: number) => string,
  chartEl: HTMLElement,
) {
  const [{ jsPDF }, autoTableMod, html2canvasMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('html2canvas'),
  ]);
  const autoTable = (autoTableMod as any).default ?? autoTableMod;
  const html2canvas = (html2canvasMod as any).default ?? html2canvasMod;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const MARGIN = 14;
  const CW = W - MARGIN * 2; // content width

  // ── Page 1: Header + chart snapshot + category bars ──────────────────────
  pageHeader(doc, `Módulo de Reportes — ${CHART_TITLES[period]}`, W, MARGIN);

  let y = 30;

  // Cash flow chart snapshot
  y = sectionTitle(doc, CHART_TITLES[period], CHART_SUBTITLES[period], MARGIN, y);

  const chartCanvas = await html2canvas(chartEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  const chartImg = chartCanvas.toDataURL('image/png');
  const chartAspect = chartCanvas.height / chartCanvas.width;
  const chartImgH = Math.min(CW * chartAspect, 68);
  doc.addImage(chartImg, 'PNG', MARGIN, y, CW, chartImgH);
  y += chartImgH + 10;

  // Category breakdown — drawn as PDF primitives (crisp at any zoom)
  y = sectionTitle(doc, 'Gastos por Categoría', BREAKDOWN_SUBTITLE[period], MARGIN, y);

  const BAR_H = 3.5;
  const ROW_GAP = 8;

  (data.categoryBreakdown ?? []).forEach((cat, i) => {
    if (y > H - 30) return;
    const color = PDF_BAR_COLORS[i % PDF_BAR_COLORS.length];

    // Label row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...B.dark);
    doc.text(cat.name, MARGIN, y);
    doc.text(`${cat.value}%`, W - MARGIN, y, { align: 'right' });
    y += 3.5;

    // Track
    doc.setFillColor(...B.slate100);
    doc.roundedRect(MARGIN, y, CW, BAR_H, 1.5, 1.5, 'F');
    // Fill
    const fillW = Math.max(CW * (cat.value / 100), 3);
    doc.setFillColor(...color);
    doc.roundedRect(MARGIN, y, fillW, BAR_H, 1.5, 1.5, 'F');

    y += BAR_H + ROW_GAP;
  });

  // ── Page 2: Tables + projection ──────────────────────────────────────────
  doc.addPage();
  pageHeader(doc, 'Detalle por Categoría y Proyección', W, MARGIN);
  y = 30;

  // Cash flow table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...B.dark);
  doc.text('Flujo de Caja', MARGIN, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Período', 'Ingresos', 'Egresos', 'Neto']],
    body: (data.cashFlowChart ?? []).map(p => [
      p.name,
      formatCurrency(p.ingresos),
      formatCurrency(p.egresos),
      formatCurrency(p.ingresos - p.egresos),
    ]),
    styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
    headStyles: { fillColor: B.dark, textColor: B.white, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', textColor: B.primary },
      2: { halign: 'right', textColor: B.accent },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: B.bg },
    didParseCell: (d: any) => {
      if (d.column.index === 3 && d.section === 'body') {
        const row = data.cashFlowChart[d.row.index];
        if (row) d.cell.styles.textColor = row.ingresos >= row.egresos ? B.primary : B.accent;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Category comparison table
  if ((data.categoryTable ?? []).length > 0) {
    if (y > H - 60) { doc.addPage(); pageHeader(doc, 'Detalle por Categoría y Proyección', W, MARGIN); y = 30; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...B.dark);
    doc.text('Gasto por Categoría — Comparativa', MARGIN, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Categoría', 'Período actual', 'Período anterior', 'Variación', 'Tendencia']],
      body: data.categoryTable.map(r => [
        r.category,
        formatCurrency(r.amount),
        r.prev > 0 ? formatCurrency(r.prev) : '—',
        r.prev === 0 ? 'Nuevo' : `${r.change > 0 ? '+' : ''}${r.change.toFixed(1)}%`,
        r.prev > 0 ? (r.isPositive ? '↓ Baja' : '↑ Sube') : '',
      ]),
      styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
      headStyles: { fillColor: B.dark, textColor: B.white, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right', textColor: B.secondary },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' },
      },
      alternateRowStyles: { fillColor: B.bg },
      didParseCell: (d: any) => {
        if (d.section !== 'body') return;
        const row = data.categoryTable[d.row.index];
        if (!row) return;
        if (d.column.index === 3 && row.prev > 0) {
          d.cell.styles.textColor = row.isPositive ? B.primary : B.accent;
        }
        if (d.column.index === 4 && row.prev > 0) {
          d.cell.styles.textColor = row.isPositive ? B.primary : B.accent;
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Projection summary box
  const boxH = 40;
  if (y + boxH > H - 14) { doc.addPage(); pageHeader(doc, 'Detalle por Categoría y Proyección', W, MARGIN); y = 30; }

  // Box background + accent bar
  doc.setFillColor(...B.bg);
  doc.roundedRect(MARGIN, y, CW, boxH, 4, 4, 'F');
  doc.setFillColor(...B.primary);
  doc.roundedRect(MARGIN, y, 3.5, boxH, 2, 2, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...B.primary);
  doc.text(PROJECTION_META[period].title, MARGIN + 9, y + 8);

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...B.dark);
  const descLines = doc.splitTextToSize(PROJECTION_META[period].desc, CW - 14);
  doc.text(descLines, MARGIN + 9, y + 14);

  // Metrics
  const col2x = MARGIN + CW / 2 + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...B.secondary);
  doc.text('CIERRE PROYECTADO', MARGIN + 9, y + 28);
  doc.setFontSize(11);
  doc.setTextColor(...B.primary);
  doc.text(formatCurrency(data.annual.projectedClose), MARGIN + 9, y + 35);

  doc.setFontSize(7);
  doc.setTextColor(...B.secondary);
  doc.text('TASA DE ÉXITO HISTÓRICO', col2x, y + 28);
  doc.setFontSize(11);
  doc.setTextColor(...(data.annual.probability >= 60 ? B.primary : B.accent));
  doc.text(`${data.annual.probability}%`, col2x, y + 35);

  // ── Footers on every page ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    pageFooter(doc, p, totalPages, W, H, MARGIN);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`reporte-${period}-${dateStr}-arca.pdf`);
}
