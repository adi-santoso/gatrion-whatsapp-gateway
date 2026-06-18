import { randomBytes } from 'crypto';
import { addMessageJob, JOB_TYPES } from '../queue/messageQueue.js';

class BulkService {
  constructor() {
    this.jobs = new Map();
  }

  extractVariables(content) {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  }

  replaceVariables(content, variables) {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  async createBulkJob(sessionId, templateId, recipients, options = {}) {
    const bulkJobId = 'bulk-' + randomBytes(8).toString('hex');
    
    const job = {
      id: bulkJobId,
      sessionId,
      templateId,
      total: recipients.length,
      processed: 0,
      success: 0,
      failed: 0,
      status: 'queued',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      failedRecipients: [],
      options: {
        delayMin: options.delayMin || 8000,
        delayMax: options.delayMax || 15000,
        randomizeOrder: options.randomizeOrder !== false
      }
    };

    this.jobs.set(bulkJobId, job);

    let processRecipients = [...recipients];
    if (job.options.randomizeOrder) {
      processRecipients = processRecipients.sort(() => Math.random() - 0.5);
    }

    for (let i = 0; i < processRecipients.length; i++) {
      const recipient = processRecipients[i];
      const delay = Math.floor(
        Math.random() * (job.options.delayMax - job.options.delayMin) + job.options.delayMin
      );

      await addMessageJob(JOB_TYPES.SEND_TEXT, sessionId, {
        to: recipient.to,
        message: recipient.message,
        bulkJobId
      }, {
        priority: 8,
        delay: delay * i
      });
    }

    job.status = 'processing';
    job.startedAt = new Date();

    return job;
  }

  updateJobProgress(bulkJobId, success) {
    const job = this.jobs.get(bulkJobId);
    if (!job) return;

    job.processed++;
    if (success) {
      job.success++;
    } else {
      job.failed++;
    }

    job.progress = Math.round((job.processed / job.total) * 100);

    if (job.processed >= job.total) {
      job.status = 'completed';
      job.completedAt = new Date();
    }
  }

  getJobProgress(bulkJobId) {
    return this.jobs.get(bulkJobId);
  }
}

export const bulkService = new BulkService();
