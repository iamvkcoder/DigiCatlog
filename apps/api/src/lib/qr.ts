import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

export interface QrOptions {
  url: string;
  margin?: number;
  width?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateQrPng(url: string, width = 600): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    width,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

export async function generateQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

export async function generatePrintablePdf(options: {
  shopName: string;
  menuUrl: string;
  brandColor?: string | null;
  format?: 'a4' | 'table-tent';
}): Promise<Buffer> {
  const { shopName, menuUrl, brandColor = '#EA580C', format = 'a4' } = options;
  const isTableTent = format === 'table-tent';

  // Dimensions in points (72 points = 1 inch)
  // A4: 595.28 x 841.89 points
  // Table Tent (approx 4x6 inches folded or 4x6 display card): 288 x 432 points
  const doc = new PDFDocument({
    size: isTableTent ? [288, 432] : 'A4',
    margin: isTableTent ? 20 : 40,
    info: {
      Title: `${shopName} - Digital Menu QR`,
      Author: 'DIGICATLOG',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Generate QR buffer
  const qrBuffer = await generateQrPng(menuUrl, isTableTent ? 400 : 600);

  const pageWidth = isTableTent ? 288 : 595.28;
  const pageHeight = isTableTent ? 432 : 841.89;

  // Background subtle cream wash
  doc.rect(0, 0, pageWidth, pageHeight).fill('#FDFCF7');

  // Decorative header band
  doc.rect(0, 0, pageWidth, isTableTent ? 12 : 20).fill(brandColor || '#EA580C');

  // Shop Name
  doc
    .fillColor('#2D241E')
    .font('Helvetica-Bold')
    .fontSize(isTableTent ? 18 : 28)
    .text(shopName, 0, isTableTent ? 40 : 80, {
      align: 'center',
      width: pageWidth,
    });

  // Subtitle
  doc
    .fillColor('#7D7065')
    .font('Helvetica')
    .fontSize(isTableTent ? 11 : 16)
    .text('DIGITAL MENU', 0, isTableTent ? 68 : 120, {
      align: 'center',
      width: pageWidth,
      characterSpacing: 2,
    });

  // QR Code Box with soft border
  const qrSize = isTableTent ? 180 : 320;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = isTableTent ? 100 : 170;

  doc
    .roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12)
    .fillAndStroke('#FFFFFF', '#E8E5DF');

  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

  // Instructions
  const instructY = qrY + qrSize + (isTableTent ? 25 : 45);
  doc
    .fillColor('#2D241E')
    .font('Helvetica-Bold')
    .fontSize(isTableTent ? 12 : 18)
    .text('Point camera to view menu', 0, instructY, {
      align: 'center',
      width: pageWidth,
    });

  doc
    .fillColor('#7D7065')
    .font('Helvetica')
    .fontSize(isTableTent ? 9 : 12)
    .text('No app download required • Free & Instant', 0, instructY + (isTableTent ? 18 : 26), {
      align: 'center',
      width: pageWidth,
    });

  // Direct URL display
  doc
    .fillColor('#A6895C')
    .font('Helvetica')
    .fontSize(isTableTent ? 8 : 11)
    .text(menuUrl, 0, instructY + (isTableTent ? 36 : 52), {
      align: 'center',
      width: pageWidth,
    });

  // Footer
  doc
    .fillColor('#94A3B8')
    .font('Helvetica')
    .fontSize(isTableTent ? 7 : 9)
    .text('POWERED BY DIGICATLOG', 0, pageHeight - (isTableTent ? 20 : 35), {
      align: 'center',
      width: pageWidth,
      characterSpacing: 1,
    });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
