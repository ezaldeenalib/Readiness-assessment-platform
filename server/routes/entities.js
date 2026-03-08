import express from 'express';
import { query } from '../database/db.js';
import pool from '../database/db.js';
import { authenticateToken, authorizeRoles, checkEntityAccess } from '../middleware/auth.js';
import { generateEntitiesPDF } from '../utils/entitiesPdfGenerator.js';
import { logAudit } from '../utils/auditLog.js';

const router = express.Router();

function performedBy(req) {
  return req.user?.email || req.user?.full_name || String(req.user?.id ?? 'system');
}

// Get all entities (with hierarchy support)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { parent_id, include_children } = req.query;
    let queryText;
    let params = [];

    if (req.user.role === 'super_admin') {
      // Super admin sees all entities
      if (parent_id) {
        queryText = `SELECT * FROM entities WHERE parent_entity_id = $1 ORDER BY name`;
        params = [parent_id];
      } else if (include_children === 'true') {
        queryText = `SELECT * FROM entity_hierarchy ORDER BY level, name`;
      } else {
        queryText = `SELECT * FROM entities ORDER BY name`;
      }
    } else if (req.user.role === 'ministry_admin') {
      // Ministry admin sees their ministry and children
      queryText = `
        WITH RECURSIVE entity_tree AS (
          SELECT * FROM entities WHERE id = $1
          UNION ALL
          SELECT e.* FROM entities e
          JOIN entity_tree et ON e.parent_entity_id = et.id
        )
        SELECT * FROM entity_tree ORDER BY name
      `;
      params = [req.user.entity_id];
    } else {
      // Entity user: جهته فقط أو قائمة الجهات المسندة له (user_institutions)
      const allowedIds = req.user.institutions && req.user.institutions.length > 0
        ? req.user.institutions
        : (req.user.entity_id != null ? [req.user.entity_id] : []);
      if (allowedIds.length === 0) {
        queryText = `SELECT * FROM entities WHERE 1=0`;
        params = [];
      } else if (allowedIds.length === 1) {
        queryText = `SELECT * FROM entities WHERE id = $1 ORDER BY name`;
        params = [allowedIds[0]];
      } else {
        queryText = `SELECT * FROM entities WHERE id = ANY($1::int[]) ORDER BY name_ar, name`;
        params = [allowedIds];
      }
    }

    const result = await query(queryText, params);
    res.json({ entities: result.rows });
  } catch (error) {
    console.error('Get entities error:', error);
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// Export entities as PDF
router.get('/export/pdf', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    console.log('Starting entities PDF export...');
    
    let queryText;
    let params = [];

    if (req.user.role === 'super_admin') {
      // Super admin sees all entities
      queryText = `SELECT * FROM entities ORDER BY name_ar, name`;
    } else if (req.user.role === 'ministry_admin') {
      // Ministry admin sees their ministry and children
      queryText = `
        WITH RECURSIVE entity_tree AS (
          SELECT * FROM entities WHERE id = $1
          UNION ALL
          SELECT e.* FROM entities e
          JOIN entity_tree et ON e.parent_entity_id = et.id
        )
        SELECT * FROM entity_tree ORDER BY name_ar, name
      `;
      params = [req.user.entity_id];
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(queryText, params);
    const entities = result.rows;

    console.log(`Got ${entities.length} entities`);

    if (entities.length === 0) {
      return res.status(404).json({ error: 'No entities found' });
    }

    console.log('Generating PDF...');
    const pdfBuffer = await generateEntitiesPDF(entities);
    console.log('PDF generated successfully, size:', pdfBuffer.length);

    // Send PDF
    const filename = `entities_report_${new Date().toISOString().split('T')[0]}.pdf`;
    const filenameUtf8 = encodeURIComponent('تقرير_الجهات_' + new Date().toISOString().split('T')[0] + '.pdf');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filenameUtf8}`);
    res.send(pdfBuffer);
    console.log('PDF sent successfully');
  } catch (error) {
    console.error('Export entities PDF error:', error);
    res.status(500).json({ error: 'Failed to export PDF: ' + error.message });
  }
});

// Get entity by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT e.*, 
              pe.name as parent_name, pe.name_ar as parent_name_ar,
              (SELECT COUNT(*) FROM entities WHERE parent_entity_id = e.id) as children_count,
              (SELECT COUNT(*) FROM assessments WHERE entity_id = e.id) as assessment_count
       FROM entities e
       LEFT JOIN entities pe ON e.parent_entity_id = pe.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json({ entity: result.rows[0] });
  } catch (error) {
    console.error('Get entity error:', error);
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

// Create new entity
router.post('/', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { name, name_ar, activity_type, parent_entity_id, contact_email, contact_phone, address } = req.body;

    if (!name || !name_ar || !activity_type) {
      return res.status(400).json({ error: 'Name, Arabic name, and activity type are required' });
    }

    const result = await query(
      `INSERT INTO entities (name, name_ar, activity_type, parent_entity_id, contact_email, contact_phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, name_ar, activity_type, parent_entity_id, contact_email, contact_phone, address]
    );

    const entity = result.rows[0];
    await logAudit(pool, 'entities', entity.id, 'INSERT', null, { name: entity.name, name_ar: entity.name_ar, activity_type: entity.activity_type }, performedBy(req));

    res.status(201).json({ 
      message: 'Entity created successfully',
      entity
    });
  } catch (error) {
    console.error('Create entity error:', error);
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

// Update entity
router.put('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_ar, activity_type, contact_email, contact_phone, address, is_active } = req.body;

    const oldResult = await query('SELECT id, name, name_ar, is_active FROM entities WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const result = await query(
      `UPDATE entities 
       SET name = COALESCE($1, name),
           name_ar = COALESCE($2, name_ar),
           activity_type = COALESCE($3, activity_type),
           contact_email = COALESCE($4, contact_email),
           contact_phone = COALESCE($5, contact_phone),
           address = COALESCE($6, address),
           is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`,
      [name, name_ar, activity_type, contact_email, contact_phone, address, is_active, id]
    );

    const entity = result.rows[0];
    await logAudit(pool, 'entities', parseInt(id), 'UPDATE', { name: oldResult.rows[0].name, name_ar: oldResult.rows[0].name_ar, is_active: oldResult.rows[0].is_active }, { name: entity.name, name_ar: entity.name_ar, is_active: entity.is_active }, performedBy(req));

    res.json({ 
      message: 'Entity updated successfully',
      entity
    });
  } catch (error) {
    console.error('Update entity error:', error);
    res.status(500).json({ error: 'Failed to update entity' });
  }
});

