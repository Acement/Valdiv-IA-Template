import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../infraestructure/databases/db_user.js";

export async function adminLogin(req, res) {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan credenciales" });
  }

  const { rows } = await pool.query(
    "SELECT id, username, password_hash, is_active, failed_logins FROM admins WHERE username=$1",
    [username]
  );

  const admin = rows[0];
  if (!admin) return res.status(401).json({ error: "Credenciales inválidas" });
  if (!admin.is_active) return res.status(403).json({ error: "Cuenta desactivada" });

  const maxFails = Number(process.env.MAX_FAILED_LOGINS ?? 5);
  if ((admin.failed_logins ?? 0) >= maxFails) {
    return res.status(403).json({ error: "Cuenta bloqueada por intentos fallidos" });
  }

  const ok = await bcrypt.compare(password, admin.password_hash);

  if (!ok) {
    await pool.query(
      "UPDATE admins SET failed_logins = failed_logins + 1, updated_at = NOW() WHERE id=$1",
      [admin.id]
    );
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  await pool.query(
    "UPDATE admins SET failed_logins=0, last_login=NOW(), updated_at=NOW() WHERE id=$1",
    [admin.id]
  );

  const token = jwt.sign(
    { sub: admin.id, role: "admin", username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "1h" }
  );

  return res.json({ token });
}
