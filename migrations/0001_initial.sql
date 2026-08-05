PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS interview_questions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  short_answer TEXT NOT NULL,
  expert_answer TEXT NOT NULL,
  speaking_blueprint TEXT NOT NULL,
  common_mistakes TEXT NOT NULL DEFAULT '[]',
  follow_up_questions TEXT NOT NULL DEFAULT '[]',
  role TEXT NOT NULL,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  technology TEXT,
  question_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','rejected','duplicate','archived')),
  quality_score INTEGER NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  fingerprint TEXT NOT NULL UNIQUE,
  duplicate_of TEXT,
  source TEXT,
  generated_by TEXT,
  reviewer_notes TEXT,
  reviewed_at TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topic_queue (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  role TEXT NOT NULL,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  technology TEXT,
  question_type TEXT NOT NULL DEFAULT 'technical',
  priority INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('idea','approved','generating','generated','rejected','failed')),
  source TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_public ON interview_questions(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_filters ON interview_questions(role, category, technology, level);
CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON topic_queue(status, priority DESC, created_at ASC);
