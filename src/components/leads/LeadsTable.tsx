import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Trash2, Phone, Mail, MessageSquare } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  onFiltersChange: (filters: any) => void;
}

export function LeadsTable({ leads, isLoading, onFiltersChange }: LeadsTableProps) {

  const getStatusBadgeVariant = (status: any) => {
    if (status?.is_success) return 'default';
    if (status?.is_failure) return 'destructive';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded mb-2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Таблица */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клиент</TableHead>
              <TableHead>Контакты</TableHead>
              <TableHead>Предмет</TableHead>
              <TableHead>Филиал</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Источник</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {lead.first_name} {lead.last_name}
                    </div>
                    {lead.age && (
                      <div className="text-sm text-muted-foreground">
                        {lead.age} лет
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm">
                      <Phone className="h-3 w-3 mr-1" />
                      {lead.phone}
                    </div>
                    {lead.email && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        {lead.email}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div>
                    <div className="font-medium">{lead.subject}</div>
                    {lead.level && (
                      <div className="text-sm text-muted-foreground">
                        {lead.level}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>{lead.branch}</TableCell>
                
                <TableCell>
                  {lead.lead_status && (
                    <Badge 
                      variant={getStatusBadgeVariant(lead.lead_status)}
                      style={{ backgroundColor: lead.lead_status.color + '20', color: lead.lead_status.color }}
                    >
                      {lead.lead_status.name}
                    </Badge>
                  )}
                </TableCell>
                
                <TableCell>
                  {lead.lead_source?.name && (
                    <span className="text-sm text-muted-foreground">
                      {lead.lead_source.name}
                    </span>
                  )}
                </TableCell>
                
                <TableCell>
                  <time className="text-sm text-muted-foreground">
                    {format(new Date(lead.created_at), 'dd.MM.yyyy', { locale: ru })}
                  </time>
                </TableCell>
                
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Открыть меню</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Посмотреть
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Phone className="mr-2 h-4 w-4" />
                        Позвонить
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Написать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {leads.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Лидов не найдено</p>
        </div>
      )}
    </div>
  );
}