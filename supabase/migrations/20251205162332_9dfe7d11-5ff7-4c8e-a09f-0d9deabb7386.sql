-- Add question_parts for questions 11-32 of PLE Mathematics 2015

-- Question 11: Probability problem (192 cars, 5/8 made in Japan)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('8cceb7fe-6d66-465c-b6ba-223995b34985', 'How many cars are not made in Japan?', '72', 2, 0, 'numeric');

-- Question 12: Unit conversion (2.6 kg to 200g packets)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('a5a03567-1739-4893-86ee-7b941314a4de', 'How many packets?', '13', 2, 0, 'numeric');

-- Question 13: Substitution (a=-2, b=3, c=4, find b(a²+c))
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('881b92b5-62ca-4b51-b825-355bf3762789', 'Find the value', '24', 2, 0, 'numeric');

-- Question 14: Binary addition (1101₂ + 111₂)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('0a7a9b29-cc45-4917-bbb5-f5b2e4690fb7', 'Work out', '10100', 2, 0, 'text');

-- Question 15: Angles
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('65123b04-0096-40ba-ba75-ecfbc059c05f', 'Find angle y', '65', 2, 0, 'numeric');

-- Question 16: LCM from Venn diagram (12 and 18)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('a59803fc-4d16-4225-a071-4e75bccc52f2', 'Find the LCM', '36', 2, 0, 'numeric');

-- Question 17: Median (8, 10, 4, 1, 6, 9)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('86283f4e-513f-4585-b452-c9f4289f8848', 'Find the median', '7', 2, 0, 'numeric');

-- Question 18: Ratio (goats:sheep = 3:2, 24 goats)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('2cccd41a-52dc-47cc-a535-91189ed59f43', 'How many sheep?', '16', 2, 0, 'numeric');

-- Question 19: Bucket capacity (3/4 - 4L = 1/2)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('9ac63e24-04bc-40a5-8d31-365217ed771d', 'Capacity of bucket', '16', 2, 0, 'numeric');

-- Question 20: Egg boxes (1008 ÷ 144)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES ('d580660a-67d1-4970-a1d1-054f668d2f0f', 'How many boxes?', '7', 2, 0, 'numeric');

-- Question 21: Venn diagram (multi-part)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('67f37a44-e1c0-439d-b742-a871dd100688', '(a) Complete the Venn diagram', 'Completed diagram with d in intersection', 2, 0, 'open-ended'),
('67f37a44-e1c0-439d-b742-a871dd100688', '(b) Find the value of d if total pupils is 52', '6', 2, 1, 'numeric'),
('67f37a44-e1c0-439d-b742-a871dd100688', '(c) How many pupils play tennis only?', '25', 1, 2, 'numeric');

-- Question 22: Number expansion
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('7766dfdf-bae4-45d7-8fa2-026043b6fe79', '(a) Expand the number', '(6×1000)+(4×100)+(3×10)+(5×1)', 2, 0, 'text'),
('7766dfdf-bae4-45d7-8fa2-026043b6fe79', '(b) Use distributive property', '1680', 3, 1, 'numeric');

-- Question 23: Currency exchange
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('e81436d2-fbd8-48bd-96a6-2a4d398b9bda', '(a) How many US dollars for 1,500,000 UGX?', '500', 2, 0, 'numeric'),
('e81436d2-fbd8-48bd-96a6-2a4d398b9bda', '(b) Convert 250 Euros to UGX', '1,000,000', 3, 1, 'numeric');

-- Question 24: Volume (cylinder to cups)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('292d6497-66a6-42e0-99d0-f3f857cf8278', '(a) Volume of container A', '15400', 2, 0, 'numeric'),
('292d6497-66a6-42e0-99d0-f3f857cf8278', '(b) Volume of cup B', '550', 2, 1, 'numeric'),
('292d6497-66a6-42e0-99d0-f3f857cf8278', '(c) Number of full cups', '28', 1, 2, 'numeric');

