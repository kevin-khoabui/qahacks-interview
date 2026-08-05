ALTER TABLE interview_questions ADD COLUMN interviewer_evaluates TEXT NOT NULL DEFAULT '[]';
ALTER TABLE interview_questions ADD COLUMN real_world_example TEXT;
ALTER TABLE interview_questions ADD COLUMN strong_signals TEXT NOT NULL DEFAULT '[]';
ALTER TABLE interview_questions ADD COLUMN related_questions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE interview_questions ADD COLUMN estimated_answer_time INTEGER NOT NULL DEFAULT 3;
ALTER TABLE interview_questions ADD COLUMN cluster TEXT;
ALTER TABLE interview_questions ADD COLUMN unique_angle TEXT;
ALTER TABLE interview_questions ADD COLUMN similarity_score REAL NOT NULL DEFAULT 0;

ALTER TABLE topic_queue ADD COLUMN cluster TEXT;
ALTER TABLE topic_queue ADD COLUMN intent TEXT;
ALTER TABLE topic_queue ADD COLUMN unique_angle TEXT;
ALTER TABLE topic_queue ADD COLUMN must_cover TEXT NOT NULL DEFAULT '[]';
ALTER TABLE topic_queue ADD COLUMN must_avoid TEXT NOT NULL DEFAULT '[]';
ALTER TABLE topic_queue ADD COLUMN publish_after TEXT;

CREATE INDEX IF NOT EXISTS idx_questions_cluster_status ON interview_questions(cluster, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_cluster_status ON topic_queue(cluster, status, priority DESC);
