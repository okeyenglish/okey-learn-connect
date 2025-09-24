-- Изменяем типы колонок с JSONB на TEXT для удобства работы с предоставленными данными
ALTER TABLE unit_lessons 
ALTER COLUMN materials TYPE TEXT,
ALTER COLUMN topics TYPE TEXT,
ALTER COLUMN vocabulary TYPE TEXT,
ALTER COLUMN grammar TYPE TEXT,
ALTER COLUMN activities TYPE TEXT;

-- Добавляем все уроки Unit 1 (уроки 1-7)
INSERT INTO unit_lessons (unit_id, lesson_number, title, goals, materials, structure, homework, sort_order) VALUES
('3900f5c9-b358-43e7-85f9-0baf99d0ac6b', 1, 'Meeting the Star family', 'приветствия; имена персонажей; числа/цвета', 'PB Unit 1; AB Unit 1; TB Unit 1; Audio (song); KB1 интерактив', '0–5: ДЗ-чек/повтор (имена, цвета). 5–15: Разминка — ball name game; приветствие по кругу. 15–30: Презентация — герои Star family (картинка/слайд), числа/цвета. 30–50: Практика — bingo (числа/цвета), TPR «show the colour/number». 50–70: Коммуникативное — песня «Hello» + жесты; мини-диалоги «My name is…». 70–80: Закрепление — карточки с именами → сопоставить; объяснить ДЗ.', 'AB — раскрасить лист; выучить имена персонажей', 1),

('3900f5c9-b358-43e7-85f9-0baf99d0ac6b', 2, 'Where is it? (in/on/under)', 'предлоги места; понимание инструкций', 'PB Unit 1; AB Unit 1; TB; Audio (short dialogue); KB1 game', '0–5: ДЗ-чек (имена/цвета). 5–15: Разминка — «Simon says» с предметами класса. 15–30: Презентация — in/on/under с реальными объектами/картинками. 30–50: Практика — «Where''s the teddy?» (прячем/находим); парная Q&A. 50–70: Коммуникативное — мини-квест в классе по подсказкам учителя. 70–80: Закрепление — краткий воркбук/AB упражнение; объяснить ДЗ.', 'Нарисовать свою комнату и подписать предметы (in/on/under)', 2),

('3900f5c9-b358-43e7-85f9-0baf99d0ac6b', 3, 'Family and age', 'семья; How old are you?; числа 1–10 повтор', 'PB/AB Unit 1; TB; Age cards; KB1', '0–5: ДЗ-чек (комната/подписи). 5–15: Разминка — счёт по кругу, «clap on 5/10». 15–30: Презентация — семейные отношения; вопрос «How old are you?». 30–50: Практика — карточки возрастов; парные диалоги. 50–70: Коммуникативное — «Find someone who» (роль в семье). 70–80: Закрепление — мини-рисунок «My family» + подписи; ДЗ.', 'AB — упражнение по семье/возрасту', 3),

('3900f5c9-b358-43e7-85f9-0baf99d0ac6b', 4, 'Classroom commands & objects', 'команды учителя; предметы класса; вежливые просьбы', 'PB/AB Unit 1; TB; Flashcards; KB1', '0–5: ДЗ-чек. 5–15: Разминка — chant с действиями: sit down, stand up, open your book. 15–30: Презентация — предметы класса; this is a… 30–50: Практика — charades/flashcard race. 50–70: Коммуникативное — парные инструкции «Please, open/close…». 70–80: Закрепление — короткий worksheet; ДЗ.', 'KB1 — игры Unit 1 (повтор слов)', 4),

('3900f5c9-b358-43e7-85f9-0baf99d0ac6b', 5, 'Colours & numbers (revision)', 'систематизация цветов/чисел; аудирование/игры', 'PB/AB; TB; Audio (songs); KB1', '0–5: ДЗ-чек. 5–15: Разминка — colour song + TPR. 15–30: Презентация — code puzzles (число+цвет). 30–50: Практика — station games (счёт/цвет). 50–70: Коммуникативное — human number line, команды «Stand at 7». 70–80: Закрепление — мини-квиз; ДЗ.', 'KB1 — интерактивное упражнение', 5),

('3900f5c9-b358-43e7-85f9-0baf99d0ac6b', 6, 'Story: Toys in the toy box', 'аудирование истории; последовательность; роли', 'Story Unit 1; masks; KB1 Stories; AB', '0–5: ДЗ-чек. 5–15: Разминка — «story words» (предварительная лексика). 15–30: Презентация — просмотр/прослушивание истории. 30–50: Практика — расставить кадры по порядку; true/false. 50–70: Коммуникативное — acting с масками (короткие роли). 70–80: Закрепление — AB story sequence; ДЗ.', 'Повторить лексику/песни на KB1', 6),

('3900f5c9-b358-43e7-85f9-0baf99d0ac6b', 7, 'Unit 1 Revision & Assessment', 'проверка понимания; игровое повторение', 'Mini-test; flashcards; KB1 games', '0–5: ДЗ-чек. 5–15: Разминка — «quiz warm-up». 15–30: Презентация — нет нового (инструктаж к тесту). 30–50: Практика — мини-тест (слова/структуры). 50–70: Коммуникативное — «create a dialogue» (greetings+in/on/under). 70–80: Закрепление — фидбек, цель следующего юнита; ДЗ.', 'нет (готовимся к Unit 2)', 7);