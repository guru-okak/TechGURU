ALTER TABLE users ADD COLUMN avatar_url TEXT CHECK(avatar_url IS NULL OR (length(avatar_url)<=28000 AND avatar_url GLOB 'data:image/webp;base64,*'));
CREATE TRIGGER schedule_overlap_insert BEFORE INSERT ON master_schedule
WHEN EXISTS(SELECT 1 FROM master_schedule s WHERE s.master_id=NEW.master_id AND s.starts_at<NEW.ends_at AND s.ends_at>NEW.starts_at)
BEGIN SELECT RAISE(ABORT,'schedule_overlap'); END;
CREATE TRIGGER schedule_overlap_update BEFORE UPDATE OF starts_at,ends_at,master_id ON master_schedule
WHEN EXISTS(SELECT 1 FROM master_schedule s WHERE s.master_id=NEW.master_id AND s.id!=NEW.id AND s.starts_at<NEW.ends_at AND s.ends_at>NEW.starts_at)
BEGIN SELECT RAISE(ABORT,'schedule_overlap'); END;
CREATE TRIGGER schedule_owner_insert BEFORE INSERT ON master_schedule
WHEN NEW.is_booked=1 AND NOT EXISTS(SELECT 1 FROM requests WHERE id=NEW.request_id AND master_id=NEW.master_id)
BEGIN SELECT RAISE(ABORT,'schedule_owner_required'); END;
CREATE TRIGGER schedule_owner_update BEFORE UPDATE OF request_id,is_booked ON master_schedule
WHEN NEW.is_booked=1 AND NOT EXISTS(SELECT 1 FROM requests WHERE id=NEW.request_id AND master_id=NEW.master_id)
BEGIN SELECT RAISE(ABORT,'schedule_owner_required'); END;
