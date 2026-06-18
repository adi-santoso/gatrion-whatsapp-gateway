# Phase 10: Implementation Steps

> **Step-by-step implementation for Rich Media support**

---

## Pre-Implementation Checklist

- [ ] Phase 9 completed (queue system ready)
- [ ] Service running
- [ ] Test media files ready (video, audio, document, image for sticker)

---

## Step 1: Install Dependencies

```bash
npm install file-type mime-types sharp
```

**Verify:**
```bash
npm list file-type mime-types sharp
```

---

## Step 2: Create Media Validator

### 2.1 Create `src/utils/mediaValidator.js`

```javascript
const FileType = require('file-type');

const ALLOWED_TYPES = {
  video: ['video/mp4', 'video/x-matroska', 'video/avi', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4'],
  document: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'text/plain',
  ],
  sticker: ['image/webp', 'image/png', 'image/jpeg'],
};

const MAX_SIZES = {
  video: 50 * 1024 * 1024,      // 50 MB
  audio: 16 * 1024 * 1024,      // 16 MB
  document: 100 * 1024 * 1024,  // 100 MB
  sticker: 1 * 1024 * 1024,     // 1 MB
};

async function validateMedia(file, mediaType) {
  if (!file || !file.buffer) {
    throw new Error('File is required');
  }
  
  // Check size
  if (file.size > MAX_SIZES[mediaType]) {
    throw new Error(`File too large (max ${MAX_SIZES[mediaType] / 1024 / 1024}MB)`);
  }
  
  // Verify MIME type from buffer
  const fileType = await FileType.fromBuffer(file.buffer);
  
  if (!fileType) {
    throw new Error('Could not determine file type');
  }
  
  if (!ALLOWED_TYPES[mediaType].includes(fileType.mime)) {
    throw new Error(`Invalid ${mediaType} type (allowed: ${ALLOWED_TYPES[mediaType].join(', ')})`);
  }
  
  return fileType;
}

module.exports = {
  validateMedia,
  ALLOWED_TYPES,
  MAX_SIZES,
};
```

---

## Step 3: Create Image Processor (Sticker Conversion)

### 3.1 Create `src/utils/imageProcessor.js`

```javascript
const sharp = require('sharp');

async function convertToWebP(buffer) {
  return await sharp(buffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp()
    .toBuffer();
}

module.exports = {
  convertToWebP,
};
```

---

## Step 4: Update Upload Middleware

### 4.1 Modify `src/middleware/upload.middleware.js`

**Replace entire file with:**

```javascript
const multer = require('multer');

// Storage: memory
const storage = multer.memoryStorage();

// Generic upload middleware (no file type restriction)
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
  },
});

// Specific middleware for each media type
const uploadImage = upload.single('image');
const uploadVideo = upload.single('video');
const uploadAudio = upload.single('audio');
const uploadDocument = upload.single('document');
const uploadSticker = upload.single('sticker');

module.exports = {
  upload,
  uploadImage,
  uploadVideo,
  uploadAudio,
  uploadDocument,
  uploadSticker,
};
```

---

## Step 5: Create Media Controller

### 5.1 Create `src/api/controllers/media.controller.js`

