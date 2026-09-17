CREATE TABLE IF NOT EXISTS flight_state (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO flight_state (id,payload) VALUES (1,'{"schema_version":1,"flights":[]}');
