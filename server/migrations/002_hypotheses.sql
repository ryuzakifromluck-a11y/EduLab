-- Hypothesis stages: the latest hypothesis per user per experiment (see src/lib/hypothesis.ts).
-- The record is kept as JSON; `updated_at` decides which copy wins when two devices save.
CREATE TABLE hypotheses (
  user_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  experiment_id text NOT NULL CHECK (experiment_id ~ '^[a-z0-9-]{1,64}$'),
  record        jsonb NOT NULL,
  updated_at    timestamptz NOT NULL,
  PRIMARY KEY (user_id, experiment_id)
);
