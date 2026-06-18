# PHASE 4: Send Images

**Objective:** Implement POST endpoint untuk mengirim images dengan caption, tanpa menyimpan di disk (stream-based)

**Estimated Time:** 30 minutes  
**Dependencies:** PHASE_3_SEND_TEXT.md (completed)  
**Next Phase:** PHASE_5_SECURITY.md

---

## 📋 Tasks Checklist

- [ ] Create POST /send-image endpoint
- [ ] Setup Multer dengan memory storage
- [ ] Image validation (type, size)
- [ ] Stream-based upload to WhatsApp
- [ ] Caption support dengan formatting
- [ ] Update send controller
- [ ] Request validation untuk image
- [ ] Error handling untuk upload failures

---

## 🎯 Deliverables

### 1. src/middleware/upload.middleware.js

**Requirements:**
- Multer configuration dengan **memory storage** (no disk)
- Single file upload
- Field name: `image`
- File size limit: 10 MB
- Allowed types: image/jpeg, image/png, image/gif, image/webp

**Configuration:**
```javascript
import multer from 'multer'

const storage = multer.memoryStorage() // PENTING: memory only!

const fileFilter = (req, file, cb) => {
    // Accept images only
}

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: fileFilter
})
```

**Export:**
```javascript
export const uploadImage = upload.single('image')
```

### 2. Update src/api/controllers/send.controller.js

**New Endpoint:** `POST /send-image`

**Request (multipart/form-data):**
```
image: [file binary]
to: "628123456789"
caption: "Check this out! *Amazing*" (optional)
```

**Response Success (200):**
```json
{
    "success": true,
    "data": {
        "messageId": "3EB0123456789ABCDEF",
        "to": "628123456789@s.whatsapp.net",
        "type": "image",
        "caption": "Check this out! *Amazing*",
        "size": 1048576,
        "mimeType": "image/jpeg",
        "status": "sent",
        "timestamp": "2026-06-17T10:30:00.000Z"
    }
}
```

**Response Error - No File (400):**
```json
{
    "success": false,
    "error": "ValidationError",
    "message": "No image file uploaded"
}
```

**Response Error - Invalid Type (400):**
```json
{
    "success": false,
    "error": "ValidationError",
    "message": "Invalid file type. Only images allowed (jpeg, png, gif, webp)"
}
```

**Response Error - File Too Large (400):**
```json
{
    "success": false,
    "error": "ValidationError",
    "message": "File too large. Maximum size: 10 MB"
}
```

**Response Error - WhatsApp Not Connected (503):**
```json
{
    "success": false,
    "error": "ServiceUnavailable",
    "message": "WhatsApp not connected"
}
```

### 3. Update src/whatsapp/client.js

**Add new method:**
```javascript
async sendImageMessage(to, imageBuffer, options = {})
```

**Parameters:**
- `to`: Phone number atau JID
- `imageBuffer`: Buffer dari multer (req.file.buffer)
- `options`: { caption, mimetype }

**Implementation:**
```javascript
await sock.sendMessage(jid, {
    image: imageBuffer,
    caption: options.caption || '',
    mimetype: options.mimetype
})
```

**Key Point:** 
- `imageBuffer` langsung dari memory (req.file.buffer)
- **NO file write to disk**
- Baileys handle upload ke WhatsApp servers

### 4. Update src/api/routes.js

**Add route:**
```javascript
import { uploadImage } from '../middleware/upload.middleware.js'

router.post('/send-image', uploadImage, sendImageController)
```

**Middleware order:**
```
1. uploadImage (multer) → Parse multipart, validate file
2. sendImageController → Process & send to WhatsApp
```

### 5. Validation Logic

**In send.controller.js:**
```javascript
export const sendImage = async (req, res, next) => {
    try {
        // 1. Check if file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: 'No image file uploaded'
            })
        }

        // 2. Check 'to' field
        const { to, caption } = req.body
        if (!to) {
            return res.status(400).json({
                success: false,
                error: 'ValidationError',
                message: "Field 'to' is required"
            })
        }

        // 3. Check WhatsApp connection
        // 4. Format phone number
        // 5. Send image
        // 6. Return response
    } catch (error) {
        next(error)
    }
}
```

---

## 🔄 Flow Diagram

```
POST /send-image (multipart/form-data)
  ↓
Multer middleware
  ├─ Parse file → req.file.buffer
  ├─ Validate type
  └─ Validate size
  ↓
Controller validation
  ├─ Check file exists
  ├─ Check 'to' field
  └─ Check connection
  ↓
Format phone number
  ↓
Add to queue
  ↓
Send via Baileys
  ├─ Stream buffer → WhatsApp
  └─ No disk write
  ↓
Return message ID
  ↓
Buffer auto garbage collected (memory freed)
```

---

## 🖼️ Supported Image Formats

| Format | MIME Type      | Extension | Max Size |
|--------|----------------|-----------|----------|
| JPEG   | image/jpeg     | .jpg .jpeg| 10 MB    |
| PNG    | image/png      | .png      | 10 MB    |
| GIF    | image/gif      | .gif      | 10 MB    |
| WebP   | image/webp     | .webp     | 10 MB    |

**Note:** WhatsApp limits apply (~16MB actual, kita set 10MB untuk safety)

---

## ✅ Acceptance Criteria

### Functional:
1. ✓ Image terkirim dengan benar
2. ✓ Caption support dengan formatting (*bold*, _italic_, dll)
3. ✓ No file saved to disk (pure stream)
4. ✓ Image validation works (type, size)
5. ✓ Error handling untuk invalid file
6. ✓ Works dengan all supported formats
7. ✓ Queue handling seperti text messages

