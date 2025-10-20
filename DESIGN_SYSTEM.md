# O'KEY ENGLISH CRM - Design System Guide

## 🎨 Обновленная дизайн-система

Дизайн-система обновлена согласно современным принципам минимализма, консистентности и accessibility.

---

## 1. Цветовые токены

### Surfaces (Поверхности)
```css
bg-bg              /* Основной фон приложения */
bg-bg-soft         /* Мягкий фон для разделения */
bg-surface         /* Поверхность карточек, модалов */
bg-surface-alt     /* Альтернативная поверхность (hover) */
```

### Text (Текст)
```css
text-text-primary     /* Основной текст (заголовки, важное) */
text-text-secondary   /* Вторичный текст (лейблы, метаданные) */
text-text-muted       /* Приглушенный текст (хинты, плейсхолдеры) */
```

### Brand (Бренд)
```css
bg-brand          /* Основной бренд-цвет (кнопки, акценты) */
bg-brand-600      /* Темнее для hover состояний */
bg-brand-100      /* Светлый для фонов бейджей */
```

### Status Colors (Статусы)
```css
/* Success - Зеленый */
bg-success-100 text-success-600    /* Для бейджей */
bg-success-600                      /* Для элементов */

/* Warning - Янтарный */
bg-warning-100 text-warning-600    /* Для бейджей */
bg-warning-600                      /* Для элементов */

/* Danger - Красный */
bg-danger-100 text-danger-600      /* Для бейджей */
bg-danger-600                       /* Для элементов */

/* Info - Синий */
bg-info-100 text-info-600          /* Для бейджей */
bg-info-600                         /* Для элементов */

/* Neutral - Серый */
bg-neutral-100 text-neutral-500    /* Для бейджей */
bg-neutral-500                      /* Для элементов */
```

---

## 2. Компоненты

### Кнопки

#### Primary (Основная)
```tsx
<button className="btn-primary">
  Добавить студента
</button>
```
- Используется для главного действия на странице
- **Правило**: только ОДНА primary кнопка на блок/экран

#### Secondary (Вторичная)
```tsx
<button className="btn-secondary">
  Отмена
</button>
```
- Для вторичных действий
- Контур вместо заливки

#### Tertiary (Третичная)
```tsx
<button className="btn-tertiary">
  Подробнее
</button>
```
- Для менее важных действий
- Только текст, без контура

### Карточки

#### Elevated Card
```tsx
<div className="card-elevated">
  <h3 className="text-lg font-semibold text-text-primary">Заголовок</h3>
  <p className="text-sm text-text-secondary">Описание</p>
</div>
```
- Тень `elev-2`
- Hover эффект с `elev-3`

#### Base Card
```tsx
<div className="card-base">
  {/* Контент */}
</div>
```
- Тонкий бордер
- Без тени

### Status Badges (Бейджи)

```tsx
<span className="badge-success">
  ✓ Оплачено
</span>

<span className="badge-warning">
  ⚠ Ожидает
</span>

<span className="badge-danger">
  ✗ Просрочено
</span>

<span className="badge-info">
  ℹ Новое
</span>

<span className="badge-neutral">
  — Черновик
</span>
```

---

## 3. Отступы и размеры

### Spacing Scale
```css
p-1  /* 4px */
p-2  /* 8px */
p-3  /* 12px */
p-4  /* 16px */
p-5  /* 20px */
p-6  /* 24px */
p-8  /* 32px */
```

### Радиусы
```css
rounded-sm   /* 4px - маленькие элементы */
rounded      /* 8px - базовый */
rounded-md   /* 12px - карточки */
rounded-xl   /* 20px - модали, большие блоки */
```

### Тени
```css
shadow-elev-1   /* Лёгкая тень (y=1, blur=4) */
shadow-elev-2   /* Средняя тень (y=4, blur=16) */
shadow-elev-3   /* Тяжёлая тень (y=8, blur=32) */
```

---

## 4. Типографика

### Заголовки
```tsx
<h1 className="text-2xl font-semibold text-text-primary">H1 - 24px</h1>
<h2 className="text-xl font-semibold text-text-primary">H2 - 20px</h2>
<h3 className="text-lg font-semibold text-text-primary">H3 - 18px</h3>
<h4 className="text-base font-semibold text-text-primary">H4 - 16px</h4>
```

