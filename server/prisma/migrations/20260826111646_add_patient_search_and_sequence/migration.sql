-- Dedicated sequence for human-readable patient numbers (P-000001, ...).
-- A real Postgres sequence makes concurrent patient creation from multiple
-- computers safe: nextval() is atomic, so two doctors/computers creating a
-- patient in the same instant can never be handed the same number. (The
-- previous "read the last patientNumber, add one" approach had a race
-- window that only stayed safe by accident under SQLite's single-writer
-- lock — it would not have been safe under real concurrent cloud access.)
CREATE SEQUENCE IF NOT EXISTS patient_number_seq START 1;

-- Trigram search support: lets partial/substring patient search (name,
-- phone, patient ID — used by both the search bar and duplicate detection)
-- use an index instead of a full table scan once the Patient table holds
-- tens of thousands of rows. gin_trgm_ops supports LIKE, ILIKE, and the
-- app's case-insensitive `contains` queries.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Patient_firstName_trgm_idx" ON "Patient" USING GIN ("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Patient_lastName_trgm_idx" ON "Patient" USING GIN ("lastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Patient_phone_trgm_idx" ON "Patient" USING GIN ("phone" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Patient_patientNumber_trgm_idx" ON "Patient" USING GIN ("patientNumber" gin_trgm_ops);
