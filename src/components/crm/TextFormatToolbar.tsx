import { useState, useEffect, useRef, useCallback } from "react";
import { Bold, Italic, Strikethrough, Underline, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  applyFormat, 
  getAvailableFormats, 
  isFormatSupported,
  FormatType, 
  MessengerType,
  FORMAT_LABELS 
} from "@/utils/messengerFormatting";
import { cn } from "@/lib/utils";

interface TextFormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  messengerType: MessengerType;
  disabled?: boolean;
}

const FORMAT_ICONS: Record<FormatType, React.ReactNode> = {
  bold: <Bold className="h-3.5 w-3.5" />,
  italic: <Italic className="h-3.5 w-3.5" />,
  strikethrough: <Strikethrough className="h-3.5 w-3.5" />,
  underline: <Underline className="h-3.5 w-3.5" />,
  code: <Code className="h-3.5 w-3.5" />,
  monospace: <span className="text-[10px] font-mono">{'{ }'}</span>,
};

export const TextFormatToolbar = ({
  textareaRef,
  value,
  onChange,
  messengerType,
  disabled = false,
}: TextFormatToolbarProps) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);

  // Calculate toolbar position based on selection
  const calculatePosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    const { selectionStart, selectionEnd } = textarea;
    
    // Get textarea position
    const rect = textarea.getBoundingClientRect();
    
    // Create a temporary span to measure text position
    const textBeforeSelection = value.slice(0, selectionStart);
    const lines = textBeforeSelection.split('\n');
    const currentLineIndex = lines.length - 1;
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    
    // Calculate approximate position
    const top = rect.top - 44; // Above the textarea
    const left = Math.max(rect.left, Math.min(rect.left + rect.width / 2 - 100, rect.right - 200));
    
    return { top, left };
  }, [textareaRef, value]);

  // Handle selection change
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;

    const { selectionStart, selectionEnd } = textarea;
    const hasSelection = selectionStart !== selectionEnd;
    
    if (hasSelection && document.activeElement === textarea) {
      setSelection({ start: selectionStart, end: selectionEnd });
      const position = calculatePosition();
      setToolbarPosition(position);
      setShowToolbar(true);
    } else if (!isMouseDownRef.current) {
      setShowToolbar(false);
    }
  }, [textareaRef, disabled, calculatePosition]);

  // Apply format to selected text
  const handleFormat = useCallback((formatType: FormatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const result = applyFormat(
      value,
      selection.start,
      selection.end,
      formatType,
      messengerType
    );

    onChange(result.text);
    
    // Restore selection after React re-render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
      handleSelectionChange();
    }, 0);
  }, [textareaRef, value, selection, messengerType, onChange, handleSelectionChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!textareaRef.current || document.activeElement !== textareaRef.current) return;
    
    const { selectionStart, selectionEnd } = textareaRef.current;
    if (selectionStart === selectionEnd) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (!modifier) return;

    let formatType: FormatType | null = null;

    if (e.key === 'b' || e.key === 'B') formatType = 'bold';
    else if (e.key === 'i' || e.key === 'I') formatType = 'italic';
    else if (e.key === 'u' || e.key === 'U') formatType = 'underline';
    else if (e.key === 'e' || e.key === 'E') formatType = 'code';
    else if ((e.key === 'x' || e.key === 'X') && e.shiftKey) formatType = 'strikethrough';

    if (formatType && isFormatSupported(messengerType, formatType)) {
      e.preventDefault();
      setSelection({ start: selectionStart, end: selectionEnd });
      handleFormat(formatType);
    }
  }, [textareaRef, messengerType, handleFormat]);

  // Set up event listeners
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      setTimeout(handleSelectionChange, 10);
    };

    const handleMouseDown = () => {
      isMouseDownRef.current = true;
    };

    const handleSelect = () => {
      handleSelectionChange();
    };

    textarea.addEventListener('mouseup', handleMouseUp);
    textarea.addEventListener('mousedown', handleMouseDown);
    textarea.addEventListener('select', handleSelect);
    textarea.addEventListener('keyup', handleSelectionChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      textarea.removeEventListener('mouseup', handleMouseUp);
      textarea.removeEventListener('mousedown', handleMouseDown);
      textarea.removeEventListener('select', handleSelect);
      textarea.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [textareaRef, handleSelectionChange, handleKeyDown]);

  // Close toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current && 
        !toolbarRef.current.contains(e.target as Node) &&
        textareaRef.current !== e.target
      ) {
        setShowToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [textareaRef]);

  const availableFormats = getAvailableFormats(messengerType);

  if (!showToolbar || disabled || availableFormats.length === 0) return null;

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "fixed z-50 flex items-center gap-0.5 p-1 bg-popover border rounded-lg shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      style={{
        top: `${toolbarPosition.top}px`,
        left: `${toolbarPosition.left}px`,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      {availableFormats.map((formatType) => (
        <Button
          key={formatType}
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => handleFormat(formatType)}
          title={`${FORMAT_LABELS[formatType].label} (${FORMAT_LABELS[formatType].shortcut})`}
        >
          {FORMAT_ICONS[formatType]}
        </Button>
      ))}
      
      {/* Messenger indicator */}
      <div className="h-4 border-l mx-1" />
      <span className="text-[10px] text-muted-foreground px-1 uppercase">
        {messengerType === 'whatsapp' ? 'WA' : 
         messengerType === 'telegram' ? 'TG' : 
         messengerType === 'max' ? 'MAX' : messengerType}
      </span>
    </div>
  );
};
