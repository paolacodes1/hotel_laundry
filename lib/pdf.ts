import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LaundryBatch, LaundryCategory } from '@/types';
import { LAUNDRY_CATEGORIES } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function generateRequisitionPDF(batch: LaundryBatch): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUISIÇÃO LAVANDERIA', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('HOTEL MAERKLI', 105, 28, { align: 'center' });

  // Date and info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = batch.sentDate
    ? format(new Date(batch.sentDate), "dd/MM/yyyy", { locale: ptBR })
    : format(new Date(), "dd/MM/yyyy", { locale: ptBR });

  doc.text(`Data: ${dateStr}`, 14, 40);

  // Show floors if sheets have floor information
  const floors = batch.sheets
    .map(sheet => sheet.floor)
    .filter((floor, index, self) => floor && self.indexOf(floor) === index);

  if (floors.length > 0) {
    doc.text(`Andares: ${floors.join(', ')}`, 14, 46);
    doc.text(`Discriminação`, 14, 54);
  } else {
    doc.text(`Discriminação`, 14, 48);
  }

  // Prepare table data
  const tableData: (string | number)[][] = [];
  const categories = Object.keys(batch.totalItems) as LaundryCategory[];

  categories.forEach(category => {
    const quantity = batch.totalItems[category];
    if (quantity > 0) {
      tableData.push([
        LAUNDRY_CATEGORIES[category],
        quantity
      ]);
    }
  });

  // Calculate total
  const total = Object.values(batch.totalItems).reduce((sum, val) => sum + val, 0);

  // Add table (use floors variable defined earlier)
  const tableStartY = floors.length > 0 ? 60 : 54;

  autoTable(doc, {
    startY: tableStartY,
    head: [['Item', 'Quantia']],
    body: tableData,
    foot: [['Total', total]],
    theme: 'grid',
    headStyles: {
      fillColor: [58, 91, 160], // Primary blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [232, 155, 60], // Accent gold
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' }
    },
    styles: {
      fontSize: 10,
      cellPadding: 4
    }
  });

  // Notes if any
  if (batch.notes) {
    const finalY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;
    doc.setFontSize(9);
    doc.text('Observações:', 14, finalY + 10);
    doc.text(batch.notes, 14, finalY + 16);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Lote #${batch.id}`, 14, pageHeight - 10);
  doc.text('Assinatura: ___________________________', 105, pageHeight - 10, { align: 'center' });

  // Save PDF
  const filename = `requisicao_lavanderia_${dateStr.replace(/\//g, '-')}_${batch.id.slice(-6)}.pdf`;
  doc.save(filename);
}

export function generateReturnComparisonPDF(batch: LaundryBatch): void {
  if (!batch.returnedItems || !batch.discrepancies) {
    throw new Error('Batch has no return data');
  }

  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE RETORNO - LAVANDERIA', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('HOTEL MAERKLI', 105, 28, { align: 'center' });

  // Dates
  doc.setFontSize(10);
  const sentDate = batch.sentDate ? format(new Date(batch.sentDate), "dd/MM/yyyy", { locale: ptBR }) : '-';
  const returnDate = batch.returnedDate ? format(new Date(batch.returnedDate), "dd/MM/yyyy", { locale: ptBR }) : '-';

  doc.text(`Enviado: ${sentDate}`, 14, 40);
  doc.text(`Retornado: ${returnDate}`, 14, 46);

  // Comparison table
  const tableData: (string | number)[][] = [];
  const categories = Object.keys(batch.totalItems) as LaundryCategory[];

  categories.forEach(category => {
    const sent = batch.totalItems[category];
    const returned = batch.returnedItems![category];
    const diff = returned - sent;

    if (sent > 0 || returned > 0) {
      tableData.push([
        LAUNDRY_CATEGORIES[category],
        sent,
        returned,
        diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`
      ]);
    }
  });

  autoTable(doc, {
    startY: 54,
    head: [['Item', 'Enviado', 'Retornado', 'Diferença']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [58, 91, 160],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'center' }
    },
    didParseCell: function(data) {
      if (data.column.index === 3 && data.section === 'body') {
        const value = data.cell.text[0];
        if (value !== 'OK') {
          data.cell.styles.textColor = [220, 38, 38]; // Red for discrepancies
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [22, 163, 74]; // Green for OK
        }
      }
    }
  });

  // Discrepancy summary
  if (batch.discrepancies.length > 0) {
    const finalY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('ATENÇÃO: Foram encontradas discrepâncias!', 14, finalY + 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    batch.discrepancies.forEach((disc, index) => {
      const y = finalY + 20 + (index * 6);
      const msg = disc.difference > 0
        ? `${LAUNDRY_CATEGORIES[disc.category]}: ${disc.difference} a mais do que enviado`
        : `${LAUNDRY_CATEGORIES[disc.category]}: ${Math.abs(disc.difference)} a menos do que enviado`;
      doc.text(`• ${msg}`, 14, y);
    });
  }

  // Save
  const filename = `relatorio_retorno_${returnDate.replace(/\//g, '-')}_${batch.id.slice(-6)}.pdf`;
  doc.save(filename);
}