-- Question 25: Statistics (mangoes sold)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('71339c85-55dc-41d8-8dba-6d81d7e190d4', '(a) Find the mean', '40', 2, 0, 'numeric'),
('71339c85-55dc-41d8-8dba-6d81d7e190d4', '(b) Find the mode', '35', 1, 1, 'numeric'),
('71339c85-55dc-41d8-8dba-6d81d7e190d4', '(c) Find the range', '32', 2, 2, 'numeric');

-- Question 26: Parallel lines and angles
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('87492c83-1e67-4907-8db7-50576aa81304', '(a) Find angle VTQ', '136', 2, 0, 'numeric'),
('87492c83-1e67-4907-8db7-50576aa81304', '(b) Find angle TQS', '124', 2, 1, 'numeric'),
('87492c83-1e67-4907-8db7-50576aa81304', '(c) Find angle QTV', '44', 1, 2, 'numeric');

-- Question 27: Distance-time problem
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('3c04123d-e1c7-4c80-989c-31002182fd73', '(a) Distance from R to Q', '120', 2, 0, 'numeric'),
('3c04123d-e1c7-4c80-989c-31002182fd73', '(b) Time taken from Q to S', '2', 2, 1, 'numeric'),
('3c04123d-e1c7-4c80-989c-31002182fd73', '(c) Average speed for whole journey', '60', 1, 2, 'numeric');

-- Question 28: Profit and loss
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('b6967624-04a6-46c4-9843-5f1034773acf', '(a) Original cost of radio', '70000', 2, 0, 'numeric'),
('b6967624-04a6-46c4-9843-5f1034773acf', '(b) Price Chebet paid', '72450', 2, 1, 'numeric'),
('b6967624-04a6-46c4-9843-5f1034773acf', '(c) Aguti''s profit', '9450', 1, 2, 'numeric');

-- Question 29: Geometry figure
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('12ddcc9e-a6bc-4da1-a87a-124508a756cf', '(a) Find angle ABC', '90', 2, 0, 'numeric'),
('12ddcc9e-a6bc-4da1-a87a-124508a756cf', '(b) Find the area', '84', 3, 1, 'numeric');

-- Question 30: Tap problem (fill in 2hrs, empty in 3hrs, 1/3 full)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('1303b794-41f6-4220-91d6-52a232573b03', '(a) Fraction filled by F in 1 hour', '1/2', 1, 0, 'text'),
('1303b794-41f6-4220-91d6-52a232573b03', '(b) Fraction emptied by E in 1 hour', '1/3', 1, 1, 'text'),
('1303b794-41f6-4220-91d6-52a232573b03', '(c) Time to fill the tank', '4', 3, 2, 'numeric');

-- Question 31: Geometry set problem
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
VALUES 
('80dbf04b-1dfb-4d8d-9a98-e62ca7f2201a', '(a) Cost of fountain pen', '600', 2, 0, 'numeric'),
('80dbf04b-1dfb-4d8d-9a98-e62ca7f2201a', '(b) Cost of book', '1200', 2, 1, 'numeric'),
('80dbf04b-1dfb-4d8d-9a98-e62ca7f2201a', '(c) Total cost of all three', '2400', 1, 2, 'numeric');

-- Add Question 32 if it doesn't exist
INSERT INTO questions (exam_id, question_number, text)
VALUES ('71518a6f-3d21-4f15-bd35-276aa21a83d4', 32, 'A school has 480 pupils. 3/8 of them are girls. 1/4 of the girls and 1/3 of the boys are boarders.')
ON CONFLICT DO NOTHING;

-- Get question 32 ID and add parts (will use subquery)
INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
SELECT id, '(a) How many girls are in the school?', '180', 2, 0, 'numeric'
FROM questions WHERE exam_id = '71518a6f-3d21-4f15-bd35-276aa21a83d4' AND question_number = 32;

INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
SELECT id, '(b) How many boys are boarders?', '100', 2, 1, 'numeric'
FROM questions WHERE exam_id = '71518a6f-3d21-4f15-bd35-276aa21a83d4' AND question_number = 32;

INSERT INTO question_parts (question_id, text, answer, marks, order_index, answer_type)
SELECT id, '(c) How many day scholars are in the school?', '335', 1, 2, 'numeric'
FROM questions WHERE exam_id = '71518a6f-3d21-4f15-bd35-276aa21a83d4' AND question_number = 32;