import { randomBytes } from 'crypto';
import TemplateDB from '../../storage/templateDb.js';
import { bulkService } from '../../services/bulkService.js';

const templateDb = new TemplateDB('./data/templates.db');

export async function listTemplates(req, res) {
  try {
    await templateDb.waitReady();
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const templates = templateDb.getTemplatesBySession(sessionId);
    
    res.json({
      success: true,
      data: { sessionId, templates, total: templates.length }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getTemplate(req, res) {
  try {
    await templateDb.waitReady();
    const { id } = req.params;
    
    const template = templateDb.getTemplate(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function createTemplate(req, res) {
  try {
    await templateDb.waitReady();
    const { sessionId, name, category, content } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const variables = bulkService.extractVariables(content);
    const templateId = 'template-' + randomBytes(8).toString('hex');
    
    const template = templateDb.insertTemplate({
      id: templateId,
      sessionId,
      name,
      category: category || 'marketing',
      content,
      variables
    });
    
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function updateTemplate(req, res) {
  try {
    await templateDb.waitReady();
    const { id } = req.params;
    const { name, category, content } = req.body;
    
    const updates = { name, category, content };
    if (content) {
      updates.variables = bulkService.extractVariables(content);
    }
    
    const template = templateDb.updateTemplate(id, updates);
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function deleteTemplate(req, res) {
  try {
    await templateDb.waitReady();
    const { id } = req.params;
    
    templateDb.deleteTemplate(id);
    
    res.json({
      success: true,
      message: 'Template deleted'
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function bulkSend(req, res) {
  try {
    await templateDb.waitReady();
    const { sessionId, templateId, recipients, delayMin, delayMax, randomizeOrder } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }
    
    const template = templateDb.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    const processedRecipients = recipients.map(r => ({
      to: r.to,
      message: bulkService.replaceVariables(template.content, r.variables)
    }));
    
    const job = await bulkService.createBulkJob(sessionId, templateId, processedRecipients, {
      delayMin,
      delayMax,
      randomizeOrder
    });
    
    templateDb.incrementUsage(templateId);
    
    res.json({
      success: true,
      data: {
        bulkJobId: job.id,
        sessionId,
        total: job.total,
        status: job.status
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

export async function getBulkProgress(req, res) {
  try {
    const { jobId } = req.params;
    
    const job = bulkService.getJobProgress(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Bulk job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
