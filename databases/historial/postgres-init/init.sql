CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    colaborador BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    failed_logins INT DEFAULT 0,
    reset_token TEXT,
    reset_expiry TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP,
    failed_logins INT DEFAULT 0,
    reset_token TEXT,
    reset_expiry TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations(
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  address VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collaborators (
  user_id INT PRIMARY KEY,
  organization_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION ensure_user_is_colaborador()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = NEW.user_id AND u.colaborador = TRUE
  ) THEN
    RAISE EXCEPTION 'El usuario % no es colaborador', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_user_is_colaborador
BEFORE INSERT OR UPDATE ON collaborators
FOR EACH ROW
EXECUTE FUNCTION ensure_user_is_colaborador();

CREATE TABLE general_feedback (
    id SERIAL PRIMARY KEY,              -- O AUTO_INCREMENT en MySQL
    user_id VARCHAR(255) NOT NULL,      -- Coincide con el email o ID de tu usuario
    comment TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'archived'
    device_info VARCHAR(255),           -- Opcional: Para saber si vino de mobile/desktop
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX idx_feedback_user ON general_feedback(user_id);

-- Índice para filtrar por estado (útil para un panel de administración)
CREATE INDEX idx_feedback_status ON general_feedback(status);