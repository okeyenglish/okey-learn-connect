import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, Trash2, UserPlus } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentOrganizationId } from '@/lib/organizationHelpers';

interface AddStudentModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

interface ParentContact {
  id: string;
  firstName: string;
  lastName: string;
  relation: string;
  phone: string;
  email: string;
  receiveNotifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  isPrimary: boolean;
}

export function AddStudentModal({ open, onOpenChange, children }: AddStudentModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [birthDate, setBirthDate] = useState<Date>();
  const [parents, setParents] = useState<ParentContact[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    // Основная информация
    firstName: '',
    lastName: '',
    middleName: '',
    gender: '',
    phone: '',
    email: '',
    
    // Образование
    subject: 'english',
    level: '',
    branch: '',
    status: 'trial',
    
    // Дополнительно
    leadSource: '',
    notes: '',
    hasDiscount: false,
    discountPercent: '',
    
    // Контакты для уведомлений
    notificationPreferences: {
      email: true,
      sms: false,
      push: false
    }
  });

  const addParent = () => {
    const newParent: ParentContact = {
      id: Math.random().toString(36).substr(2, 9),
      firstName: '',
      lastName: '',
      relation: 'mother',
      phone: '',
      email: '',
      receiveNotifications: {
        email: true,
        sms: false,
        push: false
      },
      isPrimary: parents.length === 0
    };
    setParents([...parents, newParent]);
  };

  const updateParent = (id: string, field: string, value: any) => {
    setParents(parents.map(parent => 
      parent.id === id 
        ? { ...parent, [field]: value }
        : parent
    ));
  };

  const removeParent = (id: string) => {
    setParents(parents.filter(parent => parent.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация основных полей
    if (!formData.firstName || !formData.lastName || !formData.branch) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля: имя, фамилия, филиал",
        variant: "destructive",
      });
      return;
    }

    // Возраст обязателен (по дате рождения)
    const age = birthDate ? differenceInYears(new Date(), birthDate) : undefined;
    if (!age || age <= 0 || age > 100) {
      toast({
        title: "Ошибка",
        description: "Укажите корректную дату рождения",
        variant: "destructive",
      });
      return;
    }

    try {
      const orgId = await getCurrentOrganizationId();
      
      // Создаем семейную группу
      const { data: family, error: familyErr } = await supabase
        .from('family_groups')
        .insert([{ name: `${formData.lastName} ${formData.firstName}`, organization_id: orgId }])
        .select('id')
        .single();
      if (familyErr) throw familyErr;

      // Создаем ученика
      const fullName = `${formData.lastName} ${formData.firstName}`.trim();
      const { error: studentErr } = await supabase
        .from('students')
        .insert([{
          name: fullName,
          first_name: formData.firstName,
          last_name: formData.lastName,
          middle_name: formData.middleName || null,
          phone: formData.phone || null,
          status: (formData.status as 'active' | 'inactive' | 'trial' | 'graduated') || 'active',
          family_group_id: family?.id || null,
          notes: formData.notes || null,
          age: age,
          date_of_birth: birthDate ? format(birthDate, 'yyyy-MM-dd') : null
        } as any]);
      if (studentErr) throw studentErr;

      await queryClient.invalidateQueries({ queryKey: ['students'] });

      toast({ title: "Успешно", description: "Ученик добавлен в систему" });

      // Сброс формы
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        gender: '',
        phone: '',
        email: '',
        subject: 'english',
        level: '',
        branch: '',
        status: 'trial',
        leadSource: '',
        notes: '',
        hasDiscount: false,
        discountPercent: '',
        notificationPreferences: {
          email: true,
          sms: false,
          push: false
        }
      });
      setBirthDate(undefined);
      setParents([]);
      setActiveTab('basic');
      
      if (onOpenChange) {
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Add student error', error);
      toast({
        title: "Ошибка",
        description: error?.message || "Не удалось добавить ученика",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      
      <DialogContent className="w-[95vw] md:w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить нового ученика</DialogTitle>
          <DialogDescription>
            Заполните информацию о новом ученике и его контактах
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="education">Обучение</TabsTrigger>
              <TabsTrigger value="parents">Родители</TabsTrigger>
              <TabsTrigger value="additional">Дополнительно</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Имя *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Имя ученика"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Фамилия *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Фамилия ученика"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="middleName">Отчество</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
                  placeholder="Отчество ученика"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Дата рождения</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !birthDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {birthDate ? format(birthDate, "d MMMM yyyy", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={birthDate}
                        onSelect={setBirthDate}
                        initialFocus
                        locale={ru}
                        className="pointer-events-auto"
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="gender">Пол</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите пол" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Мужской</SelectItem>
                      <SelectItem value="female">Женский</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="student@example.com"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="education" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Предмет</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">Английский язык</SelectItem>
                      <SelectItem value="spanish">Испанский язык</SelectItem>
                      <SelectItem value="french">Французский язык</SelectItem>
                      <SelectItem value="german">Немецкий язык</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="level">Уровень</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, level: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите уровень" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (A1)</SelectItem>
                      <SelectItem value="elementary">Elementary (A2)</SelectItem>
                      <SelectItem value="pre-intermediate">Pre-Intermediate (B1)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (B2)</SelectItem>
                      <SelectItem value="upper-intermediate">Upper-Intermediate (C1)</SelectItem>
                      <SelectItem value="advanced">Advanced (C2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="branch">Филиал *</Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, branch: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="okskaya">Окская</SelectItem>
                      <SelectItem value="mytishchi">Мытищи</SelectItem>
                      <SelectItem value="lyubertsy">Люберцы</SelectItem>
                      <SelectItem value="kotelniki">Котельники</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Статус</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Пробный урок</SelectItem>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="paused">На паузе</SelectItem>
                      <SelectItem value="inactive">Неактивный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="leadSource">Источник привлечения</Label>
                <Select
                  value={formData.leadSource}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, leadSource: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Откуда узнали о нас" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Сайт школы</SelectItem>
                    <SelectItem value="social_media">Социальные сети</SelectItem>
                    <SelectItem value="referral">Рекомендация</SelectItem>
                    <SelectItem value="advertising">Реклама</SelectItem>
                    <SelectItem value="walk_in">Обратился напрямую</SelectItem>
                    <SelectItem value="other">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="parents" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-medium">Контакты родителей</h4>
                  <p className="text-sm text-muted-foreground">
                    Добавьте контактную информацию родителей или опекунов
                  </p>
                </div>
                <Button type="button" onClick={addParent} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить родителя
                </Button>
              </div>

              <div className="space-y-4">
                {parents.map((parent, index) => (
                  <Card key={parent.id}>
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          Контакт {index + 1}
                          {parent.isPrimary && (
                            <Badge variant="secondary" className="ml-2">Основной</Badge>
                          )}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParent(parent.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Имя</Label>
                          <Input
                            value={parent.firstName}
                            onChange={(e) => updateParent(parent.id, 'firstName', e.target.value)}
                            placeholder="Имя родителя"
                          />
                        </div>
                        <div>
                          <Label>Фамилия</Label>
                          <Input
                            value={parent.lastName}
                            onChange={(e) => updateParent(parent.id, 'lastName', e.target.value)}
                            placeholder="Фамилия родителя"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Родство</Label>
                          <Select
                            value={parent.relation}
                            onValueChange={(value) => updateParent(parent.id, 'relation', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mother">Мать</SelectItem>
                              <SelectItem value="father">Отец</SelectItem>
                              <SelectItem value="guardian">Опекун</SelectItem>
                              <SelectItem value="grandmother">Бабушка</SelectItem>
                              <SelectItem value="grandfather">Дедушка</SelectItem>
                              <SelectItem value="other">Другое</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Телефон</Label>
                          <Input
                            type="tel"
                            value={parent.phone}
                            onChange={(e) => updateParent(parent.id, 'phone', e.target.value)}
                            placeholder="+7 (999) 123-45-67"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={parent.email}
                            onChange={(e) => updateParent(parent.id, 'email', e.target.value)}
                            placeholder="parent@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Уведомления</Label>
                        <div className="flex gap-6 mt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`email-${parent.id}`}
                              checked={parent.receiveNotifications.email}
                              onCheckedChange={(checked) => 
                                updateParent(parent.id, 'receiveNotifications', {
                                  ...parent.receiveNotifications,
                                  email: checked
                                })
                              }
                            />
                            <Label htmlFor={`email-${parent.id}`} className="text-sm">Email</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`sms-${parent.id}`}
                              checked={parent.receiveNotifications.sms}
                              onCheckedChange={(checked) => 
                                updateParent(parent.id, 'receiveNotifications', {
                                  ...parent.receiveNotifications,
                                  sms: checked
                                })
                              }
                            />
                            <Label htmlFor={`sms-${parent.id}`} className="text-sm">SMS</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`push-${parent.id}`}
                              checked={parent.receiveNotifications.push}
                              onCheckedChange={(checked) => 
                                updateParent(parent.id, 'receiveNotifications', {
                                  ...parent.receiveNotifications,
                                  push: checked
                                })
                              }
                            />
                            <Label htmlFor={`push-${parent.id}`} className="text-sm">Push</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {parents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Контакты родителей не добавлены</p>
                    <p className="text-sm">Нажмите кнопку "Добавить родителя" для добавления контактов</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Дополнительная информация об ученике..."
                  rows={4}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasDiscount"
                    checked={formData.hasDiscount}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, hasDiscount: !!checked }))
                    }
                  />
                  <Label htmlFor="hasDiscount">Есть скидка</Label>
                </div>

                {formData.hasDiscount && (
                  <div className="ml-6">
                    <Label htmlFor="discountPercent">Размер скидки (%)</Label>
                    <Input
                      id="discountPercent"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData(prev => ({ ...prev, discountPercent: e.target.value }))}
                      placeholder="10"
                      className="w-24"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Уведомления для ученика</Label>
                <div className="flex gap-6 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="student-email"
                      checked={formData.notificationPreferences.email}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ 
                          ...prev, 
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            email: !!checked
                          }
                        }))
                      }
                    />
                    <Label htmlFor="student-email" className="text-sm">Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="student-sms"
                      checked={formData.notificationPreferences.sms}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ 
                          ...prev, 
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            sms: !!checked
                          }
                        }))
                      }
                    />
                    <Label htmlFor="student-sms" className="text-sm">SMS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="student-push"
                      checked={formData.notificationPreferences.push}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ 
                          ...prev, 
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            push: !!checked
                          }
                        }))
                      }
                    />
                    <Label htmlFor="student-push" className="text-sm">Push</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-6 mt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange?.(false)}
            >
              Отмена
            </Button>
            <Button type="submit">
              Добавить ученика
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}