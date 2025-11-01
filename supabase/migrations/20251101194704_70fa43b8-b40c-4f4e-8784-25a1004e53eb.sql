-- Расширяем список разрешенных типов приложений
-- Удаляем старое ограничение
ALTER TABLE apps DROP CONSTRAINT IF EXISTS apps_kind_check;

-- Добавляем новое ограничение с полным списком типов
ALTER TABLE apps ADD CONSTRAINT apps_kind_check 
  CHECK (kind IN (
    'quiz',
    'game', 
    'flashcards',
    'matching',
    'wordSearch',
    'fillInBlanks',
    'memory',
    'dragAndDrop',
    'test',
    'crossword',
    'typing',
    'exercise',
    'other'
  ));