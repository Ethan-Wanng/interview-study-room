CREATE TABLE IF NOT EXISTS bridge_relay_links (
  id TEXT PRIMARY KEY,
  room_key TEXT NOT NULL UNIQUE,
  user_id TEXT,
  guest_code TEXT UNIQUE,
  secret_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bridge_relay_links_user ON bridge_relay_links(user_id);
CREATE INDEX IF NOT EXISTS idx_bridge_relay_links_guest ON bridge_relay_links(guest_code);
