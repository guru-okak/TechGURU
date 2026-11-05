-- Canonical monetary columns are INTEGER kopecks. Original ruble columns are
-- retained for migration compatibility; application writes both explicitly.
ALTER TABLE services ADD COLUMN base_price_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(base_price_cents)='integer' AND base_price_cents>=0);
ALTER TABLE parts ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(unit_price_cents)='integer' AND unit_price_cents>=0);
ALTER TABLE requests ADD COLUMN total_price_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(total_price_cents)='integer' AND total_price_cents>=0);
ALTER TABLE request_items ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(unit_price_cents)='integer' AND unit_price_cents>=0);
ALTER TABLE request_parts ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(unit_price_cents)='integer' AND unit_price_cents>=0);
ALTER TABLE purchase_order_items ADD COLUMN unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK(typeof(unit_price_cents)='integer' AND unit_price_cents>=0);
UPDATE services SET base_price_cents=CAST(round(base_price*100) AS INTEGER);
UPDATE parts SET unit_price_cents=CAST(round(unit_price*100) AS INTEGER);
UPDATE requests SET total_price_cents=CAST(round(total_price*100) AS INTEGER);
UPDATE request_items SET unit_price_cents=CAST(round(unit_price*100) AS INTEGER);
UPDATE request_parts SET unit_price_cents=CAST(round(unit_price*100) AS INTEGER);
UPDATE purchase_order_items SET unit_price_cents=CAST(round(unit_price*100) AS INTEGER);
ALTER TABLE service_points ADD COLUMN working_hours TEXT NOT NULL DEFAULT 'Пн–Сб, 10:00–20:00';
ALTER TABLE purchase_orders ADD COLUMN sent_at TEXT;
CREATE TRIGGER master_role_insert BEFORE INSERT ON masters
WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND role='master')
BEGIN SELECT RAISE(ABORT,'master_role_required'); END;
CREATE TRIGGER master_role_update BEFORE UPDATE OF user_id ON masters
WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.user_id AND role='master')
BEGIN SELECT RAISE(ABORT,'master_role_required'); END;
CREATE TRIGGER keep_master_role BEFORE UPDATE OF role ON users
WHEN NEW.role!='master' AND EXISTS(SELECT 1 FROM masters WHERE user_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'master_profile_exists'); END;
CREATE TRIGGER supplier_item_insert BEFORE INSERT ON purchase_order_items
WHEN (SELECT supplier_id FROM parts WHERE id=NEW.part_id)!=(SELECT supplier_id FROM purchase_orders WHERE id=NEW.purchase_order_id)
BEGIN SELECT RAISE(ABORT,'supplier_mismatch'); END;
CREATE TRIGGER supplier_item_update BEFORE UPDATE ON purchase_order_items
WHEN (SELECT supplier_id FROM parts WHERE id=NEW.part_id)!=(SELECT supplier_id FROM purchase_orders WHERE id=NEW.purchase_order_id)
BEGIN SELECT RAISE(ABORT,'supplier_mismatch'); END;
CREATE TRIGGER supplier_order_update BEFORE UPDATE OF supplier_id ON purchase_orders
WHEN EXISTS(SELECT 1 FROM purchase_order_items i JOIN parts p ON p.id=i.part_id WHERE i.purchase_order_id=OLD.id AND p.supplier_id!=NEW.supplier_id)
BEGIN SELECT RAISE(ABORT,'supplier_mismatch'); END;
CREATE TRIGGER supplier_part_update BEFORE UPDATE OF supplier_id ON parts
WHEN EXISTS(SELECT 1 FROM purchase_order_items i JOIN purchase_orders p ON p.id=i.purchase_order_id WHERE i.part_id=OLD.id AND p.supplier_id!=NEW.supplier_id)
BEGIN SELECT RAISE(ABORT,'supplier_mismatch'); END;
CREATE TRIGGER request_status_route BEFORE UPDATE OF status ON requests
WHEN OLD.status!=NEW.status AND NOT (
 (OLD.status='new' AND NEW.status IN ('confirmed','cancelled','rejected')) OR
 (OLD.status='confirmed' AND NEW.status IN ('assigned','cancelled','rejected')) OR
 (OLD.status='assigned' AND NEW.status IN ('confirmed','in_progress','rejected')) OR
 (OLD.status='in_progress' AND NEW.status IN ('waiting_parts','completed','ready_for_pickup','rejected')) OR
 (OLD.status='waiting_parts' AND NEW.status IN ('in_progress','rejected')) OR
 (OLD.status='ready_for_pickup' AND NEW.status IN ('completed','rejected')) OR
 (OLD.status='completed' AND NEW.status='closed'))
BEGIN SELECT RAISE(ABORT,'invalid_status_transition'); END;
CREATE TRIGGER reject_comment BEFORE UPDATE OF status ON requests
WHEN NEW.status='rejected' AND (NEW.comment IS NULL OR length(trim(NEW.comment))=0)
BEGIN SELECT RAISE(ABORT,'rejection_reason_required'); END;
CREATE TRIGGER completion_channel BEFORE UPDATE OF status ON requests
WHEN OLD.status='in_progress' AND NEW.status='completed' AND NEW.service_mode!='onsite'
BEGIN SELECT RAISE(ABORT,'dropoff_requires_pickup'); END;
CREATE TRIGGER close_delay BEFORE UPDATE OF status ON requests
WHEN NEW.status='closed' AND (OLD.completed_at IS NULL OR julianday('now')-julianday(OLD.completed_at)<3)
BEGIN SELECT RAISE(ABORT,'three_days_required'); END;
