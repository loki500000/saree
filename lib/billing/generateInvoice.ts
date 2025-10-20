import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  storeName: string;
  storeId: string;
  credits: number;
  description: string;
  createdBy?: string;
  pricePerCredit?: number;
  gstRate?: number;
  platformName?: string;
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  // Use provided values or defaults
  const pricePerCredit = data.pricePerCredit ?? 10;
  const gstRate = data.gstRate ?? 0.18;
  const platformName = data.platformName ?? 'VIRTUAL TRY-ON';
  const doc = new jsPDF();

  // Company Header
  doc.setFillColor(139, 92, 246); // Purple
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(platformName.toUpperCase(), 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Credit Purchase Invoice', 105, 28, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Invoice Details Box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(15, 50, 180, 30);

  // Invoice Info - Left Side
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 20, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(data.invoiceNumber, 20, 64);

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', 20, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(data.date).toLocaleDateString('en-IN'), 20, 78);

  // Store Info - Right Side
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 110, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(data.storeName, 110, 64);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Store ID: ${data.storeId.substring(0, 8)}...`, 110, 70);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Items Table
  const amount = data.credits * pricePerCredit;
  const tax = amount * gstRate;
  const total = amount + tax;

  autoTable(doc, {
    startY: 90,
    head: [['Description', 'Quantity', 'Rate (₹)', 'Amount (₹)']],
    body: [
      [
        `Virtual Try-On Credits\n${data.description || 'Credit Purchase'}`,
        data.credits.toString(),
        pricePerCredit.toFixed(2),
        amount.toFixed(2)
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  });

  // Get the Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // Subtotal, Tax, Total
  const summaryStartY = finalY + 10;
  const summaryX = 130;

  doc.setDrawColor(200, 200, 200);
  doc.line(summaryX - 5, summaryStartY - 5, 195, summaryStartY - 5);

  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', summaryX, summaryStartY);
  doc.text(`₹${amount.toFixed(2)}`, 190, summaryStartY, { align: 'right' });

  doc.text(`GST (${(gstRate * 100).toFixed(0)}%):`, summaryX, summaryStartY + 7);
  doc.text(`₹${tax.toFixed(2)}`, 190, summaryStartY + 7, { align: 'right' });

  doc.setLineWidth(0.5);
  doc.line(summaryX - 5, summaryStartY + 10, 195, summaryStartY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total Amount:', summaryX, summaryStartY + 17);
  doc.text(`₹${total.toFixed(2)}`, 190, summaryStartY + 17, { align: 'right' });

  // Payment Info Box
  const paymentBoxY = summaryStartY + 25;
  doc.setFillColor(248, 250, 252);
  doc.rect(15, paymentBoxY, 180, 20, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text('✓ Payment Received', 20, paymentBoxY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Credits added successfully to ${data.storeName}`, 20, paymentBoxY + 13);
  doc.text(`Transaction processed on ${new Date(data.date).toLocaleString('en-IN')}`, 20, paymentBoxY + 18);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business!', 105, 270, { align: 'center' });
  doc.text(`${platformName} - All Rights Reserved`, 105, 275, { align: 'center' });

  // Terms & Conditions
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const termsY = 283;
  doc.text('Terms & Conditions:', 15, termsY);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Credits are non-refundable and non-transferable.', 15, termsY + 4);
  doc.text('2. Credits are valid for 12 months from the date of purchase.', 15, termsY + 8);
  doc.text('3. Each try-on session will consume credits as per the pricing policy.', 15, termsY + 12);

  return doc;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `INV-${year}${month}${day}-${random}`;
}

export function calculateInvoiceAmount(
  credits: number,
  pricePerCredit: number = 10,
  gstRate: number = 0.18
) {
  const subtotal = credits * pricePerCredit;
  const tax = subtotal * gstRate;
  const total = subtotal + tax;

  return {
    credits,
    pricePerCredit,
    subtotal,
    tax,
    taxRate: gstRate,
    total
  };
}
