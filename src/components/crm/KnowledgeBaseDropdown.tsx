import { BookOpen, FileText, HelpCircle, GraduationCap, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface KnowledgeBaseDropdownProps {
  onOpenScripts: () => void;
  className?: string;
}

/**
 * Dropdown menu for Knowledge Base section
 * Contains: Scripts, FAQ, Training (coming soon)
 */
export function KnowledgeBaseDropdown({ onOpenScripts, className }: KnowledgeBaseDropdownProps) {
  const navigate = useNavigate();

  const handleOpenFAQ = () => {
    navigate('/faq');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 px-3 h-10 ${className || ''}`}
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-sm">База Знаний</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
        <DropdownMenuLabel className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          База Знаний
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Scripts */}
        <DropdownMenuItem onClick={onOpenScripts} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          <span>Скрипты продаж</span>
        </DropdownMenuItem>

        {/* FAQ */}
        <DropdownMenuItem onClick={handleOpenFAQ} className="cursor-pointer">
          <HelpCircle className="h-4 w-4 mr-2" />
          <span>FAQ для клиентов</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Training - Coming Soon */}
        <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
          <GraduationCap className="h-4 w-4 mr-2" />
          <span>Обучение</span>
          <span className="ml-auto text-xs text-muted-foreground">скоро</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default KnowledgeBaseDropdown;
