import { isConnected, sendTextMessage, sendImageMessage } from '../../whatsapp/client.js';
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

/**
 * Send image message handler
 */
export async function sendImage(req, res, next) {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'No image file uploaded'
      });
    }
    
    // Validate 'to' field
    if (!req.body.to) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'Missing required field: to'
      });
    }
    
    // Check WhatsApp connection
    if (!isConnected()) {
      return res.status(503).json({
        success: false,
        error: 'ServiceUnavailable',
        message: 'WhatsApp not connected. Please scan QR code first.'
      });
    }
    
    // Format phone number
    const formattedTo = formatPhoneNumber(req.body.to);
    
    // Send image
    const result = await sendImageMessage(formattedTo, req.file.buffer, {
      caption: req.body.caption,
      mimetype: req.file.mimetype
    });
    
    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        messageId: result.id,
        to: formattedTo,
        type: 'image',
        caption: req.body.caption || undefined,
        size: req.file.size,
        mimeType: req.file.mimetype,
        status: result.status,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    next(error);
  }
}
