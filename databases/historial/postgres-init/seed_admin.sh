psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
INSERT INTO admins (username, password_hash, is_active)
VALUES ('${ADMIN_USERNAME}', '${ADMIN_PASSWORD_HASH}', TRUE)
ON CONFLICT (username) DO NOTHING;
EOSQL