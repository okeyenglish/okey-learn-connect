// Messenger text formatting utilities
// Different messengers use different syntax for formatting

export type MessengerType = 'whatsapp' | 'telegram' | 'max' | 'vk' | 'viber';

export type FormatType = 'bold' | 'italic' | 'strikethrough' | 'underline' | 'code' | 'monospace';

// Formatting syntax by messenger
// Telegram: intended for MarkdownV2 (bold/italic/underline/strikethrough)
const FORMATTING_SYNTAX: Record<MessengerType, Record<FormatType, { prefix: string; suffix: string }>> = {
  telegram: {
    bold: { prefix: '*', suffix: '*' },
    italic: { prefix: '_', suffix: '_' },
    strikethrough: { prefix: '~', suffix: '~' },
    underline: { prefix: '__', suffix: '__' },
    code: { prefix: '`', suffix: '`' },
    monospace: { prefix: '```', suffix: '```' },
  },
  whatsapp: {
    bold: { prefix: '*', suffix: '*' },
    italic: { prefix: '_', suffix: '_' },
    strikethrough: { prefix: '~', suffix: '~' },
    underline: { prefix: '', suffix: '' }, // WhatsApp doesn't support underline
    code: { prefix: '`', suffix: '`' },
    monospace: { prefix: '```', suffix: '```' },
  },
  max: {
    // Max uses Markdown-like syntax
    bold: { prefix: '**', suffix: '**' },
    italic: { prefix: '_', suffix: '_' },
    strikethrough: { prefix: '~~', suffix: '~~' },
    underline: { prefix: '', suffix: '' }, // Max doesn't support underline natively
    code: { prefix: '`', suffix: '`' },
    monospace: { prefix: '```', suffix: '```' },
  },
  vk: {
    // VK uses different syntax
    bold: { prefix: '**', suffix: '**' },
    italic: { prefix: '*', suffix: '*' },
    strikethrough: { prefix: '', suffix: '' }, // VK doesn't support strikethrough
    underline: { prefix: '', suffix: '' },
    code: { prefix: '`', suffix: '`' },
    monospace: { prefix: '```', suffix: '```' },
  },
  viber: {
    // Viber has limited formatting support
    bold: { prefix: '*', suffix: '*' },
    italic: { prefix: '_', suffix: '_' },
    strikethrough: { prefix: '~', suffix: '~' },
    underline: { prefix: '', suffix: '' },
    code: { prefix: '', suffix: '' },
    monospace: { prefix: '', suffix: '' },
  },
};

// Check if a format is supported by a messenger
export function isFormatSupported(messengerType: MessengerType, formatType: FormatType): boolean {
  const syntax = FORMATTING_SYNTAX[messengerType]?.[formatType];
  return !!(syntax?.prefix || syntax?.suffix);
}

// Get available formats for a messenger
export function getAvailableFormats(messengerType: MessengerType): FormatType[] {
  const formats: FormatType[] = ['bold', 'italic', 'strikethrough', 'underline', 'code', 'monospace'];
  return formats.filter(format => isFormatSupported(messengerType, format));
}

// Apply formatting to selected text
export function applyFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  formatType: FormatType,
  messengerType: MessengerType
): { text: string; newSelectionStart: number; newSelectionEnd: number } {
  const syntax = FORMATTING_SYNTAX[messengerType]?.[formatType];
  
  if (!syntax || (!syntax.prefix && !syntax.suffix)) {
    // Format not supported, return unchanged
    return { text, newSelectionStart: selectionStart, newSelectionEnd: selectionEnd };
  }
  
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);
  
  // Check if already formatted (toggle off)
  if (selected.startsWith(syntax.prefix) && selected.endsWith(syntax.suffix)) {
    // Remove formatting
    const unformatted = selected.slice(syntax.prefix.length, -syntax.suffix.length || undefined);
    const newText = before + unformatted + after;
    return {
      text: newText,
      newSelectionStart: selectionStart,
      newSelectionEnd: selectionStart + unformatted.length,
    };
  }
  
  // Check if the selection is wrapped in formatting markers outside
  if (
    before.endsWith(syntax.prefix) && 
    after.startsWith(syntax.suffix)
  ) {
    // Remove formatting from outside
    const newBefore = before.slice(0, -syntax.prefix.length);
    const newAfter = after.slice(syntax.suffix.length);
    const newText = newBefore + selected + newAfter;
    return {
      text: newText,
      newSelectionStart: newBefore.length,
      newSelectionEnd: newBefore.length + selected.length,
    };
  }
  
  // Apply formatting
  const formatted = syntax.prefix + selected + syntax.suffix;
  const newText = before + formatted + after;
  
  return {
    text: newText,
    newSelectionStart: selectionStart,
    newSelectionEnd: selectionStart + formatted.length,
  };
}

// Format labels for UI
export const FORMAT_LABELS: Record<FormatType, { label: string; icon: string; shortcut: string }> = {
  bold: { label: 'Жирный', icon: 'B', shortcut: '⌘B' },
  italic: { label: 'Курсив', icon: 'I', shortcut: '⌘I' },
  strikethrough: { label: 'Зачёркнутый', icon: 'S', shortcut: '⌘⇧X' },
  underline: { label: 'Подчёркнутый', icon: 'U', shortcut: '⌘U' },
  code: { label: 'Код', icon: '</>', shortcut: '⌘E' },
  monospace: { label: 'Моноширинный', icon: '{ }', shortcut: '⌘⇧M' },
};
