import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Gift, Phone, User, MapPin, BookOpen, Calendar, Check, Sparkles, MessageCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface PriceCalculatorProps {
  preSelectedBranch?: string;
}

const branches = [
  { name: "Котельники", value: "kotelniki" },
  { name: "Новокосино", value: "novokosino" },
  { name: "Окская", value: "okskaya" },
  { name: "Стахановская", value: "stakhanovskaya" },
  { name: "Солнцево", value: "solntsevo" },
  { name: "Мытищи", value: "mytishchi" },
  { name: "Люберцы", value: "lyubertsy-1" },
  { name: "Красная горка", value: "lyubertsy-2" },
  { name: "Онлайн школа", value: "online" },
];

const ageRanges = [
  { label: "3-6 лет", value: "3-6", basePrice: 6000 },
  { label: "5-9 лет", value: "5-9", basePrice: 7000 },
  { label: "10-17 лет", value: "10-17", basePrice: 8000 },
  { label: "18+ лет", value: "18+", basePrice: 9000 },
];

export default function PriceCalculator({ preSelectedBranch }: PriceCalculatorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    age: "",
    hasStudied: "",
    branch: preSelectedBranch || "",
    childName: "",
    phone: "",
    webhookUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const getBasePrice = () => {
    const ageRange = ageRanges.find(range => range.value === formData.age);
    return ageRange?.basePrice || 0;
  };

  const getDiscounts = () => {
    let discounts = 0;
    if (formData.childName) discounts += 1000;
    if (formData.phone) discounts += 1000;
    return discounts;
  };

  const getFinalPrice = () => {
    return Math.max(0, getBasePrice() - getDiscounts());
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!formData.webhookUrl) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, укажите URL вебхука для отправки заявки",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const webhookData = {
        age: formData.age,
        hasStudied: formData.hasStudied === "yes" ? "Да" : "Нет",
        branch: branches.find(b => b.value === formData.branch)?.name || formData.branch,
        childName: formData.childName,
        phone: formData.phone,
        basePrice: getBasePrice(),
        discounts: getDiscounts(),
        finalPrice: getFinalPrice(),
        timestamp: new Date().toISOString(),
        source: "Price Calculator",
      };

      await fetch(formData.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify(webhookData),
      });

      toast({
        title: "Заявка отправлена!",
        description: "Мы свяжемся с вами в ближайшее время",
      });

      setCurrentStep(5);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить заявку. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Возраст ученика</h3>
              <p className="text-muted-foreground">Выберите возрастную категорию</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ageRanges.map((range) => (
                <Card
                  key={range.value}
                  className={`cursor-pointer transition-all ${
                    formData.age === range.value ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setFormData({ ...formData, age: range.value })}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-lg font-semibold">{range.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Опыт изучения</h3>
              <p className="text-muted-foreground">Изучал ли английский язык раньше?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-all ${
                  formData.hasStudied === "yes" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setFormData({ ...formData, hasStudied: "yes" })}
              >
                <CardContent className="p-6 text-center">
                  <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="font-semibold">Да, изучал</div>
                  <div className="text-sm text-muted-foreground mt-2">Есть базовые знания</div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer transition-all ${
                  formData.hasStudied === "no" ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setFormData({ ...formData, hasStudied: "no" })}
              >
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="font-semibold">Нет, начинаю с нуля</div>
                  <div className="text-sm text-muted-foreground mt-2">Первые шаги в английском</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Выбор филиала</h3>
              <p className="text-muted-foreground">Где будут проходить занятия?</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {branches.map((branch) => (
                <Card
                  key={branch.value}
                  className={`cursor-pointer transition-all ${
                    formData.branch === branch.value ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setFormData({ ...formData, branch: branch.value })}
                >
                  <CardContent className="p-4 text-center">
                    <div className="font-medium">{branch.name}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Gift className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Добавим разовую скидку 5000₽</h3>
              <p className="text-muted-foreground">На кого используете?</p>
            </div>
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <Label htmlFor="childName">
                  {formData.age === "18+" ? "Ваше имя" : "Имя ребенка"}
                </Label>
                <Input
                  id="childName"
                  value={formData.childName}
                  onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                  placeholder="Введите имя"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="webhook">URL вебхука для заявки</Label>
                <Input
                  id="webhook"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://hooks.zapier.com/..."
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-3xl font-bold mb-4">Спасибо!</h3>
              <p className="text-lg text-muted-foreground mb-6">
                Сейчас сделаем расчёт для Вас и отправим на WhatsApp или перезвоним
              </p>
            </div>

            <div className="flex justify-center space-x-4 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://wa.me/79937073553`, '_blank')}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://t.me/okeyenglish`, '_blank')}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Telegram</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`tel:+74997073535`, '_blank')}
                className="flex items-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Позвонить</span>
              </Button>
            </div>

            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Ваши подарки!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                  <Gift className="w-6 h-6 text-yellow-600" />
                  <div className="text-left">
                    <div className="font-semibold">Пробный урок БЕСПЛАТНО</div>
                    <div className="text-sm text-muted-foreground">Знакомство с преподавателем и методикой</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <Gift className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <div className="font-semibold">Персональный план обучения</div>
                    <div className="text-sm text-muted-foreground">Индивидуальная программа развития</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (currentStep === 5) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          {renderStep()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Конструктор цены</CardTitle>
            <Badge variant="outline">
              Шаг {currentStep} из {totalSteps}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
          {currentStep > 2 && (
            <div className="text-center text-sm text-muted-foreground">
              🎉 Почти закончили! Осталось совсем немного
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-8">
        {renderStep()}

        {currentStep > 1 && getBasePrice() > 0 && (
          <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">Стоимость обучения</div>
                  <div className="text-2xl font-bold text-primary">{getFinalPrice()}₽/месяц</div>
                  {getDiscounts() > 0 && (
                    <div className="text-sm text-green-600">
                      Экономия: {getDiscounts()}₽ 🎉
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {getDiscounts() > 0 && (
                    <div className="text-sm text-muted-foreground line-through">
                      {getBasePrice()}₽
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Назад
          </Button>
          
          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !formData.age) ||
                (currentStep === 2 && !formData.hasStudied) ||
                (currentStep === 3 && !formData.branch)
              }
            >
              Далее
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!formData.phone || !formData.childName || !formData.webhookUrl || isSubmitting}
            >
              {isSubmitting ? "Отправляем..." : "Рассчитать стоимость"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}