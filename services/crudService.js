const db = require('../database/database');

const crudService = (tableName) => {
  return {
    getAll: async () => {
      return await db.all(`SELECT * FROM ${tableName}`);
    },
    getById: async (id) => {
      return await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [id]);
    },
    create: async (data) => {
      const body = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const keys = Object.keys(body);
      const values = Object.values(body);
      const placeholders = keys.map(() => '?').join(',');
      
      const sql = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
      const result = await db.run(sql, values);
      return { id: result.lastID, ...body };
    },
    update: async (id, data) => {
      const body = { ...data, updatedAt: new Date().toISOString() };
      const keys = Object.keys(body);
      const values = Object.values(body);
      
      const setClause = keys.map(k => `${k} = ?`).join(',');
      const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
      
      const result = await db.run(sql, [...values, id]);
      if (result.changes === 0) return null;
      return { id, ...body };
    },
    remove: async (id) => {
      const result = await db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      if (result.changes === 0) return false;
      return true;
    }
  };
};

module.exports = crudService;
