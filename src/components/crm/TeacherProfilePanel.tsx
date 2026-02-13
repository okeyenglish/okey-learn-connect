import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/typedClient';
import { toast } from 'sonner';
import { Phone, Mail, MapPin, Edit, Save, X, Plus, Loader2, Copy, Check } from 'lucide-react';
import maxIconSrc from "@/assets/max-icon.webp";
import type { TeacherChatItem } from '@/hooks/useTeacherChats';

const SUBJECTS = ['Английский', 'Немецкий', 'Французский', 'Китайский', 'Испанский', 'Арабский', 'Турецкий', 'Корейский', 'Японский'];
const CATEGORIES = ['Дошкольники', 'Школьники 1-4 класс', 'Школьники 5-8 класс', 'Школьники 9-11 класс', 'Взрослые', 'Корпоративные'];

// Messenger icons
const WhatsAppIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-colors ${active ? 'text-green-500' : 'text-muted-foreground/40'}`} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = ({ active }: { active: boolean }) => (
  <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-colors ${active ? 'text-blue-500' : 'text-muted-foreground/40'}`} fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const MaxIconDisplay = ({ active }: { active: boolean }) => (
  <img src={maxIconSrc} alt="MAX" className={`h-4 w-4 rounded-full object-cover transition-opacity ${active ? 'opacity-100' : 'opacity-40'}`} />
);

interface MessengerData {
  clientId: string | null;
  whatsappId: string | null;
  telegramUserId: string | null;
  maxChatId: string | null;
  maxUserId: string | null;
}

interface TeacherProfilePanelProps {
  teacher: TeacherChatItem | null;
  onUpdated?: () => void;
}

