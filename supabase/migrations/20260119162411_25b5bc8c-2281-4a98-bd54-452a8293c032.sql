-- Update personal_tests records from holihope_metadata
UPDATE personal_tests
SET
  test_name = COALESCE(
    holihope_metadata->>'TestTypeName',
    holihope_metadata->>'testTypeName',
    holihope_metadata->>'testName',
    'Без названия'
  ),
  test_date = COALESCE(
    (holihope_metadata->>'DateTime')::timestamptz,
    (holihope_metadata->>'dateTime')::timestamptz,
    test_date
  ),
  subject = COALESCE(
    holihope_metadata->>'Discipline',
    holihope_metadata->>'discipline'
  ),
  level = COALESCE(
    holihope_metadata->>'TestTypeCategoryName',
    holihope_metadata->>'testTypeCategoryName'
  ),
  comments = COALESCE(
    holihope_metadata->>'CommentText',
    holihope_metadata->>'commentText'
  ),
  score = (
    SELECT COALESCE(SUM((skill->>'Score')::numeric), NULL)
    FROM jsonb_array_elements(
      COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)
    ) AS skill
    WHERE jsonb_typeof(COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)) = 'array'
  ),
  max_score = (
    SELECT COALESCE(SUM((skill->>'MaxScore')::numeric), NULL)
    FROM jsonb_array_elements(
      COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)
    ) AS skill
    WHERE jsonb_typeof(COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)) = 'array'
  ),
  percentage = (
    SELECT CASE 
      WHEN COALESCE(SUM((skill->>'MaxScore')::numeric), 0) > 0 
      THEN ROUND((COALESCE(SUM((skill->>'Score')::numeric), 0) / COALESCE(SUM((skill->>'MaxScore')::numeric), 1)) * 100)
      ELSE NULL
    END
    FROM jsonb_array_elements(
      COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)
    ) AS skill
    WHERE jsonb_typeof(COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)) = 'array'
  ),
  passed = (
    SELECT CASE
      WHEN COUNT(*) = 0 THEN false
      ELSE bool_and((skill->>'Score')::numeric >= COALESCE((skill->>'ValidScore')::numeric, 0))
    END
    FROM jsonb_array_elements(
      COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)
    ) AS skill
    WHERE jsonb_typeof(COALESCE(holihope_metadata->'Skills', holihope_metadata->'skills', '[]'::jsonb)) = 'array'
  ),
  updated_at = now()
WHERE holihope_metadata IS NOT NULL;