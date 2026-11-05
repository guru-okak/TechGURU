CREATE TABLE master_reports (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_id INTEGER NOT NULL REFERENCES requests(id),
 master_id INTEGER NOT NULL REFERENCES masters(id),
 category TEXT NOT NULL CHECK(category IN ('qualification','diagnosis','system','other')),
 message TEXT NOT NULL CHECK(length(message) BETWEEN 5 AND 2000),
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 resolved_at TEXT
);
CREATE INDEX master_reports_status ON master_reports(status,created_at);
