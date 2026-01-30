import * as React from "react";
import { cn } from "@/lib/utils";

interface MaskedPhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Formats a phone number string as +7 (XXX) XXX-XX-XX
 * Handles input dynamically as user types
 */
const formatPhoneInput = (value: string): string => {
  // Remove all non-digits
  let digits = value.replace(/\D/g, '');
  
  // If starts with 8, replace with 7
  if (digits.startsWith('8') && digits.length > 0) {
    digits = '7' + digits.slice(1);
  }
  
  // If starts with 9 (without country code), prepend 7
  if (digits.startsWith('9') && digits.length <= 10) {
    digits = '7' + digits;
  }
  
  // Limit to 11 digits (7 + 10 digits)
  digits = digits.slice(0, 11);
  
  // Build formatted string progressively
  if (digits.length === 0) return '';
  
  let formatted = '+7';
  
  if (digits.length > 1) {
    formatted += ' (' + digits.slice(1, 4);
    if (digits.length >= 4) {
      formatted += ')';
    }
  }
  
  if (digits.length > 4) {
    formatted += ' ' + digits.slice(4, 7);
  }
  
  if (digits.length > 7) {
    formatted += '-' + digits.slice(7, 9);
  }
  
  if (digits.length > 9) {
    formatted += '-' + digits.slice(9, 11);
  }
  
  return formatted;
};

/**
 * Extracts raw digits from formatted phone
 */
export const extractPhoneDigits = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

/**
 * Validates Russian phone number format
 */
export const isValidRussianPhone = (phone: string): boolean => {
  const digits = extractPhoneDigits(phone);
  return digits.length === 11 && digits.startsWith('7');
};

/**
 * Masked phone input component for Russian phone numbers
 * Format: +7 (XXX) XXX-XX-XX
 */
const MaskedPhoneInput = React.forwardRef<HTMLInputElement, MaskedPhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatPhoneInput(rawValue);
      onChange(formatted);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace to work properly
      if (e.key === 'Backspace') {
        const input = e.currentTarget;
        const cursorPos = input.selectionStart || 0;
        
        // If cursor is right after a formatting character, skip it
        if (cursorPos > 0) {
          const charBefore = value[cursorPos - 1];
          if (charBefore === ' ' || charBefore === '(' || charBefore === ')' || charBefore === '-') {
            e.preventDefault();
            // Remove the digit before the formatting character
            const digits = extractPhoneDigits(value);
            const newDigits = digits.slice(0, -1);
            onChange(formatPhoneInput(newDigits));
          }
        }
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // If empty, start with +7
      if (!value) {
        onChange('+7');
      }
      props.onFocus?.(e);
    };

    return (
      <input
        type="tel"
        inputMode="tel"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder="+7 (___) ___-__-__"
        {...props}
      />
    );
  }
);
MaskedPhoneInput.displayName = "MaskedPhoneInput";

export { MaskedPhoneInput, formatPhoneInput };
