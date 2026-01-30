import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MaskedPhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

// Country configurations with flags
interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  length: number;
  format: (digits: string) => string;
}

const COUNTRIES: CountryConfig[] = [
  {
    code: '7',
    name: 'Россия',
    flag: '🇷🇺',
    length: 11,
    format: (digits: string) => {
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
  {
    code: '1',
    name: 'США / Канада',
    flag: '🇺🇸',
    length: 11,
    format: (digits: string) => {
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
  {
    code: '44',
    name: 'Великобритания',
    flag: '🇬🇧',
    length: 12,
    format: (digits: string) => {
      let formatted = '+44';
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 9);
      if (digits.length > 9) formatted += ' ' + digits.slice(9, 12);
      return formatted;
    }
  },
  {
    code: '49',
    name: 'Германия',
    flag: '🇩🇪',
    length: 13,
    format: (digits: string) => {
      let formatted = '+49';
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 13);
      return formatted;
    }
  },
  {
    code: '33',
    name: 'Франция',
    flag: '🇫🇷',
    length: 11,
    format: (digits: string) => {
      let formatted = '+33';
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 3);
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
      if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
      if (digits.length > 9) formatted += ' ' + digits.slice(9, 11);
      return formatted;
    }
  },
  {
    code: '380',
    name: 'Украина',
    flag: '🇺🇦',
    length: 12,
    format: (digits: string) => {
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
  {
    code: '375',
    name: 'Беларусь',
    flag: '🇧🇾',
    length: 12,
    format: (digits: string) => {
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
  {
    code: '998',
    name: 'Узбекистан',
    flag: '🇺🇿',
    length: 12,
    format: (digits: string) => {
      let formatted = '+998';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  {
    code: '992',
    name: 'Таджикистан',
    flag: '🇹🇯',
    length: 12,
    format: (digits: string) => {
      let formatted = '+992';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  {
    code: '996',
    name: 'Кыргызстан',
    flag: '🇰🇬',
    length: 12,
    format: (digits: string) => {
      let formatted = '+996';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 9);
      if (digits.length > 9) formatted += '-' + digits.slice(9, 12);
      return formatted;
    }
  },
  {
    code: '993',
    name: 'Туркменистан',
    flag: '🇹🇲',
    length: 11,
    format: (digits: string) => {
      let formatted = '+993';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 11);
      return formatted;
    }
  },
  {
    code: '994',
    name: 'Азербайджан',
    flag: '🇦🇿',
    length: 12,
    format: (digits: string) => {
      let formatted = '+994';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  {
    code: '995',
    name: 'Грузия',
    flag: '🇬🇪',
    length: 12,
    format: (digits: string) => {
      let formatted = '+995';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 10);
      if (digits.length > 10) formatted += '-' + digits.slice(10, 12);
      return formatted;
    }
  },
  {
    code: '374',
    name: 'Армения',
    flag: '🇦🇲',
    length: 11,
    format: (digits: string) => {
      let formatted = '+374';
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += '-' + digits.slice(8, 11);
      return formatted;
    }
  },
  {
    code: '90',
    name: 'Турция',
    flag: '🇹🇷',
    length: 12,
    format: (digits: string) => {
      let formatted = '+90';
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 8);
      if (digits.length > 8) formatted += ' ' + digits.slice(8, 10);
      if (digits.length > 10) formatted += ' ' + digits.slice(10, 12);
      return formatted;
    }
  },
];

// Build lookup map for quick access
const COUNTRY_MAP: Record<string, CountryConfig> = {};
COUNTRIES.forEach(c => { COUNTRY_MAP[c.code] = c; });

// Default formatter for unknown country codes
const defaultFormat = (digits: string): string => {
  if (digits.length === 0) return '';
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
    if (COUNTRY_MAP[threeDigit]) return threeDigit;
  }
  // Check 2-digit codes
  if (digits.length >= 2) {
    const twoDigit = digits.slice(0, 2);
    if (COUNTRY_MAP[twoDigit]) return twoDigit;
  }
  // Check 1-digit codes
  if (digits.length >= 1) {
    const oneDigit = digits.slice(0, 1);
    if (COUNTRY_MAP[oneDigit]) return oneDigit;
  }
  return null;
};

/**
 * Formats a phone number string based on detected country code
 */
const formatPhoneInput = (value: string): string => {
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
  
  const countryCode = detectCountryCode(digits);
  
  if (countryCode && COUNTRY_MAP[countryCode]) {
    const config = COUNTRY_MAP[countryCode];
    digits = digits.slice(0, config.length);
    return config.format(digits);
  }
  
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
 * Masked phone input component with country selector
 */
const MaskedPhoneInput = React.forwardRef<HTMLInputElement, MaskedPhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    
    // Detect current country from value
    const digits = extractPhoneDigits(value);
    const detectedCode = detectCountryCode(digits);
    const currentCountry = detectedCode ? COUNTRY_MAP[detectedCode] : COUNTRIES[0];
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatPhoneInput(rawValue);
      onChange(formatted);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        const input = e.currentTarget;
        const cursorPos = input.selectionStart || 0;
        
        if (cursorPos > 0 && value) {
          const charBefore = value[cursorPos - 1];
          if (charBefore === ' ' || charBefore === '(' || charBefore === ')' || charBefore === '-') {
            e.preventDefault();
            const newDigits = digits.slice(0, -1);
            onChange(formatPhoneInput(newDigits));
          }
        }
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!value) {
        onChange('+7');
      }
      props.onFocus?.(e);
    };

    const handleCountrySelect = (country: CountryConfig) => {
      // Keep local digits after country code, or start fresh
      const currentDigits = extractPhoneDigits(value);
      const currentCode = detectCountryCode(currentDigits);
      
      let localPart = '';
      if (currentCode) {
        localPart = currentDigits.slice(currentCode.length);
      }
      
      const newDigits = country.code + localPart;
      const formatted = country.format(newDigits);
      onChange(formatted);
      setIsOpen(false);
    };

    return (
      <div className="flex">
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1 px-2 h-10 rounded-l-md border border-r-0 border-input bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors",
                "text-sm shrink-0"
              )}
            >
              <span className="text-base leading-none">{currentCountry?.flag || '🌐'}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="start" 
            className="w-56 max-h-64 overflow-y-auto bg-popover z-50"
            sideOffset={4}
          >
            {COUNTRIES.map((country) => (
              <DropdownMenuItem
                key={country.code}
                onClick={() => handleCountrySelect(country)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span className="text-base">{country.flag}</span>
                <span className="flex-1 text-sm">{country.name}</span>
                <span className="text-xs text-muted-foreground">+{country.code}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <input
          type="tel"
          inputMode="tel"
          className={cn(
            "flex h-10 w-full rounded-r-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
      </div>
    );
  }
);
MaskedPhoneInput.displayName = "MaskedPhoneInput";

export { MaskedPhoneInput, formatPhoneInput, COUNTRIES };
