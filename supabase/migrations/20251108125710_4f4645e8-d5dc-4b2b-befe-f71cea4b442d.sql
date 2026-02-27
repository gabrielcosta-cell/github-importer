-- Redistribuir cards do Onboarding para Mês Teste e Refinamento

-- Mover 14 cards para Mês Teste
UPDATE crm_cards
SET stage_id = '79961385-5354-4e35-a7a9-dd51e7c0f4e7',
    updated_at = NOW()
WHERE id IN (
  'fb966b70-c82d-4409-ba2b-96dea409595b',
  '1fca1198-6936-4f55-b67a-ea193b06a0f0',
  'd0a6d85f-65f1-4870-94c4-294434f0c038',
  '9a4a7dc5-4af6-407f-a8a9-9016f1d788fe',
  '6636256b-66cf-46a4-8ee0-07c0a4080faa',
  '284079f2-4cc4-4e40-9634-1893abf61ded',
  'cedc192d-baa6-42f9-9903-30dbd970eaa8',
  '6f99e607-2bb8-4a45-8543-7c085a5b07ae',
  '2dea9f65-a3ee-4246-a2ec-8c16d108638d',
  '2962b04b-c728-45cc-b395-bff6e570f372',
  '7cd32b04-2a39-4c4b-8cf7-1781a6dbb5c4',
  'ecc724f1-a069-4c8a-aa81-a8daf21de443',
  '4b0c8ed4-a6b7-4789-8d21-690fca771ec0',
  '06665c14-1d5d-45b5-b5c0-6493353ab428'
);

-- Mover 12 cards para Refinamento
UPDATE crm_cards
SET stage_id = '4df73633-9eb8-46f9-bf10-fc2975a1f6df',
    updated_at = NOW()
WHERE id IN (
  '20b75626-fb14-4be4-935b-3a19369e8155',
  '9826e95c-34fa-486c-b7ca-690ee2c5dcd5',
  '3d01c117-66cd-4a9b-bf02-5d8d393e1e84',
  '384f473e-c52d-40eb-81d4-c750aefadd03',
  'e760fbe6-c9a7-4b63-b24e-a3f6a432ec60',
  '0c23cab4-4590-43d0-85a8-8ff1a4e21ddc',
  '02a89e46-9ec5-4580-806e-d6fcdf87808b',
  '8e7b81f4-d266-4eaf-a310-896b55c4e3d0',
  'c3b3aa28-1be7-44ff-99ac-38a3813ba01c',
  '2b030f54-aa5b-4ca7-a0bc-f9976836e4af',
  '878f32c6-5bc6-48de-a8bd-bd814494ac01',
  '5a32588a-cdb1-4b3d-9289-c5ee591a521b'
);