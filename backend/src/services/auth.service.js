import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import user_db from '../infraestructure/databases/db_user.js'; // Asegúrate que esta ruta sea correcta

export class AuthService {
  
  async registerUser(name, email, password) {
    // Validación básica de negocio
    if (!name || !email || !password) {
      throw { status: 400, message: 'Faltan campos obligatorios' };
    }

    const cleanEmail = email.toLowerCase().trim();

    // Hash seguro (Cost factor 10 es estándar, súbelo a 12 si tienes hardware de sobra)
    const passwordHash = await bcrypt.hash(password, 10);

    const insertQuery = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at;
    `;

    try {
      const { rows } = await user_db.query(insertQuery, [name, cleanEmail, passwordHash]);
      return rows[0];
    } catch (err) {
      // PostgreSQL unique_violation -> email duplicado
      if (err?.code === '23505' && err?.constraint === 'users_email_key') {
        throw { status: 409, message: 'El correo ya está registrado' };
      }
      throw err;
    }
  }

  async loginUser(email, password) {
    if (!email || !password) {
      throw { status: 400, message: 'Email y password son obligatorios' };
    }

    const cleanEmail = email.toLowerCase().trim();
    
    const result = await user_db.query(
      'SELECT id, email, password_hash, colaborador, is_active FROM users WHERE email=$1',
      [cleanEmail]
    );

    if (result.rowCount === 0) throw { status: 401, message: 'Credenciales inválidas' };

    const user = result.rows[0];

    if (!user.is_active) throw { status: 403, message: 'Usuario desactivado' };

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) throw { status: 401, message: 'Credenciales inválidas' };

    // Generar Token
    const token = jwt.sign(
      { user_id: user.id, email: user.email, colaborador: user.colaborador },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    // Actualizar último login (Fire and forget, no bloqueamos la respuesta por esto)
    user_db.query('UPDATE users SET last_login=NOW() WHERE id=$1', [user.id]).catch(console.error);

    return {
      token,
      user: { id: user.id, email: user.email, colaborador: user.colaborador }
    };
  }
}