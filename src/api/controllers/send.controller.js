import { isConnected, sendTextMessage } from '../../whatsapp/client.js';
import { formatPhoneNumber } from '../../whatsapp/utils.js';

/**
 * Send text message handler
 */
export async function sendText(req, res, next) {
  try {
    const { to, message } = req.body;
    
    // Check WhatsApp connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'ServiceUnavailable',
        message: 'WhatsApp not connected. Please scan QR code first.'
      });
    }
    
    // Format phone number
    const formattedTo = formatPhoneNumber(to);
    
    // Send message
    const result = await sendTextMessage(formattedTo, message);
    
    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        messageId: result.id,
        to: formattedTo,
        status: result.status,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    next(error);
  }
}
