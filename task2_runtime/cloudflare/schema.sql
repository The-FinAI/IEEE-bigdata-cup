CREATE TABLE IF NOT EXISTS control (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);
INSERT OR IGNORE INTO control VALUES (1, '{"published":[]}');
CREATE TABLE IF NOT EXISTS teams (
 session TEXT NOT NULL, identity TEXT NOT NULL, name TEXT NOT NULL, token_hash TEXT NOT NULL,
 PRIMARY KEY(session,identity)
);
CREATE TABLE IF NOT EXISTS receipts (
 session TEXT NOT NULL, identity TEXT NOT NULL, round_id TEXT NOT NULL,
 stock1 TEXT NOT NULL, stock2 TEXT NOT NULL, action TEXT NOT NULL,
 accepted_at TEXT NOT NULL, receipt_id TEXT NOT NULL,
 CHECK(stock1<>stock2), CHECK(action IN ('LS','SL','F')),
 PRIMARY KEY(session,identity,round_id)
);