### Контент
```tsx
<p className="text-base text-text-primary">Основной текст - 16px</p>
<p className="text-sm text-text-secondary">Вторичный текст - 14px</p>
<p className="text-xs text-text-muted">Маленький текст - 12px</p>
```

---

## 5. Состояния и анимации

### Interactive States
```tsx
<button className="btn-primary">
  {/* Автоматически включает:
    - hover:bg-brand-600
    - active:scale-[0.98]
    - focus-visible:ring-2 ring-brand
    - disabled:opacity-50
  */}
  Кнопка
</button>
```

### Анимации
```css
animate-fade-in         /* Плавное появление */
animate-fade-out        /* Плавное исчезновение */
animate-scale-in        /* Увеличение при появлении */
animate-scale-out       /* Уменьшение при исчезновении */
animate-slide-in-right  /* Слайд справа */
animate-slide-out-right /* Слайд вправо */
animate-enter           /* Комбинация fade + scale in */
animate-exit            /* Комбинация fade + scale out */
```

### Утилиты
```css
hover-scale    /* Лёгкое увеличение на hover */
focus-ring     /* Стандартное ring на focus */
```

---

## 6. Паттерны использования

### Таблица расписания
```tsx
<div className="bg-surface rounded-lg border border-border/50">
  <div className="p-4 border-b border-border/50">
    <h3 className="text-lg font-semibold text-text-primary">Расписание</h3>
  </div>
  <div className="p-4">
    {/* Таблица */}
  </div>
</div>
```

### Модальное окно
```tsx
<DialogContent className="bg-surface rounded-xl p-6 shadow-elev-3">
  <DialogHeader>
    <DialogTitle className="text-xl font-semibold text-text-primary">
      Заголовок
    </DialogTitle>
  </DialogHeader>
  {/* Контент */}
</DialogContent>
```

### Форма
```tsx
<form className="space-y-4">
  <div className="space-y-2">
    <Label className="text-sm font-medium text-text-secondary">
      Имя студента
    </Label>
    <Input 
      className="h-10 px-3 bg-surface border-border focus-visible:ring-2 focus-visible:ring-brand"
    />
    <p className="text-xs text-text-muted">Введите полное имя</p>
  </div>
</form>
```

---

## 7. Accessibility Checklist

- ✅ Контраст текста ≥ 4.5:1 (WCAG AA)
- ✅ `focus-visible` на всех интерактивных элементах
- ✅ Touch targets ≥ 44×44px
- ✅ Клавиатурная навигация (Tab, Enter, Esc)
- ✅ Читаемые сообщения об ошибках
- ✅ Aria-labels для иконочных кнопок

---

## 8. Примеры "до/после"

### До (старый стиль)
```tsx
<button className="bg-red-500 text-white border-2 border-red-700 px-6 py-3 rounded font-bold">
  Удалить
</button>
```

### После (новый стиль)
```tsx
<button className="btn-secondary text-danger-600 border-danger-600 hover:bg-danger-100">
  Удалить
</button>
```

---

## 9. Частые ошибки

❌ **НЕ ДЕЛАЙТЕ:**
```tsx
<div className="bg-white text-black border-2 border-red-500">
  {/* Хардкод цветов */}
</div>
```

✅ **ДЕЛАЙТЕ:**
```tsx
<div className="bg-surface text-text-primary border border-danger-600/50">
  {/* Семантические токены */}
</div>
```

---

## 10. Быстрый старт для новых компонентов

1. Используйте `bg-surface` для фонов
2. Используйте `text-text-primary/secondary/muted` для текста
3. Используйте `btn-primary/secondary/tertiary` для кнопок
4. Используйте `badge-*` для статусов
5. Добавьте `focus-ring` на интерактивные элементы
6. Используйте `shadow-elev-*` вместо кастомных теней
7. Используйте spacing scale (4, 8, 12, 16, 24, 32)
8. Добавьте анимации (`animate-fade-in`, `hover-scale`)

---

## 11. Полезные ссылки

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
