-- Working schema v0.1: 21 domain tables. The source DOCX defines only six.
-- Additional definitions implement the TZ and decisions dated 2026-10-28.
-- Foreign keys are enabled by D1; local verification explicitly enables them.
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL CHECK(length(trim(full_name)) > 0),
  phone TEXT NOT NULL UNIQUE,
  email TEXT COLLATE NOCASE UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin','client','master')),
  address TEXT,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(expires_at > created_at)
);
CREATE INDEX sessions_user_expiry ON sessions(user_id,expires_at);

CREATE TABLE masters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  experience_years INTEGER NOT NULL DEFAULT 0 CHECK(experience_years >= 0),
  service_area TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(service_area) AND json_type(service_area)='array'),
  max_daily_requests INTEGER NOT NULL DEFAULT 5 CHECK(max_daily_requests > 0),
  rating REAL NOT NULL DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
  is_available INTEGER NOT NULL DEFAULT 1 CHECK(is_available IN (0,1)),
  is_onsite INTEGER NOT NULL DEFAULT 1 CHECK(is_onsite IN (0,1)),
  is_dropoff INTEGER NOT NULL DEFAULT 0 CHECK(is_dropoff IN (0,1)),
  CHECK(is_onsite=1 OR is_dropoff=1)
);
CREATE TABLE services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  equipment_category TEXT NOT NULL,
  base_price REAL NOT NULL CHECK(base_price >= 0),
  average_duration_minutes INTEGER NOT NULL CHECK(average_duration_minutes > 0),
  required_skill_level INTEGER NOT NULL DEFAULT 1 CHECK(required_skill_level > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
);
CREATE TABLE service_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
);
CREATE TABLE master_skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id),
  skill_level INTEGER NOT NULL CHECK(skill_level > 0),
  UNIQUE(master_id,service_id)
);
CREATE INDEX master_skills_service ON master_skills(service_id,skill_level);

CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  service_id INTEGER NOT NULL REFERENCES services(id),
  master_id INTEGER REFERENCES masters(id),
  service_mode TEXT NOT NULL CHECK(service_mode IN ('onsite','dropoff')),
  client_address TEXT,
  service_district TEXT CHECK(service_district IN ('Центральный','Северный','Южный')),
  dropoff_point_id INTEGER REFERENCES service_points(id),
  preferred_datetime TEXT NOT NULL,
  preferred_slot TEXT NOT NULL CHECK(preferred_slot GLOB '[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]'),
  description TEXT NOT NULL CHECK(length(trim(description)) > 0),
  comment TEXT,
  contact_phone TEXT NOT NULL CHECK(length(trim(contact_phone)) > 0),
  contact_person TEXT,
  photos TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(photos) AND json_type(photos)='array'),
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup','completed','closed','cancelled','rejected')),
  needs_manual_review INTEGER NOT NULL DEFAULT 0 CHECK(needs_manual_review IN (0,1)),
  is_urgent INTEGER NOT NULL DEFAULT 0 CHECK(is_urgent IN (0,1)),
  total_price REAL NOT NULL DEFAULT 0 CHECK(total_price >= 0),
  started_at TEXT,
  completed_at TEXT,
  status_changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK((service_mode='onsite' AND client_address IS NOT NULL AND length(trim(client_address))>0 AND service_district IS NOT NULL AND dropoff_point_id IS NULL)
     OR (service_mode='dropoff' AND dropoff_point_id IS NOT NULL AND client_address IS NULL AND service_district IS NULL)),
  CHECK(status NOT IN ('assigned','in_progress','waiting_parts','ready_for_pickup','completed','closed') OR master_id IS NOT NULL),
  CHECK(status != 'ready_for_pickup' OR service_mode='dropoff')
);
CREATE INDEX requests_client_created ON requests(user_id,created_at);
CREATE INDEX requests_master_schedule ON requests(master_id,preferred_datetime,status);
CREATE INDEX requests_escalation ON requests(status,status_changed_at);
CREATE INDEX requests_manual ON requests(needs_manual_review,status);

CREATE TABLE master_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  is_booked INTEGER NOT NULL DEFAULT 0 CHECK(is_booked IN (0,1)),
  request_id INTEGER UNIQUE REFERENCES requests(id),
  UNIQUE(master_id,starts_at),
  CHECK(ends_at > starts_at),
  CHECK((is_booked=0 AND request_id IS NULL) OR (is_booked=1 AND request_id IS NOT NULL))
);
CREATE INDEX schedule_available ON master_schedule(master_id,is_booked,starts_at,ends_at);

