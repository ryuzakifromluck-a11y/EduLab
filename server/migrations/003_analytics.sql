-- Anonymous usage analytics (api/analytics/*, server/analytics/).
-- Only aggregate counters are stored: no IP addresses, user agents, user ids or exact times.
--   dimension 'total'      key 'sessions' | 'completed'
--   dimension 'experiment' key <experiment id>   visits per experiment
--   dimension 'subject'    key <subject>         visits per subject
--   dimension 'month'      key YYYY-MM           visits per month
CREATE TABLE analytics_counters (
  dimension  text   NOT NULL CHECK (dimension IN ('total', 'experiment', 'subject', 'month')),
  key        text   NOT NULL CHECK (key ~ '^[a-z0-9-]{1,64}$'),
  count      bigint NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (dimension, key)
);
