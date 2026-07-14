const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: process.env.AWS_REGION });

function generateSelectionSummaryPdf(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const key = `summaries/selection-summary-${order._id}.pdf`;

        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: 'application/pdf',
        }));

        const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        resolve(url);
      } catch (err) { reject(err); }
    });

    doc.fontSize(20).font('Helvetica-Bold').text('Selection Summary', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text(`Plot ${order.plot.plotNumber} · ${order.plot.development}`, { align: 'center' });
    doc.text(`Approved on ${new Date().toLocaleDateString('en-GB')}`, { align: 'center' });
    doc.moveDown(2);

    doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text('Buyer');
    doc.font('Helvetica').text(order.buyer.name);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Developer');
    doc.font('Helvetica').text(order.developer.name);
    doc.moveDown(2);

    doc.font('Helvetica-Bold').text('Selected Items', { underline: true });
    doc.moveDown(0.5);
    order.items.forEach((item) => {
      doc.font('Helvetica').fontSize(10)
        .text(`${item.name} (${item.category})`, { continued: true })
        .text(` £${item.price.toLocaleString()}`, { align: 'right' });
    });
    doc.moveDown(2);

    doc.font('Helvetica-Bold').text('Pricing Breakdown', { underline: true });
    doc.moveDown(0.5);
    const rows = [
      ['Extras Allowance', order.pricing.allowance],
      ['Subtotal', order.pricing.subtotal],
      ['Discount Applied', -order.pricing.discountAmount],
      ['Final Total', order.pricing.finalTotal],
    ];
    rows.forEach(([label, val]) => {
      doc.font('Helvetica').fontSize(10)
        .text(label, { continued: true })
        .text(`£${Math.abs(val).toLocaleString()}`, { align: 'right' });
    });

    doc.end();
  });
}


async function getSignedSummaryUrl(orderId) {
  const key = `summaries/selection-summary-${orderId}.pdf`;
  const command = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 300 });
}
module.exports = { generateSelectionSummaryPdf, getSignedSummaryUrl };