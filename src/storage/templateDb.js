import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

class TemplateDB {
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
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'marketing',
        content TEXT NOT NULL,
        variables TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_templates_session ON templates(session_id)');
    this.save();
    this.ready = true;
  }
  
  async waitReady() {
    if (!this.ready) await this.initPromise;
  }

  save() {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.dbPath, buffer);
  }

  insertTemplate(template) {
    this.db.run(
      `INSERT INTO templates (id, session_id, name, category, content, variables, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [template.id, template.sessionId, template.name, template.category, template.content, JSON.stringify(template.variables)]
    );
    this.save();
    return this.getTemplate(template.id);
  }

  getTemplate(id) {
    const stmt = this.db.prepare('SELECT * FROM templates WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return {
        ...row,
        variables: JSON.parse(row.variables || '[]')
      };
    }
    stmt.free();
    return null;
  }

  getTemplatesBySession(sessionId) {
    const templates = [];
    const stmt = this.db.prepare('SELECT * FROM templates WHERE session_id = ?');
    stmt.bind([sessionId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      templates.push({
        ...row,
        variables: JSON.parse(row.variables || '[]')
      });
    }
    stmt.free();
    return templates;
  }

  updateTemplate(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.category) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.content) { fields.push('content = ?'); values.push(updates.content); }
    if (updates.variables) { fields.push('variables = ?'); values.push(JSON.stringify(updates.variables)); }
    
    fields.push("updated_at = datetime('now')");
    values.push(id);
    
    this.db.run(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`, values);
    this.save();
    return this.getTemplate(id);
  }

  deleteTemplate(id) {
    this.db.run('DELETE FROM templates WHERE id = ?', [id]);
    this.save();
    return true;
  }

  incrementUsage(id) {
    this.db.run('UPDATE templates SET usage_count = usage_count + 1 WHERE id = ?', [id]);
    this.save();
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }
}

export default TemplateDB;
