/**
 * Validate send text message request
 */
export function validateSendText(req, res, next) {
  const { to, message } = req.body;
  
  // Validate 'to' field
  if (!to) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Field to is required',
      field: 'to'
    });
  }
  
  if (typeof to !== 'string' || to.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Field to must be a non-empty string',
      field: 'to'
    });
  }
  
  // Validate phone number format (min 10 digits)
  const cleaned = to.replace(/\D/g, '');
  if (cleaned.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Phone number must be at least 10 digits',
      field: 'to'
    });
  }
  
  // Validate 'message' field
  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Field message is required',
      field: 'message'
    });
  }
  
  if (typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Field message must be a non-empty string',
      field: 'message'
    });
  }
  
  if (message.length > 65536) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Message exceeds maximum length of 65536 characters',
      field: 'message'
    });
  }
  
  next();
}
