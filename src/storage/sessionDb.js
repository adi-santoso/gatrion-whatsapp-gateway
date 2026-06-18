import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

class SessionDB {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this.ready = false;
    this.initPromise = this.init();
  }

  async init() {
    const SQL = await initSqlJs();
    
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        status TEXT DEFAULT 'disconnected',
        auth_path TEXT NOT NULL,
        webhook_url TEXT,
        webhook_secret TEXT,
        webhook_enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_connected_at DATETIME
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone)');

    this.save();
    this.ready = true;
  }
  
  async waitReady() {
    if (!this.ready) {
      await this.initPromise;
    }
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dbPath, buffer);
  }

  insertSession(session) {
    try {
      this.db.run(
        `INSERT INTO sessions (id, name, phone, status, auth_path, webhook_url, webhook_secret, webhook_enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          session.id,
          session.name,
          session.phone || null,
          session.status || 'disconnected',
          session.auth_path,
          session.webhook_url || null,
          session.webhook_secret || null,
          session.webhook_enabled ? 1 : 0
        ]
      );
      this.save();
      return this.getSession(session.id);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        throw new Error('Session already exists in database');
      }
      throw err;
    }
  }

  updateSession(sessionId, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updates.phone);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.webhook_url !== undefined) {
      fields.push('webhook_url = ?');
      values.push(updates.webhook_url);
    }
    if (updates.webhook_secret !== undefined) {
      fields.push('webhook_secret = ?');
      values.push(updates.webhook_secret);
    }
    if (updates.webhook_enabled !== undefined) {
      fields.push('webhook_enabled = ?');
      values.push(updates.webhook_enabled ? 1 : 0);
    }

    if (fields.length === 0) return this.getSession(sessionId);

    values.push(sessionId);
    this.db.run(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
    return this.getSession(sessionId);
  }

  getSession(sessionId) {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    stmt.bind([sessionId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  getAllSessions() {
    const sessions = [];
    const stmt = this.db.prepare('SELECT * FROM sessions');
    while (stmt.step()) {
      sessions.push(stmt.getAsObject());
    }
    stmt.free();
    return sessions;
  }

  deleteSession(sessionId) {
    this.db.run('DELETE FROM sessions WHERE id = ?', [sessionId]);
    this.save();
    return true;
  }

  updateSessionStatus(sessionId, status) {
    this.db.run('UPDATE sessions SET status = ? WHERE id = ?', [status, sessionId]);
    this.save();
  }

  updateSessionPhone(sessionId, phone) {
    this.db.run('UPDATE sessions SET phone = ? WHERE id = ?', [phone, sessionId]);
    this.save();
  }

  updateLastConnected(sessionId) {
    this.db.run("UPDATE sessions SET last_connected_at = datetime('now') WHERE id = ?", [sessionId]);
    this.save();
  }

  updateWebhook(sessionId, webhookConfig) {
    const fields = [];
    const values = [];

    if (webhookConfig.webhookUrl !== undefined) {
      fields.push('webhook_url = ?');
      values.push(webhookConfig.webhookUrl);
    }
    if (webhookConfig.webhookSecret !== undefined) {
      fields.push('webhook_secret = ?');
      values.push(webhookConfig.webhookSecret);
    }
    if (webhookConfig.webhookEnabled !== undefined) {
      fields.push('webhook_enabled = ?');
      values.push(webhookConfig.webhookEnabled ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(sessionId);
      this.db.run(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values);
      this.save();
    }
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

export default SessionDB;
