import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Award, Users, Target, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { selfHostedPost } from '@/lib/selfHostedApi';
import { useAuth } from '@/hooks/useAuth';

interface BonusSettings {
  students_bonus_amount: number;
  students_for_bonus: number;
  plan_bonus_amount: number;
  lesson_bonus_tier1_lessons: number;
  lesson_bonus_tier1_amount: number;
  lesson_bonus_tier2_lessons: number;
  lesson_bonus_tier2_amount: number;
  lesson_bonus_tier3_lessons: number;
  lesson_bonus_tier3_amount: number;
  base_salary: number;
}

const DEFAULT_SETTINGS: BonusSettings = {
  students_bonus_amount: 20000,
  students_for_bonus: 10,
  plan_bonus_amount: 20000,
  lesson_bonus_tier1_lessons: 8,
  lesson_bonus_tier1_amount: 1000,
  lesson_bonus_tier2_lessons: 24,
  lesson_bonus_tier2_amount: 3000,
  lesson_bonus_tier3_lessons: 40,
  lesson_bonus_tier3_amount: 5000,
  base_salary: 60000,
};

export default function BonusSettingsPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<BonusSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [profile?.organization_id]);

  const loadSettings = async () => {
    if (!profile?.organization_id) return;
    
    setIsLoading(true);
    try {
      const response = await selfHostedPost<{ settings: BonusSettings | null }>('get-bonus-settings', {
        organization_id: profile.organization_id,
      });
      
      if (response.success && response.data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...response.data.settings });
      }
    } catch (error) {
      console.error('Failed to load bonus settings:', error);
      // Используем дефолтные настройки
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.organization_id) {
      toast.error('Не удалось определить организацию');
      return;
    }

    setIsSaving(true);
    try {
      const response = await selfHostedPost('save-bonus-settings', {
        organization_id: profile.organization_id,
        settings,
      });

      if (response.success) {
        toast.success('Настройки бонусов сохранены');
      } else {
        toast.error(response.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Failed to save bonus settings:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof BonusSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Настройки бонусов</h1>
          <p className="text-muted-foreground">
            Редактирование условий начисления бонусов сотрудникам
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Базовая зарплата */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Базовая зарплата
            </CardTitle>
            <CardDescription>
              Базовый оклад для расчёта заработанного
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="base_salary">Базовый оклад (₽)</Label>
              <Input
                id="base_salary"
                type="number"
                value={settings.base_salary}
                onChange={(e) => updateSetting('base_salary', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Бонус за учеников */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
              Бонус за новых учеников
            </CardTitle>
            <CardDescription>
              Награда за привлечение новых учеников
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="students_for_bonus">Кол-во учеников для бонуса</Label>
              <Input
                id="students_for_bonus"
                type="number"
                value={settings.students_for_bonus}
                onChange={(e) => updateSetting('students_for_bonus', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="students_bonus_amount">Сумма бонуса (₽)</Label>
              <Input
                id="students_bonus_amount"
                type="number"
                value={settings.students_bonus_amount}
                onChange={(e) => updateSetting('students_bonus_amount', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Бонус за план */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-sky-600 dark:text-sky-500" />
              Бонус за выполнение плана
            </CardTitle>
            <CardDescription>
              Награда за достижение 100% плана
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan_bonus_amount">Сумма бонуса (₽)</Label>
              <Input
                id="plan_bonus_amount"
                type="number"
                value={settings.plan_bonus_amount}
                onChange={(e) => updateSetting('plan_bonus_amount', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Бонусы за уроки */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-500" />
              Бонусы за уроки
            </CardTitle>
            <CardDescription>
              Бонусы за количество оплаченных уроков новыми учениками
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {/* Уровень 1 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="font-medium text-sm text-muted-foreground">Уровень 1</div>
                <div className="space-y-2">
                  <Label htmlFor="tier1_lessons">Кол-во уроков (от)</Label>
                  <Input
                    id="tier1_lessons"
                    type="number"
                    value={settings.lesson_bonus_tier1_lessons}
                    onChange={(e) => updateSetting('lesson_bonus_tier1_lessons', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier1_amount">Бонус (₽)</Label>
                  <Input
                    id="tier1_amount"
                    type="number"
                    value={settings.lesson_bonus_tier1_amount}
                    onChange={(e) => updateSetting('lesson_bonus_tier1_amount', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Уровень 2 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="font-medium text-sm text-muted-foreground">Уровень 2</div>
                <div className="space-y-2">
                  <Label htmlFor="tier2_lessons">Кол-во уроков (от)</Label>
                  <Input
                    id="tier2_lessons"
                    type="number"
                    value={settings.lesson_bonus_tier2_lessons}
                    onChange={(e) => updateSetting('lesson_bonus_tier2_lessons', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier2_amount">Бонус (₽)</Label>
                  <Input
                    id="tier2_amount"
                    type="number"
                    value={settings.lesson_bonus_tier2_amount}
                    onChange={(e) => updateSetting('lesson_bonus_tier2_amount', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Уровень 3 */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="font-medium text-sm text-muted-foreground">Уровень 3</div>
                <div className="space-y-2">
                  <Label htmlFor="tier3_lessons">Кол-во уроков (от)</Label>
                  <Input
                    id="tier3_lessons"
                    type="number"
                    value={settings.lesson_bonus_tier3_lessons}
                    onChange={(e) => updateSetting('lesson_bonus_tier3_lessons', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier3_amount">Бонус (₽)</Label>
                  <Input
                    id="tier3_amount"
                    type="number"
                    value={settings.lesson_bonus_tier3_amount}
                    onChange={(e) => updateSetting('lesson_bonus_tier3_amount', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}