CREATE TABLE request_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0)
);
CREATE INDEX request_items_request ON request_items(request_id);
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
);
CREATE TABLE parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK(typeof(min_stock)='integer' AND min_stock >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1))
);
CREATE INDEX parts_supplier ON parts(supplier_id);
CREATE TABLE warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('central','master')),
  master_id INTEGER UNIQUE REFERENCES masters(id),
  CHECK((type='central' AND master_id IS NULL) OR (type='master' AND master_id IS NOT NULL))
);
CREATE UNIQUE INDEX one_central_warehouse ON warehouses(type) WHERE type='central';
CREATE TABLE stock (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  part_id INTEGER NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(typeof(quantity)='integer' AND quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK(typeof(reserved_quantity)='integer' AND reserved_quantity >= 0 AND reserved_quantity <= quantity),
  UNIQUE(warehouse_id,part_id)
);
CREATE INDEX stock_part ON stock(part_id);
CREATE TABLE request_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity > 0),
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','reserved','issued','used','returned')),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK(typeof(reserved_quantity)='integer' AND reserved_quantity >= 0),
  issued_quantity INTEGER NOT NULL DEFAULT 0 CHECK(typeof(issued_quantity)='integer' AND issued_quantity >= 0),
  used_quantity INTEGER NOT NULL DEFAULT 0 CHECK(typeof(used_quantity)='integer' AND used_quantity >= 0),
  returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK(typeof(returned_quantity)='integer' AND returned_quantity >= 0),
  changed_by_user_id INTEGER REFERENCES users(id),
  changed_by_role TEXT NOT NULL DEFAULT 'system' CHECK(changed_by_role IN ('system','master','admin')),
  needed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(request_id,part_id),
  CHECK(reserved_quantity + issued_quantity <= quantity),
  CHECK(used_quantity + returned_quantity <= issued_quantity),
  CHECK((changed_by_role='system' AND changed_by_user_id IS NULL) OR (changed_by_role!='system' AND changed_by_user_id IS NOT NULL))
);
CREATE INDEX request_parts_fifo ON request_parts(needed_at,id);
CREATE INDEX request_parts_part ON request_parts(part_id,status);

CREATE TABLE request_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  from_status TEXT CHECK(from_status IS NULL OR from_status IN ('new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup','completed','closed','cancelled','rejected')),
  to_status TEXT NOT NULL CHECK(to_status IN ('new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup','completed','closed','cancelled','rejected')),
  changed_by_user_id INTEGER REFERENCES users(id),
  changed_by_role TEXT NOT NULL DEFAULT 'system' CHECK(changed_by_role IN ('system','client','master','admin')),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX history_request_time ON request_status_history(request_id,created_at);
CREATE TABLE ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL UNIQUE REFERENCES requests(id),
  master_id INTEGER NOT NULL REFERENCES masters(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK(typeof(rating)='integer' AND rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX ratings_master ON ratings(master_id);
CREATE TRIGGER ratings_eligible_insert BEFORE INSERT ON ratings
WHEN NOT EXISTS (SELECT 1 FROM requests WHERE id=NEW.request_id AND user_id=NEW.user_id AND master_id=NEW.master_id AND status IN ('completed','closed'))
BEGIN SELECT RAISE(ABORT,'rating requires an owned completed or closed request'); END;
CREATE TRIGGER ratings_eligible_update BEFORE UPDATE ON ratings
WHEN NOT EXISTS (SELECT 1 FROM requests WHERE id=NEW.request_id AND user_id=NEW.user_id AND master_id=NEW.master_id AND status IN ('completed','closed'))
BEGIN SELECT RAISE(ABORT,'rating requires an owned completed or closed request'); END;

CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','sent','received')),
  created_by_user_id INTEGER REFERENCES users(id),
  received_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK((status='received' AND received_at IS NOT NULL) OR (status!='received' AND received_at IS NULL))
);
CREATE INDEX orders_supplier_status ON purchase_orders(supplier_id,status);
CREATE TABLE purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  part_id INTEGER NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity > 0),
  unit_price REAL NOT NULL CHECK(unit_price >= 0),
  UNIQUE(purchase_order_id,part_id)
);
CREATE INDEX purchase_items_part ON purchase_order_items(part_id);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id INTEGER REFERENCES requests(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
  event_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX notifications_inbox ON notifications(user_id,is_read,created_at);
CREATE TABLE notification_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  request_id INTEGER REFERENCES requests(id),
  channel TEXT NOT NULL CHECK(channel IN ('email','sms')),
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  error TEXT,
  event_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  sent_at TEXT,
  CHECK(status!='sent' OR sent_at IS NOT NULL)
);
CREATE INDEX queue_status_created ON notification_queue(status,created_at);
CREATE INDEX queue_user ON notification_queue(user_id);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  role TEXT NOT NULL CHECK(role IN ('system','client','master','admin')),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details) AND json_type(details)='object'),
  ip_address TEXT,
  user_agent TEXT,
  event_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX audit_created ON audit_log(created_at);
CREATE INDEX audit_entity ON audit_log(entity_type,entity_id);
CREATE INDEX audit_user ON audit_log(user_id,created_at);
