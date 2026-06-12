
-- Seed patients
INSERT INTO public.patients (mrn, first_name, last_name, dob, gender, phone, email, address_street, address_city, address_state, address_zip, insurance_payer, insurance_member_id, insurance_group, plan_type, subscriber_relationship, effective_date) VALUES
('MRN1000001','Sarah','Chen','1968-03-14','Female','415-555-0142','schen@email.com','420 Market St','San Francisco','CA','94105','UnitedHealthcare','UH8473829','GRP-7382','PPO','self','2025-01-01'),
('MRN1000002','Marcus','Johnson','1955-11-02','Male','312-555-0193','mjohnson@email.com','17 N Wabash Ave','Chicago','IL','60602','Aetna','AET2918471','GRP-2814','HMO','self','2024-09-01'),
('MRN1000003','Elena','Rodriguez','1982-07-22','Female','305-555-0271','erodriguez@email.com','840 Brickell Ave','Miami','FL','33131','Blue Cross Blue Shield','BCB7361852','GRP-9182','PPO','self','2025-03-15'),
('MRN1000004','James','OConnor','1947-01-09','Male','617-555-0317','joconnor@email.com','55 Court St','Boston','MA','02108','Medicare','MED9382017','MEDICARE-A','Medicare','self','2018-01-01'),
('MRN1000005','Priya','Patel','1990-05-30','Female','206-555-0419','ppatel@email.com','1200 5th Ave','Seattle','WA','98101','Cigna','CIG4827361','GRP-5519','EPO','self','2024-11-01'),
('MRN1000006','David','Williams','1973-09-18','Male','512-555-0218','dwilliams@email.com','905 Congress Ave','Austin','TX','78701','Humana','HUM1937284','GRP-8174','PPO','self','2025-02-01'),
('MRN1000007','Aisha','Khan','1965-12-04','Female','718-555-0356','akhan@email.com','11 Court Sq','Brooklyn','NY','11201','Medicaid','MCD7382910','NY-MCAID','Medicaid','self','2023-06-01'),
('MRN1000008','Robert','Nguyen','1959-04-26','Male','503-555-0407','rnguyen@email.com','1100 SW 6th Ave','Portland','OR','97204','UnitedHealthcare','UH2918374','GRP-4427','HMO','self','2024-08-01');

-- Seed authorizations (spread over last 90 days, mix of statuses)
WITH pts AS (SELECT id, first_name, last_name, insurance_payer FROM public.patients ORDER BY created_at ASC LIMIT 8)
INSERT INTO public.authorizations (patient_id, diagnosis, diagnosis_code, procedure_requested, procedure_code, payer, urgency, status, clinical_notes, referring_physician, approval_probability, denial_probability, documentation_risk, coding_risk, payer_complexity, risk_score, risk_factors, recommended_actions, ai_confidence, ai_model, risk_generated_at, submitted_at, decided_at, created_at)
SELECT
  p.id,
  d.diagnosis, d.dx_code, d.procedure, d.cpt, p.insurance_payer,
  d.urgency, d.status::auth_status, d.notes, d.physician,
  d.approval, d.denial, d.doc_risk, d.code_risk, d.payer_complex, d.risk_score,
  d.factors::jsonb, d.actions::jsonb, 0.85, 'google/gemini-3-flash-preview',
  now() - (d.days || ' days')::interval,
  now() - (d.days || ' days')::interval,
  CASE WHEN d.status IN ('approved','denied') THEN now() - ((d.days - 3) || ' days')::interval ELSE NULL END,
  now() - (d.days || ' days')::interval