export const TeacherProfilePanel: React.FC<TeacherProfilePanelProps> = ({ teacher, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [messengerData, setMessengerData] = useState<MessengerData>({
    clientId: null, whatsappId: null, telegramUserId: null, maxChatId: null, maxUserId: null,
  });
  const [messengerLoading, setMessengerLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync state when teacher changes
  useEffect(() => {
    if (teacher) {
      setPhone(teacher.phone || '');
      setEmail(teacher.email || '');
      setSubjects(teacher.subjects || []);
      setCategories(teacher.categories || []);
      setEditing(false);
    }
  }, [teacher?.id]);

  // Fetch linked client messenger data
  useEffect(() => {
    const fetchMessengerData = async () => {
      if (!teacher?.id) {
        setMessengerData({ clientId: null, whatsappId: null, telegramUserId: null, maxChatId: null, maxUserId: null });
        return;
      }
      setMessengerLoading(true);
      try {
        // Try teacher_client_links first
        const { data: links } = await supabase
          .from('teacher_client_links' as any)
          .select('client_id' as any)
          .eq('teacher_id', teacher.id)
          .limit(1);

        const linkedClientId = (links as any)?.[0]?.client_id;
        if (linkedClientId) {
          const { data: client } = await supabase
            .from('clients')
            .select('id, telegram_user_id, whatsapp_id')
            .eq('id', linkedClientId)
            .single();

          if (client) {
            // Also try to get max_user_id if column exists
            let maxChatId: string | null = null;
            let maxUserId: string | null = null;
            try {
              const { data: maxData } = await (supabase.from('clients') as any)
                .select('max_chat_id, max_user_id')
                .eq('id', linkedClientId)
                .single();
              maxChatId = maxData?.max_chat_id || null;
              maxUserId = maxData?.max_user_id || null;
            } catch { /* column may not exist */ }

            setMessengerData({
              clientId: linkedClientId,
              whatsappId: (client as any).whatsapp_id || null,
              telegramUserId: (client as any).telegram_user_id || null,
              maxChatId,
              maxUserId,
            });
            return;
          }
        }

        // Fallback: find client by teacher phone
        if (teacher.phone) {
          const normalizedPhone = teacher.phone.replace(/\D/g, '');
          if (normalizedPhone.length >= 10) {
            const last10 = normalizedPhone.slice(-10);
            const { data: clients } = await supabase
              .from('clients')
              .select('id, telegram_user_id, whatsapp_id')
              .ilike('phone', `%${last10}`)
              .limit(1);

            if (clients?.[0]) {
              let maxChatId: string | null = null;
              let maxUserId: string | null = null;
              try {
                const { data: maxData } = await (supabase.from('clients') as any)
                  .select('max_chat_id, max_user_id')
                  .eq('id', clients[0].id)
                  .single();
                maxChatId = maxData?.max_chat_id || null;
                maxUserId = maxData?.max_user_id || null;
              } catch { /* column may not exist */ }

              setMessengerData({
                clientId: clients[0].id,
                whatsappId: (clients[0] as any).whatsapp_id || null,
                telegramUserId: (clients[0] as any).telegram_user_id || null,
                maxChatId,
                maxUserId,
              });
              return;
            }
          }
        }

        setMessengerData({ clientId: null, whatsappId: null, telegramUserId: null, maxChatId: null, maxUserId: null });
      } catch (err) {
        console.error('Error fetching messenger data:', err);
      } finally {
        setMessengerLoading(false);
      }
    };
    fetchMessengerData();
  }, [teacher?.id, teacher?.phone]);

  const handleSave = async () => {
    if (!teacher) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .update({
          phone: phone || null,
          email: email || null,
          subjects,
          categories,
        })
        .eq('id', teacher.id);

      if (error) throw error;

      // Update client messenger data if we have a linked client
      if (messengerData.clientId) {
        const updateData: Record<string, any> = {};
        if (messengerData.telegramUserId !== null) updateData.telegram_user_id = messengerData.telegramUserId || null;
        if (messengerData.whatsappId !== null) updateData.whatsapp_id = messengerData.whatsappId || null;
        
        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('clients')
            .update(updateData)
            .eq('id', messengerData.clientId);
        }
      }

      toast.success('Данные обновлены');
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      console.error('Error updating teacher:', err);
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (teacher) {
      setPhone(teacher.phone || '');
      setEmail(teacher.email || '');
      setSubjects(teacher.subjects || []);
      setCategories(teacher.categories || []);
    }
    setEditing(false);
  };

  const addSubject = (s: string) => {
    if (s && !subjects.includes(s)) setSubjects(prev => [...prev, s]);
  };

  const removeSubject = (s: string) => {
    setSubjects(prev => prev.filter(x => x !== s));
  };

  const addCategory = (c: string) => {
    if (c && !categories.includes(c)) setCategories(prev => [...prev, c]);
  };

  const removeCategory = (c: string) => {
    setCategories(prev => prev.filter(x => x !== c));
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Скопировано');
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const formatPhone = (p: string) => {
    if (!p) return 'Не указан';
    let digits = p.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('9')) digits = `7${digits}`;
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    if (digits.length >= 10) return `+${digits}`;
    return p;
  };

  if (!teacher) return null;

  const waActive = !!messengerData.whatsappId;
  const tgActive = !!messengerData.telegramUserId;
  const maxActive = !!messengerData.maxChatId || !!messengerData.maxUserId;

  return (
    <ScrollArea className="h-full p-3">
      <div className="space-y-4">
        {/* Edit / Save buttons */}
        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="h-3 w-3 mr-1" /> Отмена
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Сохранить
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit className="h-3 w-3 mr-1" /> Редактировать
            </Button>
          )}
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Контактная информация
              {teacher.teacherNumber && (
                <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                  #{teacher.teacherNumber}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {editing ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Телефон</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 ..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="h-8 text-xs"
                  />
                </div>
                {/* Messenger IDs editing */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Telegram ID</label>
                  <Input
                    value={messengerData.telegramUserId || ''}
                    onChange={(e) => setMessengerData(prev => ({ ...prev, telegramUserId: e.target.value || null }))}
                    placeholder="Telegram User ID"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">WhatsApp ID</label>
                  <Input
                    value={messengerData.whatsappId || ''}
                    onChange={(e) => setMessengerData(prev => ({ ...prev, whatsappId: e.target.value || null }))}
                    placeholder="WhatsApp ID (79161234567@c.us)"
                    className="h-8 text-xs"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Phone + Messenger icons row */}
                <TooltipProvider>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span
                      className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                      onClick={() => teacher.phone && handleCopy(formatPhone(teacher.phone), 'phone')}
                    >
                      {formatPhone(teacher.phone || '')}
                    </span>
                    {copiedField === 'phone' && <Check className="h-3 w-3 text-green-500" />}
                    
                    {/* Messenger icons */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-0.5 rounded hover:bg-muted transition-colors" onClick={() => waActive && messengerData.whatsappId && handleCopy(messengerData.whatsappId, 'wa')}>
                            <WhatsAppIcon active={waActive} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {waActive ? `WhatsApp: ${messengerData.whatsappId}` : 'WhatsApp не подключен'}
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-0.5 rounded hover:bg-muted transition-colors" onClick={() => tgActive && messengerData.telegramUserId && handleCopy(messengerData.telegramUserId, 'tg')}>
                            <TelegramIcon active={tgActive} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {tgActive ? `Telegram ID: ${messengerData.telegramUserId}` : 'Telegram не подключен'}
                        </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-0.5 rounded hover:bg-muted transition-colors" onClick={() => maxActive && handleCopy(messengerData.maxUserId || messengerData.maxChatId || '', 'max')}>
                            <MaxIconDisplay active={maxActive} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {maxActive ? `MAX ID: ${messengerData.maxUserId || messengerData.maxChatId}` : 'MAX не подключен'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Messenger IDs detail rows */}
                  {tgActive && messengerData.telegramUserId && (
                    <div className="flex items-center gap-2 ml-5">
                      <TelegramIcon active={true} />
                      <span className="text-xs text-muted-foreground">ID: {messengerData.telegramUserId}</span>
                      <button onClick={() => handleCopy(messengerData.telegramUserId!, 'tg-id')} className="p-0.5 rounded hover:bg-muted">
                        {copiedField === 'tg-id' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                  )}
                  {waActive && messengerData.whatsappId && (
                    <div className="flex items-center gap-2 ml-5">
                      <WhatsAppIcon active={true} />
                      <span className="text-xs text-muted-foreground">ID: {messengerData.whatsappId}</span>
                      <button onClick={() => handleCopy(messengerData.whatsappId!, 'wa-id')} className="p-0.5 rounded hover:bg-muted">
                        {copiedField === 'wa-id' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                  )}
                  {maxActive && (messengerData.maxUserId || messengerData.maxChatId) && (
                    <div className="flex items-center gap-2 ml-5">
                      <MaxIconDisplay active={true} />
                      <span className="text-xs text-muted-foreground">ID: {messengerData.maxUserId || messengerData.maxChatId}</span>
                      <button onClick={() => handleCopy(messengerData.maxUserId || messengerData.maxChatId || '', 'max-id')} className="p-0.5 rounded hover:bg-muted">
                        {copiedField === 'max-id' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                  )}
                </TooltipProvider>

                {/* Email */}
                <div className="flex items-center space-x-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">{teacher.email || 'Не указан'}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Professional Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Профессиональная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {/* Subjects */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Предметы</h4>
              <div className="flex flex-wrap gap-1">
                {subjects.length > 0 ? subjects.map((subject) => (
                  <Badge key={subject} variant="secondary" className="text-xs h-5 gap-1">
                    {subject}
                    {editing && (
                      <button onClick={() => removeSubject(subject)} className="hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                )) : (
                  <span className="text-xs text-muted-foreground">Не указаны</span>
                )}
              </div>
              {editing && (
                <Select value="" onValueChange={addSubject}>
                  <SelectTrigger className="mt-2 h-7 text-xs">
                    <SelectValue placeholder="Добавить предмет..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.filter(s => !subjects.includes(s)).map(s => (
                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Категории</h4>
              <div className="flex flex-wrap gap-1">
                {categories.length > 0 ? categories.map((category) => (
                  <Badge key={category} variant="outline" className="text-xs h-5 gap-1">
                    {category}
                    {editing && (
                      <button onClick={() => removeCategory(category)} className="hover:text-destructive">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                )) : (
                  <span className="text-xs text-muted-foreground">Не указаны</span>
                )}
              </div>
              {editing && (
                <Select value="" onValueChange={addCategory}>
                  <SelectTrigger className="mt-2 h-7 text-xs">
                    <SelectValue placeholder="Добавить категорию..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => !categories.includes(c)).map(c => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Branch */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Филиалы</h4>
              <div className="flex flex-wrap gap-1">
                {teacher.branches && teacher.branches.length > 0 ? (
                  teacher.branches.map((b) => (
                    <Badge key={b} variant="secondary" className="text-xs h-5">{b}</Badge>
                  ))
                ) : teacher.branch ? (
                  <Badge variant="secondary" className="text-xs h-5">{teacher.branch}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Не указан</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
};
