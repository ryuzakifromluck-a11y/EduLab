-- EduLab accounts schema. Applied by `npm run migrate` (server/db/migrate.ts).
-- Each file in this folder runs once, in name order, inside a transaction.

CREATE TABLE users (
  id            uuid PRIMARY KEY,
  email         text NOT NULL,
  name          text NOT NULL,
  -- scrypt$<salt>$<hash>, see server/password.ts
  password_hash text NOT NULL CHECK (password_hash LIKE 'scrypt$%'),
  preferences   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- Emails are normalized (trimmed, lower-cased) by the API before they reach the database;
-- the index on lower(email) keeps them unique even if a row is written by hand.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- One row per user per experiment: experimentId -> { score, settings, completedAt }.
CREATE TABLE progress (
  user_id           uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  experiment_id     text NOT NULL CHECK (experiment_id ~ '^[a-z0-9-]{1,64}$'),
  completed_at      timestamptz NOT NULL,
  last_completed_at timestamptz NOT NULL,
  attempts          integer NOT NULL DEFAULT 1 CHECK (attempts >= 0),
  best_score        double precision CHECK (best_score BETWEEN 0 AND 100),
  settings          jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, experiment_id)
);
CREATE INDEX progress_experiment_id_idx ON progress (experiment_id);

-- Issued sign-in tokens (JWT `jti`). Tokens expire after 30 days; sign-out revokes one.
CREATE TABLE sessions (
  id         uuid PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- Teacher-led QR remote-control sessions (code such as ABC-123). Closed after 30 minutes.
-- The table is created now so the remote-control feature can use it without another migration.
CREATE TABLE remote_sessions (
  code       text PRIMARY KEY CHECK (code ~ '^[A-Z0-9-]{6,9}$'),
  teacher_id uuid REFERENCES users (id) ON DELETE CASCADE,
  -- Latest state per student: { "<studentId>": { name, experimentId, settings, updatedAt } }
  state      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);
CREATE INDEX remote_sessions_teacher_id_idx ON remote_sessions (teacher_id);
CREATE INDEX remote_sessions_expires_at_idx ON remote_sessions (expires_at);
