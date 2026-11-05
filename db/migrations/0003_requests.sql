-- Stage 4: request identifiers and operation metadata. No domain tables added.
ALTER TABLE requests ADD COLUMN request_number TEXT
  CHECK(request_number IS NULL OR (length(request_number)=14 AND request_number GLOB 'TGR-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9]'));
ALTER TABLE requests ADD COLUMN cancel_reason TEXT;
ALTER TABLE requests ADD COLUMN cancelled_by TEXT CHECK(cancelled_by IS NULL OR cancelled_by IN ('client','admin','system'));
ALTER TABLE requests ADD COLUMN assigned_at TEXT;
ALTER TABLE requests ADD COLUMN version INTEGER NOT NULL DEFAULT 0 CHECK(version>=0);
ALTER TABLE requests ADD COLUMN last_operation_id TEXT;
CREATE UNIQUE INDEX requests_number_unique ON requests(request_number);
CREATE UNIQUE INDEX requests_operation_unique ON requests(last_operation_id) WHERE last_operation_id IS NOT NULL;
UPDATE requests SET request_number='TGR-'||strftime('%Y',created_at,'+3 hours')||'-'||printf('%05d',id);
UPDATE requests SET assigned_at=updated_at WHERE master_id IS NOT NULL AND status IN ('assigned','in_progress','waiting_parts','ready_for_pickup','completed','closed');
ALTER TABLE request_status_history ADD COLUMN event_type TEXT NOT NULL DEFAULT 'status_change'
  CHECK(event_type IN ('status_change','no_answer','assignment','comment'));
UPDATE request_status_history SET event_type='no_answer' WHERE comment='Недозвон' OR comment LIKE 'Недозвон:%';
CREATE INDEX history_no_answer_window ON request_status_history(request_id,event_type,created_at);

-- The sequence is allocated inside the inserting statement/transaction, not by a read-then-write in JS.
-- Existing rows get stable numbers, the next insertion uses the highest suffix for that Moscow year.
CREATE TRIGGER requests_generate_number AFTER INSERT ON requests WHEN NEW.request_number IS NULL
BEGIN
  SELECT CASE WHEN (SELECT COALESCE(MAX(CAST(substr(request_number,10) AS INTEGER)),0) FROM requests
    WHERE substr(request_number,1,9)='TGR-'||strftime('%Y',NEW.created_at,'+3 hours')||'-')>=99999
    THEN RAISE(ABORT,'request_number_exhausted') END;
  UPDATE requests SET request_number='TGR-'||strftime('%Y',NEW.created_at,'+3 hours')||'-'||printf('%05d',
    (SELECT COALESCE(MAX(CAST(substr(request_number,10) AS INTEGER)),0)+1 FROM requests
      WHERE substr(request_number,1,9)='TGR-'||strftime('%Y',NEW.created_at,'+3 hours')||'-'))
    WHERE id=NEW.id;
END;
CREATE TRIGGER requests_number_immutable BEFORE UPDATE OF request_number ON requests
WHEN OLD.request_number IS NOT NULL AND NEW.request_number IS NOT OLD.request_number
BEGIN SELECT RAISE(ABORT,'request_number_immutable'); END;