### Technical:
1. ✓ Memory efficient (buffer cleared after send)
2. ✓ No temp files created
3. ✓ Proper MIME type detection
4. ✓ File size validation before upload
5. ✓ No memory leaks

### Performance:
1. ✓ Upload time < 5 seconds (untuk 5MB image)
2. ✓ Memory spike temporary (cleared after send)
3. ✓ Multiple uploads handled correctly

---

## 🧪 Testing Scenarios

**Test with curl:**

```bash
# Test 1: Send image without caption
curl -X POST http://localhost:3000/send-image \
  -F "image=@/path/to/image.jpg" \
  -F "to=628123456789"
# Expected: 200 OK, image received on WhatsApp

# Test 2: Send image with caption
curl -X POST http://localhost:3000/send-image \
  -F "image=@/path/to/image.png" \
  -F "to=08123456789" \
  -F "caption=Look at this *amazing* photo!"
# Expected: 200 OK, image with formatted caption

# Test 3: Invalid file type (PDF)
curl -X POST http://localhost:3000/send-image \
  -F "image=@/path/to/document.pdf" \
  -F "to=628123456789"
# Expected: 400 ValidationError (invalid type)

# Test 4: File too large (>10 MB)
# Create large file: dd if=/dev/zero of=large.jpg bs=1M count=15
curl -X POST http://localhost:3000/send-image \
  -F "image=@large.jpg" \
  -F "to=628123456789"
# Expected: 400 ValidationError (file too large)

# Test 5: No file uploaded
curl -X POST http://localhost:3000/send-image \
  -F "to=628123456789"
# Expected: 400 ValidationError (no file)

# Test 6: Missing 'to' field
curl -X POST http://localhost:3000/send-image \
  -F "image=@/path/to/image.jpg"
# Expected: 400 ValidationError (to required)

# Test 7: WhatsApp not connected
# (Disconnect WhatsApp first)
curl -X POST http://localhost:3000/send-image \
  -F "image=@/path/to/image.jpg" \
  -F "to=628123456789"
# Expected: 503 ServiceUnavailable

# Test 8: All image formats
# Test with .jpg, .png, .gif, .webp
# Expected: All formats work correctly
```

**Test with Postman:**
1. Select POST method
2. URL: http://localhost:3000/send-image
3. Body → form-data
4. Add key "image" (type: File)
5. Add key "to" (type: Text)
6. Add key "caption" (type: Text, optional)
7. Send

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 4: Send Images.

Context:
- PHASE 3 completed (send text working)
- Working directory: D:\working\gatrion\whatsapp
- Text messages already working

Your tasks:
1. Create src/middleware/upload.middleware.js (Multer config)
2. Update src/api/controllers/send.controller.js (add sendImage function)
3. Update src/whatsapp/client.js (add sendImageMessage method)
4. Update src/api/routes.js (add POST /send-image)

Requirements:
- Multer with MEMORY storage (no disk writes)
- Single file upload, field name: 'image'
- Max file size: 10 MB
- Allowed types: image/jpeg, image/png, image/gif, image/webp
- Caption support with WhatsApp formatting
- Phone number validation same as Phase 3
- Stream buffer directly to WhatsApp
- Queue handling same as Phase 3
- Comprehensive error handling

Endpoint:
POST /send-image
Content-Type: multipart/form-data

Form fields:
- image: [file]
- to: "628123456789"
- caption: "Optional *caption*" (optional)

Response (Success):
{
  "success": true,
  "data": {
    "messageId": "...",
    "to": "628xxx@s.whatsapp.net",
    "type": "image",
    "caption": "...",
    "size": 1048576,
    "mimeType": "image/jpeg",
    "status": "sent",
    "timestamp": "..."
  }
}

Validations:
- File required
- File type must be image (jpeg/png/gif/webp)
- File size ≤ 10 MB
- 'to' field required
- WhatsApp connected

Multer Configuration:
const storage = multer.memoryStorage() // CRITICAL!
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: // validate image types
})

Baileys Usage:
await sock.sendMessage(jid, {
    image: req.file.buffer,  // Direct dari memory
    caption: caption || '',
    mimetype: req.file.mimetype
})

Key Points:
- NO fs.writeFile or temp files
- Buffer (req.file.buffer) directly to Baileys
- Memory auto-freed after send
- Same queue logic as text messages

Output:
- Complete implementation for all files
- Update routes.js to include upload middleware
- Error handling for all scenarios
- Validation logic

Ready? Begin Phase 4.
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] All files created/updated
- [ ] POST /send-image endpoint works
- [ ] Multer configured with memory storage
- [ ] No disk writes (verify no temp files)
- [ ] All image formats supported
- [ ] File size validation works
- [ ] File type validation works
- [ ] Caption with formatting works
- [ ] Phone validation works
- [ ] Connection check works
- [ ] Queue integration works
- [ ] Error handling complete
- [ ] Message ID returned
- [ ] Memory freed after send (no leaks)

### Critical Points to Verify:
1. **Memory Storage:** Verify `multer.memoryStorage()` used
2. **No Disk I/O:** Check no `fs.writeFile` or temp files
3. **Buffer Handling:** `req.file.buffer` passed directly to Baileys
4. **File Validation:** Type and size checked BEFORE upload
5. **Caption Formatting:** Bold, italic, etc. work in captions

### Performance Test:
```bash
# Monitor memory during image send
node --expose-gc index.js

# Send 5MB image, watch memory spike then return to baseline
# Memory should NOT grow continuously
```

**Approval Required Before Phase 5**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Will verify no disk I/O & memory handling
