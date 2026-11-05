-- Stage 3: refresh rotation identifiers; keep the 21-table domain model.
ALTER TABLE sessions ADD COLUMN refresh_jti TEXT;
CREATE UNIQUE INDEX sessions_refresh_jti ON sessions(refresh_jti) WHERE refresh_jti IS NOT NULL;
-- Legacy sessions cannot participate in refresh rotation; keep them for inspection.
UPDATE sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE refresh_jti IS NULL AND revoked_at IS NULL;
CREATE INDEX audit_auth_rate_limit ON audit_log(action,ip_address,created_at);
