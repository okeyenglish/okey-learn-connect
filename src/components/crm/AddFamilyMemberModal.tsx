import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, User, Phone, Mail, Heart, FileText, Star, Users } from "lucide-react";
import { supabaseTyped as supabase } from "@/integrations/supabase/typedClient";
import { useToast } from "@/hooks/use-toast";
import { PhoneNumbersEditor } from "./PhoneNumbersEditor";
import type { PhoneNumber } from "@/types/phone";

interface AddFamilyMemberModalProps {
  familyGroupId: string;
  onMemberAdded?: () => void;
  children?: React.ReactNode;
}

export const AddFamilyMemberModal = ({ familyGroupId, onMemberAdded, children }: AddFamilyMemberModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    relationship: "parent" as "main" | "spouse" | "parent" | "guardian" | "other",
    isPrimaryContact: false,
    notes: ""
  });
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([
    {
      id: '1',
      phone: '',
      phoneType: 'mobile',
      isPrimary: true,
      isWhatsappEnabled: true,
      isTelegramEnabled: false,
    }
  ]);
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get primary phone for main client record
      const primaryPhone = phoneNumbers.find(p => p.isPrimary) || phoneNumbers[0];
      if (!primaryPhone?.phone) {
        toast({
          title: "Ошибка",
          description: "Необходимо указать хотя бы один телефон",
          variant: "destructive"
        });
        return;
      }

      // First, create the client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          phone: primaryPhone.phone,
          email: formData.email || null,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (clientError) {
        if (clientError.code === '23505') { // Unique constraint violation
          toast({
            title: "Ошибка",
            description: "Клиент с таким номером телефона уже существует",
            variant: "destructive"
          });
          return;
        }
        throw clientError;
      }

      // Add all phone numbers to client_phone_numbers table
      if (phoneNumbers.length > 0) {
        const phoneRecords = phoneNumbers
          .filter(p => p.phone.trim())
          .map(phone => ({
            client_id: clientData.id,
            phone: phone.phone,
            phone_type: phone.phoneType,
            is_primary: phone.isPrimary,
            is_whatsapp_enabled: phone.isWhatsappEnabled,
            is_telegram_enabled: phone.isTelegramEnabled,
          }));

        if (phoneRecords.length > 0) {
          const { error: phoneError } = await supabase
            .from('client_phone_numbers')
            .insert(phoneRecords);

          if (phoneError) {
            console.error('Error adding phone numbers:', phoneError);
            // Continue even if phone numbers fail - main client is created
          }
        }
      }

      // If setting as primary contact, first remove primary from others
      if (formData.isPrimaryContact) {
        await supabase
          .from('family_members')
          .update({ is_primary_contact: false })
          .eq('family_group_id', familyGroupId);
      }

      // Then, add to family
      const { error: familyError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: familyGroupId,
          client_id: clientData.id,
          relationship_type: formData.relationship,
          is_primary_contact: formData.isPrimaryContact
        });

      if (familyError) throw familyError;

      toast({
        title: "Успешно",
        description: "Новый член семьи добавлен"
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        relationship: "parent",
        isPrimaryContact: false,
        notes: ""
      });
      setPhoneNumbers([
        {
          id: '1',
          phone: '',
          phoneType: 'mobile',
          isPrimary: true,
          isWhatsappEnabled: true,
          isTelegramEnabled: false,
        }
      ]);
      
      setOpen(false);
      onMemberAdded?.();

    } catch (error) {
      console.error('Error adding family member:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить члена семьи",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRelationshipLabel = (value: string) => {
    const labels = {
      main: "Основной контакт",
      spouse: "Супруг(а)",
      parent: "Родитель",
      guardian: "Опекун",
      other: "Другое"
    };
    return labels[value as keyof typeof labels] || value;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-lg">
            <UserPlus className="h-4 w-4" />
            Добавить члена семьи
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-6 w-6" />
              </div>
              Добавить члена семьи
            </DialogTitle>
            <p className="text-emerald-100 mt-2">Добавьте нового члена семьи с контактной информацией</p>
          </DialogHeader>
        </div>
        
        <ScrollArea className="max-h-[calc(90vh-180px)] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Основная информация */}
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-emerald-600" />
                  Основная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 font-medium">
                    <Star className="h-4 w-4 text-red-500" />
                    Имя и фамилия
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Например: Мария Петрова"
                    required
                    className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 font-medium">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    Электронная почта
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="maria.petrova@example.com"
                    className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship" className="flex items-center gap-2 font-medium">
                    <Heart className="h-4 w-4 text-emerald-600" />
                    Родственная связь
                  </Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, relationship: value }))}
                  >
                    <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-pink-500" />
                          Супруг(а)
                        </div>
                      </SelectItem>
                      <SelectItem value="parent">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          Родитель
                        </div>
                      </SelectItem>
                      <SelectItem value="guardian">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-500" />
                          Опекун
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          Другое
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Switch
                    id="primary-contact"
                    checked={formData.isPrimaryContact}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrimaryContact: checked }))}
                  />
                  <div className="flex-1">
                    <Label htmlFor="primary-contact" className="flex items-center gap-2 font-medium cursor-pointer">
                      <Star className="h-4 w-4 text-amber-500" />
                      Основной контакт
                    </Label>
                    <p className="text-sm text-emerald-600">
                      Основной контакт получает важные уведомления
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Контактная информация */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Контактная информация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-medium">
                    <Star className="h-4 w-4 text-red-500" />
                    Номера телефонов
                  </Label>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <PhoneNumbersEditor 
                      phoneNumbers={phoneNumbers}
                      onPhoneNumbersChange={setPhoneNumbers}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Дополнительная информация */}
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Дополнительная информация
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2 font-medium">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Заметки о члене семьи
                  </Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Особенности, предпочтения по общению, важная информация..."
                    rows={3}
                    className="resize-none transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </ScrollArea>

        {/* Кнопки действий */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="px-6"
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              onClick={handleSubmit}
              className="px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-lg"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Добавить в семью
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};