```javascript
const { addJob } = require('../../queue/messageQueue');
const { JOB_TYPES } = require('../../queue/types');
const { validateMedia } = require('../../utils/mediaValidator');
const { convertToWebP } = require('../../utils/imageProcessor');
const config = require('../../config/env');

// Send Video
async function sendVideo(req, res) {
  try {
    const { to, caption } = req.body;
    const file = req.file;
    
    if (!to || !file) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to" and "video" are required',
      });
    }
    
    // Validate video file
    const fileType = await validateMedia(file, 'video');
    
    // Add to queue
    const job = await addJob(JOB_TYPES.SEND_VIDEO, {
      to,
      buffer: file.buffer,
      caption: caption || '',
      mimeType: fileType.mime,
      size: file.size,
    });
    
    return res.json({
      success: true,
      data: {
        jobId: job.id,
        to,
        type: 'video',
        size: file.size,
        mimeType: fileType.mime,
        status: 'queued',
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message,
    });
  }
}

// Send Audio
async function sendAudio(req, res) {
  try {
    const { to, ptt } = req.body;
    const file = req.file;
    
    if (!to || !file) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to" and "audio" are required',
      });
    }
    
    const fileType = await validateMedia(file, 'audio');
    
    const job = await addJob(JOB_TYPES.SEND_AUDIO, {
      to,
      buffer: file.buffer,
      mimeType: fileType.mime,
      ptt: ptt === 'true', // Voice note
      size: file.size,
    });
    
    return res.json({
      success: true,
      data: {
        jobId: job.id,
        to,
        type: 'audio',
        ptt: ptt === 'true',
        size: file.size,
        status: 'queued',
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message,
    });
  }
}

// Send Document
async function sendDocument(req, res) {
  try {
    const { to, filename, caption } = req.body;
    const file = req.file;
    
    if (!to || !file) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to" and "document" are required',
      });
    }
    
    const fileType = await validateMedia(file, 'document');
    
    const job = await addJob(JOB_TYPES.SEND_DOCUMENT, {
      to,
      buffer: file.buffer,
      filename: filename || file.originalname,
      caption: caption || '',
      mimeType: fileType.mime,
      size: file.size,
    });
    
    return res.json({
      success: true,
      data: {
        jobId: job.id,
        to,
        type: 'document',
        filename: filename || file.originalname,
        size: file.size,
        status: 'queued',
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message,
    });
  }
}

// Send Location
async function sendLocation(req, res) {
  try {
    const { to, latitude, longitude, name, address } = req.body;
    
    if (!to || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to", "latitude", and "longitude" are required',
      });
    }
    
    const job = await addJob(JOB_TYPES.SEND_LOCATION, {
      to,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: name || '',
      address: address || '',
    });
    
    return res.json({
      success: true,
      data: {
        jobId: job.id,
        to,
        type: 'location',
        latitude,
        longitude,
        status: 'queued',
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message,
    });
  }
}

// Send Contact
async function sendContact(req, res) {
  try {
    const { to, contact } = req.body;
    
    if (!to || !contact || !contact.name || !contact.phone) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to", "contact.name", and "contact.phone" are required',
      });
    }
    
    const job = await addJob(JOB_TYPES.SEND_CONTACT, {
      to,
      contact,
    });
    
    return res.json({
      success: true,
      data: {
        jobId: job.id,
        to,
        type: 'contact',
        contactName: contact.name,
        status: 'queued',
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message,
    });
  }
}

// Send Sticker
async function sendSticker(req, res) {
  try {
    const { to } = req.body;
    const file = req.file;
    
    if (!to || !file) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Fields "to" and "sticker" are required',
      });
    }
    
    const fileType = await validateMedia(file, 'sticker');
    
    // Auto-convert to WebP if needed
    let buffer = file.buffer;
    if (fileType.mime !== 'image/webp') {
      buffer = await convertToWebP(buffer);
    }
    
    const job = await addJob(JOB_TYPES.SEND_STICKER, {
      to,
      buffer,
      size: buffer.length,
    });
    
    return res.json({
      success: true,
      data: {
        jobId: job.id,
        to,
        type: 'sticker',
        size: buffer.length,
        status: 'queued',
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: error.message,
    });
  }
}

module.exports = {
  sendVideo,
  sendAudio,
  sendDocument,
  sendLocation,
  sendContact,
  sendSticker,
};
```

---

## Step 6: Update Queue Job Types

### 6.1 Modify `src/queue/types.js`

**Add new job types:**

```javascript
const JOB_TYPES = {
  SEND_TEXT: 'send-text',
  SEND_IMAGE: 'send-image',
  SEND_VIDEO: 'send-video',           // NEW
  SEND_AUDIO: 'send-audio',           // NEW
  SEND_DOCUMENT: 'send-document',     // NEW
  SEND_LOCATION: 'send-location',     // NEW
  SEND_CONTACT: 'send-contact',       // NEW
  SEND_STICKER: 'send-sticker',       // NEW
};
```

---

## Step 7: Update Queue Workers

### 7.1 Modify `src/queue/workers.js`

**Add media processors in `processJob` function:**

