export async function getQR(req, res, next) {
  try {
    const { isConnected, getQRCode, getClientConnectionState } = await import('../../whatsapp/client.js');
    
    if (isConnected()) {
      const state = getClientConnectionState();
      return res.json({
        success: true,
        data: {
          qr: null,
          status: 'connected',
          phone: state.phone,
          message: 'WhatsApp sudah terhubung'
        }
      });
    }

    const qrCode = getQRCode();
    res.json({
      success: true,
      data: {
        qr: qrCode,
        status: 'qr_required',
        message: 'Scan QR code dengan WhatsApp'
      }
    });
  } catch (error) {
    next(error);
  }
}
