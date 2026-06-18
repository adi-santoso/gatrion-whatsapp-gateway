# Phase 10: Rich Media Support - Blueprint

> **Objective:** Extend media capabilities to support video, audio, document, location, contact, and sticker

---

## Table of Contents

1. [Context & Current State](#1-context--current-state)
2. [Technical Specification](#2-technical-specification)
3. [Implementation Steps](#3-implementation-steps)
4. [Code Standards & Patterns](#4-code-standards--patterns)
5. [Integration Points](#5-integration-points)
6. [Acceptance Criteria](#6-acceptance-criteria)
7. [Testing Requirements](#7-testing-requirements)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. Context & Current State

### Current Media Support (Phase 1-9)

**Supported:**
- ✅ Text messages (`/api/send-text`)
- ✅ Images (`/api/send-image`)

**Not Supported:**
- ❌ Video (MP4, MKV, AVI)
- ❌ Audio/Voice notes (MP3, OGG, WAV)
- ❌ Documents (PDF, DOCX, XLSX, etc)
- ❌ Location sharing
- ❌ Contact cards (vCard)
- ❌ Stickers

### Current Upload Middleware

**Location:** `src/middleware/upload.middleware.js`

```javascript
// Only configured for images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  },
});
```

### What Will Change

- Add 5 new media endpoints
- Update upload middleware for multiple file types
- Add MIME type validation per endpoint
- Add file size limits per media type
- Integrate with queue system (Phase 9)

---

## 2. Technical Specification

### 2.1 New API Endpoints

| Endpoint | Method | Purpose | Max Size |
|----------|--------|---------|----------|
| `/api/send-video` | POST | Send video with caption | 50 MB |
| `/api/send-audio` | POST | Send audio/voice note | 16 MB |
| `/api/send-document` | POST | Send document with caption | 100 MB |
| `/api/send-location` | POST | Send location coordinates | N/A |
| `/api/send-contact` | POST | Send contact card (vCard) | N/A |
| `/api/send-sticker` | POST | Send sticker (WebP) | 1 MB |

### 2.2 MIME Type Support

**Video:**
- `video/mp4`
- `video/x-matroska` (MKV)
- `video/avi`
- `video/quicktime` (MOV)

**Audio:**
- `audio/mpeg` (MP3)
- `audio/ogg` (OGG)
- `audio/wav`
- `audio/mp4` (M4A)

**Document:**
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (PPTX)
- `application/zip`
- `text/plain`

**Sticker:**
- `image/webp` (required)
- Auto-convert PNG/JPEG to WebP

### 2.3 File Structure

```
src/
├── api/
│   └── controllers/
│       ├── send.controller.js    # [KEEP] Existing text/image
│       └── media.controller.js   # [NEW] All rich media endpoints
├── middleware/
│   └── upload.middleware.js      # [MODIFY] Support multiple types
├── utils/
│   ├── mediaValidator.js         # [NEW] MIME validation
│   └── imageProcessor.js         # [NEW] Sticker conversion
└── queue/
    └── workers.js                # [MODIFY] Add media job processors
```

### 2.4 Request/Response Schemas

**Send Video:**
```javascript
// Request (multipart/form-data)
{
  video: File,           // Required: video file
  to: "628123456789",    // Required
  caption: "Video caption" // Optional
}

// Response
{
  success: true,
  data: {
    jobId: "job-uuid",
    to: "628123456789@s.whatsapp.net",
    type: "video",
    size: 5242880,
    mimeType: "video/mp4",
    status: "queued"
  }
}
```

**Send Audio:**
```javascript
// Request
{
  audio: File,           // Required
  to: "628123456789",    // Required
  ptt: true              // Optional: true for voice note, false for audio file
}
```

**Send Document:**
```javascript
// Request
{
  document: File,        // Required
  to: "628123456789",    // Required
  filename: "report.pdf", // Optional: override filename
  caption: "Report"      // Optional
}
```

**Send Location:**
```javascript
// Request (application/json)
{
  to: "628123456789",
  latitude: -6.2088,     // Required
  longitude: 106.8456,   // Required
  name: "Office",        // Optional
  address: "Jakarta"     // Optional
}
```

**Send Contact:**
```javascript
// Request (application/json)
{
  to: "628123456789",
  contact: {
    name: "John Doe",    // Required
    phone: "628111222333", // Required
    organization: "Company", // Optional
    email: "john@example.com" // Optional
  }
}
```

**Send Sticker:**
```javascript
// Request (multipart/form-data)
{
  sticker: File,         // Required: WebP or PNG/JPEG (auto-convert)
  to: "628123456789"     // Required
}
```

### 2.5 New Dependencies

```json
{
  "file-type": "^18.0.0",
  "mime-types": "^2.1.35",
  "sharp": "^0.32.0"
}
```

- `file-type`: Detect MIME type from buffer
- `mime-types`: MIME type utilities
- `sharp`: Image processing for sticker conversion

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 File Validation Pattern

```javascript
async function validateMediaFile(file, allowedTypes, maxSize) {
  // Check file exists
  if (!file) {
    throw new Error('File is required');
  }
  
  // Check size
  if (file.size > maxSize) {
    throw new Error(`File too large (max ${maxSize / 1024 / 1024}MB)`);
  }
  
  // Verify MIME type from buffer (not just extension)
  const fileType = await FileType.fromBuffer(file.buffer);
  
  if (!fileType || !allowedTypes.includes(fileType.mime)) {
    throw new Error(`Invalid file type (allowed: ${allowedTypes.join(', ')})`);
  }
  
  return fileType;
}
```

### 4.2 Baileys Send Pattern

```javascript
// Video
await sock.sendMessage(jid, {
  video: buffer,
  caption: caption,
  mimetype: 'video/mp4',
});

// Audio (voice note)
await sock.sendMessage(jid, {
  audio: buffer,
  mimetype: 'audio/ogg; codecs=opus',
  ptt: true, // Push-to-talk (voice note)
});

// Document
await sock.sendMessage(jid, {
  document: buffer,
  mimetype: 'application/pdf',
  fileName: 'document.pdf',
  caption: caption,
});

// Location
await sock.sendMessage(jid, {
  location: {
    degreesLatitude: lat,
    degreesLongitude: lng,
    name: name,
    address: address,
  },
});

// Contact
await sock.sendMessage(jid, {
  contacts: {
    displayName: name,
    contacts: [{ vcard: vCardString }],
  },
});

// Sticker
await sock.sendMessage(jid, {
  sticker: webpBuffer,
});
```

### 4.3 vCard Generation

```javascript
function generateVCard(contact) {
  return `BEGIN:VCARD
VERSION:3.0
FN:${contact.name}
TEL;type=CELL;type=VOICE:${contact.phone}
${contact.organization ? `ORG:${contact.organization}` : ''}
${contact.email ? `EMAIL:${contact.email}` : ''}
END:VCARD`;
}
```

---

## 5. Integration Points

### 5.1 Queue Integration

All media sends go through queue (Phase 9):

```javascript
const job = await addJob(JOB_TYPES.SEND_VIDEO, {
  to,
  buffer: file.buffer,
  caption,
  mimeType: file.mimetype,
  size: file.size,
});
```

### 5.2 Webhook Integration

Update webhook handler (Phase 8) to support rich media in incoming messages.

### 5.3 Backward Compatibility

- Existing `/api/send-text` and `/api/send-image` unchanged
- New endpoints additive only
- No breaking changes

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] Send video endpoint works
- [ ] Send audio endpoint works (regular + voice note)
- [ ] Send document endpoint works
- [ ] Send location endpoint works
- [ ] Send contact endpoint works
- [ ] Send sticker endpoint works
- [ ] File validation prevents invalid types
- [ ] Size limits enforced per type
- [ ] Jobs queued successfully (Phase 9)
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Auto-convert PNG/JPEG to WebP for stickers
- [ ] Generate video thumbnail
- [ ] Compress large files

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

No env flags needed - endpoints are additive. To rollback:

```bash
git revert <commit-hash>
git push
pm2 restart whatsapp-gateway
```

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)
