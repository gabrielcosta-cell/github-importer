-- Duplicate SDR | Principal pipeline as SDR | Refugo
DO $$
DECLARE
  new_pipeline_id uuid;
  original_pipeline_id uuid := 'cb0f6956-8786-45a6-8953-c20775c1c9fa';
  stage_record record;
BEGIN
  -- Create new pipeline
  INSERT INTO crm_pipelines (name, description, position, is_active, created_by)
  VALUES (
    'SDR | Refugo',
    NULL,
    1000,
    true,
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
  )
  RETURNING id INTO new_pipeline_id;

  -- Duplicate all stages from original pipeline
  FOR stage_record IN 
    SELECT name, color, position
    FROM crm_stages
    WHERE pipeline_id = original_pipeline_id
    ORDER BY position
  LOOP
    INSERT INTO crm_stages (pipeline_id, name, color, position, is_active)
    VALUES (
      new_pipeline_id,
      stage_record.name,
      stage_record.color,
      stage_record.position,
      true
    );
  END LOOP;
END $$;