// Get entity's children
router.get('/:id/children', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM entities WHERE parent_entity_id = e.id) as children_count,
              (SELECT COUNT(*) FROM assessments WHERE entity_id = e.id) as assessment_count
       FROM entities e
       WHERE e.parent_entity_id = $1
       ORDER BY e.name`,
      [id]
    );

    res.json({ children: result.rows });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to fetch child entities' });
  }
});

// Get entity dashboard statistics
router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get entity info
    const entityResult = await query(
      'SELECT * FROM entities WHERE id = $1',
      [id]
    );

    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    // Get statistics
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT a.id) as total_assessments,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'draft') as draft_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'submitted') as submitted_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'approved') as approved_count,
        AVG(a.maturity_score) as avg_maturity_score,
        (SELECT COUNT(*) FROM entities WHERE parent_entity_id = $1) as children_count
       FROM assessments a
       WHERE a.entity_id = $1`,
      [id]
    );

    // Get recent assessments
    const recentResult = await query(
      `SELECT * FROM assessment_summary
       WHERE entity_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [id]
    );

    res.json({
      entity: entityResult.rows[0],
      statistics: statsResult.rows[0],
      recent_assessments: recentResult.rows
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Delete entity
router.delete('/:id', authenticateToken, authorizeRoles('super_admin', 'ministry_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if entity exists
    const entityResult = await query('SELECT * FROM entities WHERE id = $1', [id]);
    if (entityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    const entity = entityResult.rows[0];

    // Check if entity has children
    const childrenResult = await query(
      'SELECT COUNT(*) as count FROM entities WHERE parent_entity_id = $1',
      [id]
    );
    if (parseInt(childrenResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete entity with child entities. Please delete or reassign children first.' 
      });
    }

    // Check if entity has assessments
    const assessmentsResult = await query(
      'SELECT COUNT(*) as count FROM assessments WHERE entity_id = $1',
      [id]
    );
    if (parseInt(assessmentsResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete entity with assessments. Please delete assessments first.' 
      });
    }

    // Check access for ministry_admin
    if (req.user.role === 'ministry_admin' && req.user.entity_id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete entity
    await query('DELETE FROM entities WHERE id = $1', [id]);

    await logAudit(pool, 'entities', parseInt(id), 'DELETE', { name: entity.name, name_ar: entity.name_ar, activity_type: entity.activity_type }, null, performedBy(req));

    res.json({ message: 'Entity deleted successfully' });
  } catch (error) {
    console.error('Delete entity error:', error);
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

export default router;
