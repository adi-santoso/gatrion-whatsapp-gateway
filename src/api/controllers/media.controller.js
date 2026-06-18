import { addMessageJob, JOB_TYPES } from '../../queue/messageQueue.js';

export async function sendVideo(req, res) {
  try {
    const { sessionId, to, caption, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded'
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_VIDEO, sessionId, {
      to,
      caption,
      videoBuffer: req.file.buffer,
      mimetype: req.file.mimetype
    }, { priority, delay });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendAudio(req, res) {
  try {
    const { sessionId, to, ptt, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file uploaded'
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_AUDIO, sessionId, {
      to,
      ptt: ptt === 'true',
      audioBuffer: req.file.buffer,
      mimetype: req.file.mimetype
    }, { priority, delay });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendDocument(req, res) {
  try {
    const { sessionId, to, filename, caption, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No document file uploaded'
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_DOCUMENT, sessionId, {
      to,
      filename: filename || req.file.originalname,
      caption,
      documentBuffer: req.file.buffer,
      mimetype: req.file.mimetype
    }, { priority, delay });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendLocation(req, res) {
  try {
    const { sessionId, to, latitude, longitude, name, address, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_LOCATION, sessionId, {
      to,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name,
      address
    }, { priority, delay });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendContact(req, res) {
  try {
    const { sessionId, to, contact, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_CONTACT, sessionId, {
      to,
      contact
    }, { priority, delay });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendSticker(req, res) {
  try {
    const { sessionId, to, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No sticker file uploaded'
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_STICKER, sessionId, {
      to,
      stickerBuffer: req.file.buffer,
      mimetype: req.file.mimetype
    }, { priority, delay });
    
    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
