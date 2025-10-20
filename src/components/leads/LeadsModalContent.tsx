import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ChevronDown } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { AddLeadModal } from './AddLeadModal';
import { LeadsTable } from './LeadsTable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface LeadsModalContentProps {
  onLeadClick?: (clientId: string) => void;
}

export function LeadsModalContent({ onLeadClick }: LeadsModalContentProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Фильтры
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Загружаем клиентов (лиды с телефонии записываются в таблицу clients)
  const { clients, isLoading: clientsLoading } = useClients();
  
  const isLoading = clientsLoading;

  // Преобразуем клиентов в формат лидов
  const leadsFromClients = clients.map(client => ({
    id: client.id,
    first_name: client.name?.split(' ')[0] || client.name || 'Без имени',
    last_name: client.name?.split(' ').slice(1).join(' ') || '',
    middle_name: '',
    phone: client.phone,
    email: client.email || '',
    age: undefined,
    subject: '',
    level: '',
    branch: client.branch || 'Окская',
    preferred_time: '',
    preferred_days: [],
    notes: client.notes || '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    lead_source_id: '',
    status_id: '',
    assigned_to: '',
    converted_to_student_id: '',
    created_at: client.created_at,
    updated_at: client.updated_at,
  }));

  // Фильтрация на клиенте по поисковому запросу
  const filteredLeads = leadsFromClients.filter(lead => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase();
    const phone = lead.phone?.toLowerCase() || '';
    
    const matchesSearch = !searchQuery || 
      fullName.includes(searchLower) || 
      phone.includes(searchLower);
    
    // Фильтрация по филиалу
    const matchesBranch = selectedBranch === 'all' || lead.branch === selectedBranch;
    
    // Фильтрация по дате создания
    const matchesDate = !dateRange?.from || !dateRange?.to || (
      lead.created_at && 
      new Date(lead.created_at) >= dateRange.from && 
      new Date(lead.created_at) <= dateRange.to
    );
    
    return matchesSearch && matchesBranch && matchesDate;
  });

  const handleFiltersChange = () => {
    // Фильтры применяются автоматически через state
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопка добавления */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">Чаты и контакты</h3>
          <p className="text-sm text-muted-foreground">
            Все контакты, обратившиеся через телефон, WhatsApp, Telegram или добавленные вручную
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Добавить контакт
        </Button>
      </div>

      {/* Основной поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по имени, фамилии, телефону..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Расширенные фильтры */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            Дополнительные фильтры
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Филиал */}
            <div className="space-y-2">
              <Label>Филиал</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите филиал" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все филиалы</SelectItem>
                  <SelectItem value="Окская">Окская</SelectItem>
                  <SelectItem value="Мытищи">Мытищи</SelectItem>
                  <SelectItem value="Люберцы">Люберцы</SelectItem>
                  <SelectItem value="Котельники">Котельники</SelectItem>
                  <SelectItem value="Солнцево">Солнцево</SelectItem>
                  <SelectItem value="Новокосино">Новокосино</SelectItem>
                  <SelectItem value="Стахановская">Стахановская</SelectItem>
                  <SelectItem value="Красная Горка">Красная Горка</SelectItem>
                  <SelectItem value="Онлайн">Онлайн</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Дата обращения */}
            <div className="space-y-2">
              <Label>Дата обращения</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Таблица лидов */}
      <LeadsTable 
        leads={filteredLeads}
        isLoading={isLoading}
        onFiltersChange={handleFiltersChange}
        onLeadClick={onLeadClick}
      />

      {/* Модальное окно добавления лида */}
      <AddLeadModal 
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />
    </div>
  );
}