```javascript
async function processJob(job) {
  const { name, data } = job;
  const sock = getWhatsAppClient();
  
  if (!sock) {
    throw new Error('WhatsApp client not available');
  }
  
  switch (name) {
    case JOB_TYPES.SEND_TEXT:
      return await sendText(sock, data);
    
    case JOB_TYPES.SEND_IMAGE:
      return await sendImage(sock, data);
    
    case JOB_TYPES.SEND_VIDEO:
      return await sendVideo(sock, data);
    
    case JOB_TYPES.SEND_AUDIO:
      return await sendAudio(sock, data);
    
    case JOB_TYPES.SEND_DOCUMENT:
      return await sendDocument(sock, data);
    
    case JOB_TYPES.SEND_LOCATION:
      return await sendLocation(sock, data);
    
    case JOB_TYPES.SEND_CONTACT:
      return await sendContact(sock, data);
    
    case JOB_TYPES.SEND_STICKER:
      return await sendSticker(sock, data);
    
    default:
      throw new Error(`Unknown job type: ${name}`);
  }
}

// Add after sendImage function:

async function sendVideo(sock, data) {
  const { to, buffer, caption, mimeType } = data;
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  const result = await sock.sendMessage(jid, {
    video: buffer,
    caption: caption || '',
    mimetype: mimeType,
  });
  
  return { messageId: result.key.id, to: jid, type: 'video', status: 'sent' };
}

async function sendAudio(sock, data) {
  const { to, buffer, mimeType, ptt } = data;
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  const result = await sock.sendMessage(jid, {
    audio: buffer,
    mimetype: ptt ? 'audio/ogg; codecs=opus' : mimeType,
    ptt,
  });
  
  return { messageId: result.key.id, to: jid, type: 'audio', status: 'sent' };
}

async function sendDocument(sock, data) {
  const { to, buffer, filename, caption, mimeType } = data;
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  const result = await sock.sendMessage(jid, {
    document: buffer,
    mimetype: mimeType,
    fileName: filename,
    caption: caption || '',
  });
  
  return { messageId: result.key.id, to: jid, type: 'document', status: 'sent' };
}

async function sendLocation(sock, data) {
  const { to, latitude, longitude, name, address } = data;
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  const result = await sock.sendMessage(jid, {
    location: {
      degreesLatitude: latitude,
      degreesLongitude: longitude,
      name,
      address,
    },
  });
  
  return { messageId: result.key.id, to: jid, type: 'location', status: 'sent' };
}

async function sendContact(sock, data) {
  const { to, contact } = data;
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  // Generate vCard
  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.name}
TEL;type=CELL;type=VOICE:${contact.phone}
${contact.organization ? `ORG:${contact.organization}` : ''}
${contact.email ? `EMAIL:${contact.email}` : ''}
END:VCARD`;
  
  const result = await sock.sendMessage(jid, {
    contacts: {
      displayName: contact.name,
      contacts: [{ vcard }],
    },
  });
  
  return { messageId: result.key.id, to: jid, type: 'contact', status: 'sent' };
}

async function sendSticker(sock, data) {
  const { to, buffer } = data;
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  const result = await sock.sendMessage(jid, {
    sticker: buffer,
  });
  
  return { messageId: result.key.id, to: jid, type: 'sticker', status: 'sent' };
}
```

---

## Step 8: Add Routes

### 8.1 Modify `src/api/routes.js`

```javascript
const mediaController = require('./controllers/media.controller');
const { uploadVideo, uploadAudio, uploadDocument, uploadSticker } = require('../middleware/upload.middleware');

// Media routes (Phase 10)
router.post('/send-video', authMiddleware, rateLimitMiddleware, uploadVideo, mediaController.sendVideo);
router.post('/send-audio', authMiddleware, rateLimitMiddleware, uploadAudio, mediaController.sendAudio);
router.post('/send-document', authMiddleware, rateLimitMiddleware, uploadDocument, mediaController.sendDocument);
router.post('/send-location', authMiddleware, rateLimitMiddleware, mediaController.sendLocation);
router.post('/send-contact', authMiddleware, rateLimitMiddleware, mediaController.sendContact);
router.post('/send-sticker', authMiddleware, rateLimitMiddleware, uploadSticker, mediaController.sendSticker);
```

---

## Step 9: Update README

Add rich media documentation to README.md (see TESTING_GUIDE.md for examples)

---

## Step 10: Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## Step 11: Commit

```bash
git add .
git commit -m "feat(phase-10): implement rich media support

- Add video, audio, document, location, contact, sticker
- Add media validation with file-type
- Add sticker auto-conversion (PNG/JPEG to WebP)
- Add size limits per media type
- Add 6 new API endpoints
- Update queue workers for media processing
- Update upload middleware

Supported:
- Video: MP4, MKV, AVI, MOV (max 50MB)
- Audio: MP3, OGG, WAV, M4A (max 16MB)
- Document: PDF, DOCX, XLSX, PPTX, ZIP, TXT (max 100MB)
- Location: Coordinates with optional name/address
- Contact: vCard with name, phone, org, email
- Sticker: WebP or auto-convert from PNG/JPEG (max 1MB)

Closes: Phase 10 - Rich Media Support"

git push origin main
```

---

**Next:** [TESTING_GUIDE.md](./TESTING_GUIDE.md)
