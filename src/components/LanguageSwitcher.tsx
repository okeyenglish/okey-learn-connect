import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={(value: 'ru' | 'en') => setLanguage(value)}>
      <SelectTrigger className="w-24 bg-white/10 border-white/20 text-white">
        <Globe className="h-4 w-4 mr-1" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ru">RU</SelectItem>
        <SelectItem value="en">EN</SelectItem>
      </SelectContent>
    </Select>
  );
}