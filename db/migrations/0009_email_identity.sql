ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1 CHECK(email_verified IN (0,1));
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE TABLE auth_challenges (
 id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')), target_email TEXT NOT NULL,
 code_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL, consumed_at TEXT
);
CREATE INDEX auth_challenges_user ON auth_challenges(user_id,purpose,created_at);
