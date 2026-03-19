import { Router } from 'express';
import user_db from '../infraestructure/databases/db_user.js';
import { adminLogin } from "../controllers/admin.controller.js";
import { authenticateToken } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// POST /api/admin/auth/login
router.post("/auth/login", adminLogin);
// GET /api/admin/ping

router.get("/ping", authenticateToken, requireAdmin, (req, res) => {
  res.json({ ok: true, admin: req.user.username });
});

router.use(authenticateToken, requireAdmin);

// GET /users
router.get('/', async (req, res, next) => {
  try {
    const result = await user_db.query(`
      SELECT id, name, email, colaborador
      FROM users
      ORDER BY id ASC
    `);

    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await user_db.query(
      `DELETE FROM users WHERE id = $1 RETURNING id, name, email`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

// POST /users/colaborador-batch
router.post('/colaborador-batch', async (req, res, next) => {
  try {
    const { changes } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: 'No hay cambios para procesar' });
    }

    const client = await user_db.connect();
    try {
      await client.query('BEGIN');
      for (const change of changes) {
        await client.query(
          `UPDATE users SET colaborador = $1, updated_at = NOW() WHERE id = $2`,
          [change.colaborador, change.id]
        );

        if (change.colaborador === false) {
          await client.query(`DELETE FROM collaborators WHERE user_id = $1`, [change.id]);
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ message: 'Cambios aplicados correctamente' });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get("/organizations", async (req, res, next) => {
  try {
    const r = await user_db.query(`
      SELECT id, name, description, address, is_active, created_at, updated_at
      FROM organizations
      ORDER BY id ASC
    `);
    res.json({ organizations: r.rows });
  } catch (err) { next(err); }
});

router.get("/organizations/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const orgRes = await user_db.query(
      `SELECT id, name, description, address, is_active FROM organizations WHERE id = $1`,
      [id]
    );
    if (orgRes.rowCount === 0) return res.status(404).json({ error: "Local no encontrado" });

    const collabsRes = await user_db.query(
      `
      SELECT u.id, u.name, u.email
      FROM collaborators c
      JOIN users u ON u.id = c.user_id
      WHERE c.organization_id = $1
      ORDER BY u.id ASC
      `,
      [id]
    );

    res.json({ organization: orgRes.rows[0], collaborators: collabsRes.rows });
  } catch (err) { next(err); }
});

router.patch("/organizations/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, description, address } = req.body;

    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });
    if (name !== undefined && String(name).trim().length < 2) {
      return res.status(400).json({ error: "name inválido" });
    }

    const r = await user_db.query(
      `
      UPDATE organizations
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        address = COALESCE($3, address),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, description, address, updated_at
      `,
      [name !== undefined ? String(name).trim() : null, description ?? null, address ?? null, id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Local no encontrado" });
    res.json({ organization: r.rows[0] });
  } catch (err) { next(err); }
});

router.post("/organizations/:id/collaborators", async (req, res, next) => {
  try {
    const organization_id = Number(req.params.id);
    const { user_id } = req.body;
    const uid = Number(user_id);

    if (!Number.isInteger(organization_id) || !Number.isInteger(uid)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    // Inserta y el trigger valida que sea colaborador
    const r = await user_db.query(
      `
      INSERT INTO collaborators (user_id, organization_id, created_at)
      VALUES ($1, $2, NOW())
      RETURNING user_id, organization_id, created_at
      `,
      [uid, organization_id]
    );

    res.status(201).json({ collaborator: r.rows[0] });
  } catch (err) {
    // Si el user ya pertenece a otra org -> choque PK user_id
    // Si no es colaborador -> trigger
    res.status(400).json({ error: err.message });
  }
});

router.delete("/organizations/:id/collaborators/:userId", async (req, res, next) => {
  try {
    const organization_id = Number(req.params.id);
    const user_id = Number(req.params.userId);

    if (!Number.isInteger(organization_id) || !Number.isInteger(user_id)) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    const r = await user_db.query(
      `DELETE FROM collaborators WHERE organization_id = $1 AND user_id = $2 RETURNING user_id`,
      [organization_id, user_id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Colaborador no encontrado en este local" });
    res.json({ message: "Colaborador removido", user_id });
  } catch (err) { next(err); }
});

router.delete("/organizations/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID inválido" });

    const r = await user_db.query(
      `DELETE FROM organizations WHERE id = $1 RETURNING id, name`,
      [id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: "Local no encontrado" });
    // Por ON DELETE CASCADE se eliminan filas en collaborators asociadas
    res.json({ message: "Local eliminado", organization: r.rows[0] });
  } catch (err) { next(err); }
});


router.get("/get-collabs", async (req, res, next) => { 
  try {
    const onlyColab = String(req.query.colaborador || "") === "true";

    const result = await user_db.query(
      `
      SELECT id, name, email, colaborador
      FROM users
      ${onlyColab ? "WHERE colaborador = TRUE" : ""}
      ORDER BY id ASC
      `
    );

    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post("/organizations-with-collaborator", async (req, res, next) => {
  const client = await user_db.connect();
  try {
    const { name, description, address, user_id } = req.body;

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: "name es requerido" });
    }

    const uid = Number(user_id);
    if (!Number.isInteger(uid)) {
      return res.status(400).json({ error: "user_id inválido" });
    }

    await client.query("BEGIN");

    // 1) crear organización
    const orgRes = await client.query(
      `
      INSERT INTO organizations (name, description, address, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, description, address
      `,
      [String(name).trim(), description ?? null, address ?? null]
    );

    const org = orgRes.rows[0];

    // 2) asignar colaborador (tu trigger validará users.colaborador = true)
    await client.query(
      `
      INSERT INTO collaborators (user_id, organization_id, created_at)
      VALUES ($1, $2, NOW())
      `,
      [uid, org.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ organization: org, assigned_user_id: uid });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.post('/feedback/general', authenticateToken, async (req, res, next) => {
  let client;
  try {
    const { comment } = req.body;
    // Extraemos el ID del usuario desde el token decodificado por el middleware
    const userId = req.user.user_id || req.user.id; 

    // 1. Validación de Payload
    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'El comentario es obligatorio' });
    }

    // 2. Conexión y Ejecución
    client = await user_db.connect();
    
    // No necesitamos BEGIN/COMMIT explícito para un solo INSERT, 
    // pero mantenemos el try/finally para liberar el cliente.
    
    const query = `
      INSERT INTO general_feedback (user_id, comment, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id, created_at
    `;
    
    const result = await client.query(query, [userId, comment]);

    // 3. Respuesta Exitosa
    res.status(201).json({
      message: 'Feedback recibido correctamente',
      data: result.rows[0]
    });

  } catch (err) {
    console.error('[Feedback Error]:', err);
    next(err); // Pasa el error a tu middleware de manejo de errores global
  } finally {
    // CRÍTICO: Liberar el cliente al pool
    if (client) client.release();
  }
});

export default router;
