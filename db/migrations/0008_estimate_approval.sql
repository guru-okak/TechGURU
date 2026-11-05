ALTER TABLE requests ADD COLUMN estimate_proposal TEXT CHECK (estimate_proposal IS NULL OR json_valid(estimate_proposal));
ALTER TABLE requests ADD COLUMN approved_parts_cents INTEGER CHECK (approved_parts_cents >= 0);
