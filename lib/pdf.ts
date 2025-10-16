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

  // Open PDF in new window/tab for preview
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  // Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
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

  // Open PDF in new window/tab for preview
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  // Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
}

export function generateInTransitStatusPDF(batch: LaundryBatch): void {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE STATUS - LAVANDERIA', 105, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('HOTEL MAERKLI', 105, 28, { align: 'center' });

  // Status badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const statusText = batch.status === 'in_transit' ? 'EM TRÂNSITO' : 'RETORNO PARCIAL';
  const statusColor = batch.status === 'in_transit' ? [232, 155, 60] : [234, 88, 12]; // Gold or orange
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`Status: ${statusText}`, 105, 36, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Dates
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const sentDate = batch.sentDate ? format(new Date(batch.sentDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';
  doc.text(`Enviado em: ${sentDate}`, 14, 46);

  if (batch.sentBy) {
    doc.text(`Responsável pelo envio: ${batch.sentBy}`, 14, 52);
  }

  if (batch.returnedDate) {
    const returnDate = format(new Date(batch.returnedDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Primeira entrega em: ${returnDate}`, 14, batch.sentBy ? 58 : 52);
  }

  // Items table
  const tableStartY = batch.returnedDate ? (batch.sentBy ? 66 : 60) : (batch.sentBy ? 60 : 54);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Itens Enviados:', 14, tableStartY);

  const sentTableData: (string | number)[][] = [];
  const categories = Object.keys(batch.totalItems) as LaundryCategory[];

  categories.forEach(category => {
    const quantity = batch.totalItems[category];
    if (quantity > 0) {
      sentTableData.push([
        LAUNDRY_CATEGORIES[category],
        quantity
      ]);
    }
  });

  const totalSent = Object.values(batch.totalItems).reduce((sum, val) => sum + val, 0);

  autoTable(doc, {
    startY: tableStartY + 4,
    head: [['Item', 'Quantidade']],
    body: sentTableData,
    foot: [['Total Enviado', totalSent]],
    theme: 'grid',
    headStyles: {
      fillColor: [58, 91, 160],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [232, 155, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'right' }
    },
    styles: {
      fontSize: 10,
      cellPadding: 3
    }
  });

  let currentY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;

  // If there are partial returns, show what's still missing
  if (batch.returnedItems && batch.discrepancies && batch.discrepancies.length > 0) {
    currentY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('⚠ Itens Ainda na Lavanderia:', 14, currentY);
    doc.setTextColor(0, 0, 0);

    const missingTableData: (string | number)[][] = [];
    let totalMissing = 0;

    batch.discrepancies.forEach(disc => {
      if (disc.difference < 0) { // Only items not yet returned
        const missing = Math.abs(disc.difference);
        missingTableData.push([
          LAUNDRY_CATEGORIES[disc.category],
          missing
        ]);
        totalMissing += missing;
      }
    });

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Item', 'Faltando']],
      body: missingTableData,
      foot: [['Total Faltando', totalMissing]],
      theme: 'grid',
      headStyles: {
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [153, 27, 27],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      }
    });

    currentY = ((doc as unknown) as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || currentY;

    // Show what was already returned
    currentY += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text('✓ Já Retornado:', 14, currentY);
    doc.setTextColor(0, 0, 0);

    const returnedTableData: (string | number)[][] = [];
    let totalReturned = 0;

    categories.forEach(category => {
      const returned = batch.returnedItems![category];
      if (returned > 0) {
        returnedTableData.push([
          LAUNDRY_CATEGORIES[category],
          returned
        ]);
        totalReturned += returned;
      }
    });

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Item', 'Quantidade']],
      body: returnedTableData,
      foot: [['Total Retornado', totalReturned]],
      theme: 'grid',
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [21, 128, 61],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' }
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      }
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Lote #${batch.id}`, 14, pageHeight - 10);
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.text(`Relatório gerado em: ${now}`, 105, pageHeight - 10, { align: 'center' });

  // Open PDF in new window/tab for preview
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');

  // Clean up the URL after a delay
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
}
