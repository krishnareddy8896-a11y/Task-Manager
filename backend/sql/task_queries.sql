-- PostgreSQL examples for the tables created by Django migrations.
-- Bind owner_id from the authenticated server-side user; never trust a client-supplied owner.

-- List a user's tasks, with undated tasks last.
SELECT id, title, description, status, priority, due_date, completed_at, category_id
FROM tasks_task
WHERE owner_id = $1
ORDER BY due_date NULLS LAST, created_at DESC;

-- Dashboard totals.
SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status = 'done') AS completed,
    COUNT(*) FILTER (WHERE status <> 'done') AS pending
FROM tasks_task
WHERE owner_id = $1;

-- Priority distribution for a user's tasks.
SELECT priority, COUNT(*) AS task_count
FROM tasks_task
WHERE owner_id = $1
GROUP BY priority
ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END;

-- Overdue, unfinished tasks.
SELECT id, title, priority, due_date
FROM tasks_task
WHERE owner_id = $1
  AND status <> 'done'
  AND due_date < CURRENT_DATE
ORDER BY due_date ASC;