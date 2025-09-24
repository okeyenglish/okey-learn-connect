import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  ru: {
    // Header
    'course.units': 'юнитов',
    'course.lessons': 'уроков',
    
    // Tabs
    'tabs.planning': 'Планирование',
    'tabs.materials': 'Материалы',
    'tabs.trainers': 'Тренажёры',
    
    // Planning tab
    'planning.courseStructure': 'Структура курса',
    'planning.unit': 'Юнит',
    'planning.lessons': 'уроков',
    'planning.vocabulary': 'Лексика:',
    'planning.grammar': 'Грамматика:',
    'planning.lessonsTitle': 'Уроки:',
    'planning.lesson': 'Урок',
    'planning.goals': 'Цели:',
    'planning.materials': 'Материалы:',
    
    // Materials tab
    'materials.title': 'Учебные материалы',
    
    // Trainers tab
    'trainers.title': 'Тренажёры и интерактивы',
    'trainers.open': 'Открыть',
    'trainers.setup': 'Настроить',
    'trainers.interactive': 'Интерактивные тренажёры:',
    'trainers.vocabularyFlashcards': 'Vocabulary Flashcards',
    'trainers.vocabularyFlashcardsDesc': 'Интерактивные карточки для изучения новых слов',
    'trainers.wordAssociation': 'Word Association',
    'trainers.wordAssociationDesc': 'Игра на сопоставление слов с переводами',
    'trainers.sentenceBuilder': 'Sentence Builder',
    'trainers.sentenceBuilderDesc': 'Составление предложений из слов',
    'trainers.spellingChallenge': 'Spelling Challenge',
    'trainers.spellingChallengeDesc': 'Тренировка правописания английских слов',
    'trainers.memoryMatch': 'Memory Match',
    'trainers.memoryMatchDesc': 'Игра на запоминание - поиск пар слов',
    
    // Materials list
    'materials.pupilsBook': 'Основной учебник для ученика',
    'materials.activityBook': 'Рабочая тетрадь с упражнениями',
    'materials.teachersBook': 'Методическое пособие для учителя',
    'materials.audio': 'Песни, истории, упражнения на слух',
    'materials.video': 'Обучающие видео и мультфильмы',
    'materials.interactive': 'Интерактивные игры и упражнения',
    
    // Lesson modal
    'lesson.goals': 'Цели урока:',
    'lesson.materials': 'Материалы:',
    'lesson.structure': 'Поминутная структура (80 минут):',
    'lesson.homework': 'Домашнее задание:',
    'lesson.topics': 'Темы урока:',
    'lesson.activities': 'Активности:',
    'lesson.vocabulary': 'Лексика:',
    'lesson.grammar': 'Грамматика:',
    
    // Loading and error states
    'loading.course': 'Загрузка курса...',
    'error.notFound': 'Курс не найден',
    'error.notFoundDesc': 'Запрошенный курс не существует',
    'button.backToCourses': 'Вернуться к курсам',
    'select.chooseCourse': 'Выберите курс',
  },
  en: {
    // Header
    'course.units': 'units',
    'course.lessons': 'lessons',
    
    // Tabs
    'tabs.planning': 'Planning',
    'tabs.materials': 'Materials',
    'tabs.trainers': 'Trainers',
    
    // Planning tab
    'planning.courseStructure': 'Course Structure',
    'planning.unit': 'Unit',
    'planning.lessons': 'lessons',
    'planning.vocabulary': 'Vocabulary:',
    'planning.grammar': 'Grammar:',
    'planning.lessonsTitle': 'Lessons:',
    'planning.lesson': 'Lesson',
    'planning.goals': 'Goals:',
    'planning.materials': 'Materials:',
    
    // Materials tab
    'materials.title': 'Learning Materials',
    
    // Trainers tab
    'trainers.title': 'Trainers and Interactive Content',
    'trainers.open': 'Open',
    'trainers.setup': 'Setup',
    'trainers.interactive': 'Interactive Trainers:',
    'trainers.vocabularyFlashcards': 'Vocabulary Flashcards',
    'trainers.vocabularyFlashcardsDesc': 'Interactive cards for learning new words',
    'trainers.wordAssociation': 'Word Association',
    'trainers.wordAssociationDesc': 'Match words with their translations',
    'trainers.sentenceBuilder': 'Sentence Builder',
    'trainers.sentenceBuilderDesc': 'Build sentences using given words',
    'trainers.spellingChallenge': 'Spelling Challenge',
    'trainers.spellingChallengeDesc': 'Practice spelling English words',
    'trainers.memoryMatch': 'Memory Match',
    'trainers.memoryMatchDesc': 'Memory game - find matching word pairs',
    
    // Materials list
    'materials.pupilsBook': 'Main student textbook',
    'materials.activityBook': 'Workbook with exercises',
    'materials.teachersBook': 'Teacher\'s methodological guide',
    'materials.audio': 'Songs, stories, listening exercises',
    'materials.video': 'Educational videos and cartoons',
    'materials.interactive': 'Interactive games and exercises',
    
    // Lesson modal
    'lesson.goals': 'Lesson Goals:',
    'lesson.materials': 'Materials:',
    'lesson.structure': 'Minute Structure (80 minutes):',
    'lesson.homework': 'Homework:',
    'lesson.topics': 'Lesson Topics:',
    'lesson.activities': 'Activities:',
    'lesson.vocabulary': 'Vocabulary:',
    'lesson.grammar': 'Grammar:',
    
    // Loading and error states
    'loading.course': 'Loading course...',
    'error.notFound': 'Course not found',
    'error.notFoundDesc': 'The requested course does not exist',
    'button.backToCourses': 'Back to courses',
    'select.chooseCourse': 'Choose course',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ru');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['ru']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}