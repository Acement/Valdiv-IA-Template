import user_db from "../../../infraestructure/databases/db_user.js";

export async function getCollaboratorOrgName(userId) {
  const { rows } = await user_db.query(`
    SELECT o.name AS org_nombre
    FROM users u
    JOIN collaborators c ON c.user_id = u.id
    JOIN organizations o ON o.id = c.organization_id
    WHERE u.id = $1
      AND u.is_active = TRUE
      AND u.colaborador = TRUE
      AND o.is_active = TRUE
    LIMIT 1
  `, [userId]);

  return rows[0]?.org_nombre ?? null;
}