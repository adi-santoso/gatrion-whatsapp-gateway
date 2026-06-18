# Phase 12: Group Management - Blueprint

> **Objective:** Full WhatsApp group messaging and management capabilities

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

### Current Limitations

**Phase 1-11:**
- ✅ Can send messages to individual contacts
- ❌ No group message support
- ❌ No group management (create, update)
- ❌ No participant management
- ❌ No group metadata access

**Webhook Support (Phase 8):**
- ✅ Can receive group messages via webhook
- ✅ `isGroup: true` flag present
- ❌ No API to interact with groups

### Real-World Use Cases

1. **Broadcast Announcements:** Send updates to all group members
2. **Community Management:** Create/manage community groups
3. **Team Coordination:** Manage team groups programmatically
4. **Customer Communities:** Invite customers to support groups
5. **Event Groups:** Create temporary groups for events

### What Will Change

- Add 7 group management endpoints
- Group CRUD operations
- Participant management
- Group metadata access
- Invite link generation
- Group message routing

---

## 2. Technical Specification

### 2.1 New API Endpoints (Multi-Session)

**All endpoints require `sessionId` parameter (strict validation):**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/groups` | GET | List all groups session is member of |
| `GET /api/groups/:id` | GET | Get group details & metadata |
| `POST /api/groups/:id/send` | POST | Send message to group (with sessionId) |
| `POST /api/groups/create` | POST | Create new group (with sessionId) |
| `PUT /api/groups/:id` | PUT | Update group (name, description) |
| `POST /api/groups/:id/participants` | POST | Add participants to group |
| `DELETE /api/groups/:id/participants` | DELETE | Remove participants from group |
| `GET /api/groups/:id/invite` | GET | Get group invite link |
| `POST /api/groups/:id/leave` | POST | Leave group |
| `GET /api/groups/:id/admins` | GET | List group admins |
| `POST /api/groups/:id/promote` | POST | Promote member to admin |
| `POST /api/groups/:id/demote` | POST | Demote admin to member |

**Query Parameter or Body:**
```javascript
// Option 1: Query parameter
GET /api/groups?sessionId=session-abc123

// Option 2: Request body
POST /api/groups/create
{
  "sessionId": "session-abc123",
  "name": "Sales Team",
  "participants": ["628111222333", "628999888777"]
}
```

### 2.2 Data Models

**Group Metadata:**

```javascript
{
  id: "123456789@g.us",
  name: "Sales Team",
  subject: "Sales Team",
  description: "Official sales team group",
  owner: "628123456789@s.whatsapp.net",
  creation: 1718697600,
  participants: [
    {
      id: "628123456789@s.whatsapp.net",
      admin: "superadmin",
      isAdmin: true,
      isSuperAdmin: true
    },
    {
      id: "628111222333@s.whatsapp.net",
      admin: null,
      isAdmin: false,
      isSuperAdmin: false
    }
  ],
  size: 15,
  announce: false,     // Only admins can send
  restrict: false,     // Only admins can edit group info
  inviteCode: "abcd1234efgh5678"
}
```

**Group Summary (List):**

```javascript
{
  id: "123456789@g.us",
  name: "Sales Team",
  participantCount: 15,
  unreadCount: 5,
  lastMessageTime: 1718697600
}
```

### 2.3 Request/Response Schemas

**List Groups:**
```javascript
// GET /api/groups?sessionId=session-abc123

// Response
{
  success: true,
  data: {
    sessionId: "session-abc123",
    groups: [
      {
        id: "123456789@g.us",
        name: "Sales Team",
        participantCount: 15,
        unreadCount: 5
      }
    ],
    total: 3
  }
}
```

**Get Group Details:**
```javascript
// GET /api/groups/123456789@g.us?sessionId=session-abc123

// Response
{
  success: true,
  data: {
    sessionId: "session-abc123",
    id: "123456789@g.us",
    name: "Sales Team",
    description: "Official sales team group",
    participants: [...],
    owner: "628123456789@s.whatsapp.net",
    createdAt: "2024-06-18T10:00:00Z"
  }
}
```

**Send to Group:**
```javascript
// POST /api/groups/123456789@g.us/send
{
  sessionId: "session-abc123",  // ← REQUIRED
  message: "Team announcement!",
  mentions: ["628123456789", "628111222333"]  // Optional: mention users
}

// Response
{
  success: true,
  data: {
    jobId: "job-uuid",
    sessionId: "session-abc123",
    groupId: "123456789@g.us",
    status: "queued"
  }
}
```

**Create Group:**
```javascript
// POST /api/groups/create
{
  sessionId: "session-abc123",  // ← REQUIRED
  name: "New Project Team",
  participants: ["628123456789", "628111222333"]  // Min 1 participant
}

// Response
{
  success: true,
  data: {
    sessionId: "session-abc123",
    groupId: "987654321@g.us",
    name: "New Project Team",
    inviteCode: "xyz123abc",
    participantCount: 2
  }
}
```

**Update Group:**
```javascript
// PUT /api/groups/123456789@g.us
{
  sessionId: "session-123",
  name: "Updated Team Name",           // Optional
  description: "New description",      // Optional
  announce: true                       // Optional: only admins can send
}
```

**Add Participants:**
```javascript
// POST /api/groups/123456789@g.us/participants
{
  sessionId: "session-123",
  participants: ["628444555666", "628777888999"]
}

