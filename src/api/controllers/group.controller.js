import { sessionManager } from '../../index.js';
import { addMessageJob, JOB_TYPES } from '../../queue/messageQueue.js';

export async function listGroups(req, res) {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const groups = await sessionManager.getGroups(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId,
        groups,
        total: groups.length
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getGroupDetails(req, res) {
  try {
    const { id } = req.params;
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const metadata = await sessionManager.getGroupMetadata(sessionId, id);
    
    res.json({
      success: true,
      data: {
        sessionId,
        ...metadata
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createGroup(req, res) {
  try {
    const { sessionId, name, participants } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const result = await sessionManager.createGroup(sessionId, name, participants);
    
    res.status(201).json({
      success: true,
      data: {
        sessionId,
        ...result
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateGroup(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, subject, description } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    if (subject) {
      await sessionManager.updateGroupSubject(sessionId, id, subject);
    }
    
    if (description) {
      await sessionManager.updateGroupDescription(sessionId, id, description);
    }
    
    res.json({
      success: true,
      message: 'Group updated'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function addParticipants(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, participants } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const result = await sessionManager.addGroupParticipants(sessionId, id, participants);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function removeParticipants(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, participants } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const result = await sessionManager.removeGroupParticipants(sessionId, id, participants);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function promoteParticipants(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, participants } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const result = await sessionManager.promoteGroupParticipants(sessionId, id, participants);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function demoteParticipants(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, participants } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const result = await sessionManager.demoteGroupParticipants(sessionId, id, participants);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function leaveGroup(req, res) {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    await sessionManager.leaveGroup(sessionId, id);
    
    res.json({
      success: true,
      message: 'Left group'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getInviteCode(req, res) {
  try {
    const { id } = req.params;
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const result = await sessionManager.getGroupInviteCode(sessionId, id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function sendToGroup(req, res) {
  try {
    const { id } = req.params;
    const { sessionId, message, mentions, priority, delay } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const job = await addMessageJob(JOB_TYPES.SEND_GROUP_MESSAGE, sessionId, {
      groupId: id,
      message,
      mentions
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
