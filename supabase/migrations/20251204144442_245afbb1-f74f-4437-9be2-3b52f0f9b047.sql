-- Insert question parts for the PLE Mathematics 2015 exam questions
-- Each question needs at least one part to be answerable

INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
SELECT 
  q.id,
  q.text,
  CASE q.question_number
    WHEN 1 THEN '79'
    WHEN 2 THEN '80010'
    WHEN 3 THEN '3x - 35'
    WHEN 4 THEN '16'
    WHEN 5 THEN '10'
    WHEN 6 THEN '30'
    WHEN 7 THEN '7/3'
    WHEN 8 THEN '7:15 p.m.'
    WHEN 9 THEN '4 lines of symmetry'
    WHEN 10 THEN '31600'
    ELSE 'Answer not provided'
  END as answer,
  CASE 
    WHEN q.question_number <= 20 THEN 2
    ELSE 5
  END as marks,
  0 as order_index,
  CASE 
    WHEN q.question_number IN (1, 2, 4, 5, 6, 10) THEN 'numeric'::answer_type
    ELSE 'text'::answer_type
  END as answer_type
FROM questions q
WHERE q.exam_id = '71518a6f-3d21-4f15-bd35-276aa21a83d4'
  AND q.question_number <= 10
  AND NOT EXISTS (SELECT 1 FROM question_parts qp WHERE qp.question_id = q.id);