// Response
{
  success: true,
  data: {
    added: ["628444555666@s.whatsapp.net"],
    failed: [
      {
        participant: "628777888999",
        error: "Not on WhatsApp"
      }
    ]
  }
}
```

**Remove Participants:**
```javascript
// DELETE /api/groups/123456789@g.us/participants
{
  sessionId: "session-123",
  participants: ["628444555666"]
}
```

**Get Invite Link:**
```javascript
// GET /api/groups/123456789@g.us/invite?sessionId=session-123

// Response
{
  success: true,
  data: {
    inviteCode: "abc123xyz789",
    inviteLink: "https://chat.whatsapp.com/abc123xyz789"
  }
}
```

**Leave Group:**
```javascript
// POST /api/groups/123456789@g.us/leave
{
  sessionId: "session-123"
}
```

**Promote to Admin:**
```javascript
// POST /api/groups/123456789@g.us/promote
{
  sessionId: "session-123",
  participants: ["628444555666"]
}
```

### 2.4 File Structure

```
src/
├── api/
│   └── controllers/
│       └── group.controller.js      # [NEW] All group endpoints
├── whatsapp/
│   └── groupManager.js              # [NEW] Group operations wrapper
└── queue/
    └── types.js                     # [MODIFY] Add group job types
```

### 2.5 New Queue Job Types

```javascript
JOB_TYPES.SEND_GROUP_TEXT = 'send-group-text';
JOB_TYPES.SEND_GROUP_IMAGE = 'send-group-image';
JOB_TYPES.CREATE_GROUP = 'create-group';
JOB_TYPES.UPDATE_GROUP = 'update-group';
```

---

## 3. Implementation Steps

See: [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)

---

## 4. Code Standards & Patterns

### 4.1 Group ID Normalization

```javascript
function normalizeGroupId(groupId) {
  // Accept multiple formats
  if (groupId.endsWith('@g.us')) {
    return groupId;
  }
  return `${groupId}@g.us`;
}
```

### 4.2 Baileys Group Operations

```javascript
// List groups
const groups = await sock.groupFetchAllParticipating();

// Get group metadata
const metadata = await sock.groupMetadata(groupId);

// Send to group (same as normal message)
await sock.sendMessage(groupId, { text: message });

// Create group
const { id } = await sock.groupCreate('Group Name', ['628123@s.whatsapp.net']);

// Update group
await sock.groupUpdateSubject(groupId, 'New Name');
await sock.groupUpdateDescription(groupId, 'New Description');

// Add participants
await sock.groupParticipantsUpdate(groupId, ['628123@s.whatsapp.net'], 'add');

// Remove participants
await sock.groupParticipantsUpdate(groupId, ['628123@s.whatsapp.net'], 'remove');

// Promote to admin
await sock.groupParticipantsUpdate(groupId, ['628123@s.whatsapp.net'], 'promote');

// Demote admin
await sock.groupParticipantsUpdate(groupId, ['628123@s.whatsapp.net'], 'demote');

// Get invite code
const code = await sock.groupInviteCode(groupId);

// Leave group
await sock.groupLeave(groupId);

// Settings
await sock.groupSettingUpdate(groupId, 'announcement'); // Only admins send
await sock.groupSettingUpdate(groupId, 'not_announcement'); // All can send
await sock.groupSettingUpdate(groupId, 'locked'); // Only admins edit
await sock.groupSettingUpdate(groupId, 'unlocked'); // All can edit
```

### 4.3 Mentions Pattern

```javascript
// Send with mentions
await sock.sendMessage(groupId, {
  text: 'Hello @628123456789 and @628111222333!',
  mentions: ['628123456789@s.whatsapp.net', '628111222333@s.whatsapp.net']
});
```

### 4.4 Error Handling

```javascript
try {
  await sock.groupParticipantsUpdate(groupId, participants, 'add');
} catch (error) {
  if (error.message.includes('not authorized')) {
    throw new Error('Bot is not admin in this group');
  }
  if (error.message.includes('not found')) {
    throw new Error('Group not found');
  }
  throw error;
}
```

---

## 5. Integration Points

### 5.1 Multi-Session Integration (Phase 11)

All group endpoints accept `sessionId` parameter:

```javascript
async function listGroups(sessionId) {
  const client = sessionManager.getSession(sessionId);
  const groups = await client.groupFetchAllParticipating();
  return Object.values(groups);
}
```

### 5.2 Queue Integration (Phase 9)

Group messages go through queue:

```javascript
await addJob(JOB_TYPES.SEND_GROUP_TEXT, {
  sessionId,
  groupId,
  message,
  mentions,
});
```

### 5.3 Webhook Integration (Phase 8)

Webhook already supports group messages (Phase 8), now bidirectional.

---

## 6. Acceptance Criteria

### Must Have (P0)

- [ ] List all groups endpoint works
- [ ] Get group details endpoint works
- [ ] Send message to group works
- [ ] Create group works (min 1 participant)
- [ ] Add participants works
- [ ] Remove participants works
- [ ] Get invite link works
- [ ] Leave group works
- [ ] Multi-session support (sessionId parameter)
- [ ] Queue integration works
- [ ] Tests pass with >80% coverage

### Nice to Have (P1)

- [ ] Update group name/description
- [ ] Promote/demote admins
- [ ] Group settings (announce mode, restrict)
- [ ] Mentions in group messages
- [ ] Group profile picture update

---

## 7. Testing Requirements

See: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 8. Rollback Plan

Additive feature, no breaking changes. To rollback:

```bash
git revert <commit-hash>
pm2 restart whatsapp-gateway
```

---

**Next:** See [IMPLEMENTATION_STEPS.md](./IMPLEMENTATION_STEPS.md)
