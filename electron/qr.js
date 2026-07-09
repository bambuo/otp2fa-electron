const QRCode = require('qrcode');

async function createQrDataUrl(text) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 4,
    width: 320,
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  });
}

module.exports = { createQrDataUrl };
