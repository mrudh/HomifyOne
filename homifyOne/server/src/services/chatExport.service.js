const PDFDocument = require('pdfkit');

function formatDateTime(date) {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function streamConversationPdf(res, { participantsById, messages, requester }) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  const names = Object.values(participantsById).map(p => p.name);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a4a45')
    .text('HomifyOne: Chat Export', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#666')
    .text(`Conversation between ${names.join(' and ')}`, { align: 'center' });
  doc.text(`Exported on ${formatDateTime(new Date())} by ${requester.name}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.strokeColor('#ddd').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  if (messages.length === 0) {
    doc.fontSize(11).font('Helvetica').fillColor('#999').text('No messages in this conversation yet.');
  }

  messages.forEach((m) => {
    const sender = participantsById[String(m.sender)];
    const senderName = sender?.name || 'Unknown';

    if (doc.y > 720) doc.addPage();

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a4a45')
      .text(senderName, 50, doc.y, { continued: true })
      .font('Helvetica').fillColor('#999')
      .text(`   ${formatDateTime(m.createdAt)}`);

    if (m.content) {
      doc.fontSize(10.5).font('Helvetica').fillColor('#111').text(m.content, { width: 495 });
    }

    if (m.attachment?.fileName) {
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#555')
        .text(`Attachment: ${m.attachment.fileName}`);
    }

    doc.moveDown(0.9);
  });

  doc.end();
}

module.exports = { streamConversationPdf };