FROM pts p
CROSS JOIN LATERAL (
  VALUES
    ('Lumbar disc herniation','M51.26','MRI Lumbar Spine without contrast','72148','routine','approved','Patient reports 8 weeks of radicular pain despite PT and NSAIDs. Positive straight leg raise.','Dr. Anita Shah',82,18,20,15,40,28,'[{"label":"Conservative care documented","severity":"low","detail":"PT and NSAIDs trialed >6 weeks"}]','["Submit PT notes with appeal if denied"]',5),
    ('Internal derangement of knee','M23.51','Knee arthroscopy','29881','routine','denied','MRI shows medial meniscal tear. Failed conservative management.','Dr. Brian Lee',45,55,60,30,55,58,'[{"label":"Missing recent MRI report","severity":"high","detail":"Imaging older than 90 days"}, {"label":"Insufficient PT documentation","severity":"med","detail":"Only 4 weeks of PT recorded"}]','["Attach full MRI report","Document additional 4 weeks of PT"]',12),
    ('Coronary artery disease','I25.10','Cardiac catheterization','93458','urgent','approved','Positive stress test. Strong family history.','Dr. Carol Martinez',88,12,15,10,30,18,'[{"label":"Clear medical necessity","severity":"low","detail":"Positive stress test + symptoms"}]','["No changes needed"]',20),
    ('Abdominal pain unspecified','R10.9','CT Abdomen with contrast','74177','routine','submitted','Persistent RLQ pain, normal labs.','Dr. David Park',65,35,40,25,45,42,'[{"label":"Vague indication","severity":"med","detail":"Differential diagnosis not narrowed"}]','["Document failed conservative workup","Specify exclusion criteria"]',30),
    ('Chronic sinusitis','J32.9','CT sinus without contrast','70486','routine','approved','Failed 12 weeks of medical therapy.','Dr. Emily Wong',78,22,25,18,35,28,'[{"label":"Adequate trial documented","severity":"low","detail":"12 weeks of medical mgmt"}]','["No changes needed"]',45),
    ('Rotator cuff tear','M75.101','Shoulder arthroscopy','29826','routine','denied','MRI confirms full thickness tear.','Dr. Frank Adams',55,45,50,35,50,52,'[{"label":"PT trial too short","severity":"high","detail":"Only 3 weeks documented"},{"label":"Missing functional assessment","severity":"med","detail":"No DASH or ASES score"}]','["Complete 6 weeks PT","Add validated outcome score"]',60),
    ('Obstructive sleep apnea','G47.33','Polysomnography','95810','routine','approved','BMI 38, witnessed apneas, Epworth 16.','Dr. Grace Kim',85,15,20,12,28,22,'[{"label":"Clear screening criteria met","severity":"low","detail":"High Epworth + BMI"}]','["No changes needed"]',75),
    ('Carpal tunnel syndrome','G56.00','EMG/NCS bilateral upper extremity','95910','routine','under_review','Bilateral hand numbness x 6 months.','Dr. Henry Brooks',70,30,35,20,40,32,'[{"label":"Provocative tests positive","severity":"low","detail":"Phalen+, Tinel+"}]','["Submit splint trial documentation"]',88)
) AS d(diagnosis, dx_code, procedure, cpt, urgency, status, notes, physician, approval, denial, doc_risk, code_risk, payer_complex, risk_score, factors, actions, days);

-- Activity log seeds
INSERT INTO public.activity_log (patient_id, action, detail, created_at)
SELECT id, 'patient_created', jsonb_build_object('name', first_name || ' ' || last_name), created_at
FROM public.patients;

INSERT INTO public.activity_log (patient_id, authorization_id, action, detail, created_at)
SELECT a.patient_id, a.id, 'authorization_created', jsonb_build_object('procedure', a.procedure_requested), a.created_at
FROM public.authorizations a;

INSERT INTO public.activity_log (patient_id, authorization_id, action, detail, created_at)
SELECT a.patient_id, a.id, 'risk_scored', jsonb_build_object('denial_probability', a.denial_probability), a.risk_generated_at
FROM public.authorizations a WHERE a.risk_generated_at IS NOT NULL;

INSERT INTO public.activity_log (patient_id, authorization_id, action, detail, created_at)
SELECT a.patient_id, a.id, 'status_changed', jsonb_build_object('status', a.status), a.decided_at
FROM public.authorizations a WHERE a.decided_at IS NOT NULL;
