/**
 * Smart Replies — contextual cliché suggestions based on last incoming message.
 * Pure client-side logic, no DB calls.
 */

export type SmartReplyCategory = 
  | 'gratitude' 
  | 'greeting' 
  | 'farewell' 
  | 'agreement' 
  | 'apology';

interface SmartReplyRule {
  category: SmartReplyCategory;
  triggers: RegExp;
  replies: string[];
}

const rules: SmartReplyRule[] = [
  {
    category: 'gratitude',
    triggers: /\b(спасибо|благодарю|спс|thanks|thank you|благодарность)\b/i,
    replies: [
      'Всегда рады помочь!',
      'Обращайтесь, если будут вопросы!',
      'Рады были помочь! Хорошего дня!',
    ],
  },
  {
    category: 'greeting',
    triggers: /\b(здравствуйте|добрый день|добрый вечер|доброе утро|привет|hello|hi)\b/i,
    replies: [
      'Здравствуйте! Чем могу помочь?',
      'Добрый день! Слушаю вас',
      'Здравствуйте! Рады вас слышать!',
    ],
  },
  {
    category: 'farewell',
    triggers: /\b(до свидания|пока|всего доброго|хорошего дня|до встречи|bye|goodbye)\b/i,
    replies: [
      'До свидания! Хорошего дня!',
      'Всего доброго! Обращайтесь!',
      'До встречи! Будем рады помочь снова',
    ],
  },
  {
    category: 'agreement',
    triggers: /\b(хорошо|ок|понял|поняла|ладно|договорились|принято|ясно)\b/i,
    replies: [
      'Отлично, договорились!',
      'Если будут вопросы — пишите!',
      'Рады, что смогли помочь!',
    ],
  },
  {
    category: 'apology',
    triggers: /\b(извините|простите|сорри|прошу прощения|sorry)\b/i,
    replies: [
      'Ничего страшного!',
      'Всё в порядке, не переживайте!',
      'Без проблем!',
    ],
  },
];

export function detectCategory(text: string): SmartReplyCategory | null {
  if (!text) return null;
  const normalized = text.trim().toLowerCase();
  for (const rule of rules) {
    if (rule.triggers.test(normalized)) {
      return rule.category;
    }
  }
  return null;
}

export function getSmartReplies(text: string): string[] {
  if (!text) return [];
  const normalized = text.trim().toLowerCase();
  for (const rule of rules) {
    if (rule.triggers.test(normalized)) {
      return rule.replies;
    }
  }
  return [];
}
