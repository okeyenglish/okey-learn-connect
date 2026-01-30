import * as React from "react";
import { cn } from "@/lib/utils";

interface MaskedPhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

// Country code configurations
const COUNTRY_CONFIGS: Record<string, { code: string; length: number; format: (digits: string) => string }> = {
  '7': {
    code: '7',
    length: 11,
    format: (digits: string) => {
      // Format: +7 (XXX) XXX-XX-XX
      let formatted = '+7';
      if (digits.length > 1) {
        formatted += ' (' + digits.slice(1, 4);
        if (digits.length >= 4) formatted += ')';
      }
      if (digits.length > 4) formatted += ' ' + digits.slice(4, 7);
      if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
      if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
      return formatted;
    }
  },
  '1': {
    code: '1',
    length: 11,
    format: (digits: string) => {
      // Format: +1 (XXX) XXX-XXXX (US/Canada)
      let formatted = '+1';
      if (digits.length > 1) {
        formatted += ' (' + digits.slice(1, 4);
        if (digits.length >= 4) formatted += ')';
      }
      if (digits.length > 4) formatted += ' ' + digits.slice(4, 7);
      if (digits.length > 7) formatted += '-' + digits.slice(7, 11);
      return formatted;
    }
  },
  '44': {
    code: '44',
    length: 12,
    format: (digits: string) => {
      // Format: +44 XXXX XXX XXX (UK)
      let formatted = '+44';
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 9);
      if (digits.length > 9) formatted += ' ' + digits.slice(9, 12);
      return formatted;
    }
  },
  '49': {
    code: '49',
    length: 13,
    format: (digits: string) => {
      // Format: +49 XXX XXXXXXXX (Germany)
      let formatted = '+49';
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 13);
      return formatted;
    }
  },
  '380': {
    code: '380',
    length: 12,
    format: (digits: string) => {
      // Format: +380 (XX) XXX-XX-XX (Ukraine)
      let formatted = '+380';
      if (digits.length > 3) {
        formatted += ' (' + digits.slice(3, 5);
        if (digits.length >= 5) formatted += ')';
      }
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  '375': {
    code: '375',
    length: 12,
    format: (digits: string) => {
      // Format: +375 (XX) XXX-XX-XX (Belarus)
      let formatted = '+375';
      if (digits.length > 3) {
        formatted += ' (' + digits.slice(3, 5);
        if (digits.length >= 5) formatted += ')';
      }
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  '998': {
    code: '998',
    length: 12,
    format: (digits: string) => {
      // Format: +998 XX XXX-XX-XX (Uzbekistan)
      let formatted = '+998';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  '992': {
    code: '992',
    length: 12,
    format: (digits: string) => {
      // Format: +992 XX XXX-XX-XX (Tajikistan)
      let formatted = '+992';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  '996': {
    code: '996',
    length: 12,
    format: (digits: string) => {
      // Format: +996 XXX XXX-XXX (Kyrgyzstan)
      let formatted = '+996';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 9);
      if (digits.length > 9) formatted += '-' + digits.slice(9, 12);
      return formatted;
    }
  },
};

// Default formatter for unknown country codes
const defaultFormat = (digits: string): string => {
  if (digits.length === 0) return '';
  // Just add + and space every 3-4 digits
  let formatted = '+' + digits.slice(0, 3);
  if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
  if (digits.length > 6) formatted += ' ' + digits.slice(6, 9);
  if (digits.length > 9) formatted += ' ' + digits.slice(9, 12);
  if (digits.length > 12) formatted += ' ' + digits.slice(12, 15);
  return formatted;
};

/**
 * Detects country code from digits
 */
const detectCountryCode = (digits: string): string | null => {
  // Check 3-digit codes first
  if (digits.length >= 3) {
    const threeDigit = digits.slice(0, 3);
    if (COUNTRY_CONFIGS[threeDigit]) return threeDigit;
  }
  // Check 2-digit codes
  if (digits.length >= 2) {
    const twoDigit = digits.slice(0, 2);
    if (COUNTRY_CONFIGS[twoDigit]) return twoDigit;
  }
  // Check 1-digit codes
  if (digits.length >= 1) {
    const oneDigit = digits.slice(0, 1);
    if (COUNTRY_CONFIGS[oneDigit]) return oneDigit;
  }
  return null;
};

/**
 * Formats a phone number string based on detected country code
 */
const formatPhoneInput = (value: string): string => {
  // Remove all non-digits except leading +
  let digits = value.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // Russian-specific: 8 → 7
  if (digits.startsWith('8') && digits.length <= 11) {
    digits = '7' + digits.slice(1);
  }
  
  // Russian-specific: starts with 9 without country code
  if (digits.startsWith('9') && digits.length <= 10) {
    digits = '7' + digits;
  }
  
  // Detect country and apply formatting
  const countryCode = detectCountryCode(digits);
  
  if (countryCode && COUNTRY_CONFIGS[countryCode]) {
    const config = COUNTRY_CONFIGS[countryCode];
    digits = digits.slice(0, config.length);
    return config.format(digits);
  }
  
  // Default: limit to 15 digits and use generic format
  digits = digits.slice(0, 15);
  return defaultFormat(digits);
};

/**
 * Extracts raw digits from formatted phone
 */
export const extractPhoneDigits = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

/**
 * Validates phone number format (any international)
 * Minimum 10 digits, maximum 15 digits
 */
export const isValidPhone = (phone: string): boolean => {
  const digits = extractPhoneDigits(phone);
  return digits.length >= 10 && digits.length <= 15;
};

/**
 * Validates Russian phone number format specifically
 */
export const isValidRussianPhone = (phone: string): boolean => {
  const digits = extractPhoneDigits(phone);
  return digits.length === 11 && digits.startsWith('7');
};

/**
 * Masked phone input component with international support
 * Default format: +7 (XXX) XXX-XX-XX (Russia)
 * Also supports: US, UK, Germany, Ukraine, Belarus, Uzbekistan, Tajikistan, Kyrgyzstan
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
        if (cursorPos > 0 && value) {
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
      // If empty, start with +7 (default to Russia)
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
