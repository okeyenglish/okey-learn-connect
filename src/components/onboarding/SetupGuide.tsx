import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SetupGuideProps {
  role: 'school' | 'teacher' | 'student' | 'parent';
}

export const SetupGuide = ({ role }: SetupGuideProps) => {
  const [steps, setSteps] = useState<Step[]>(getStepsForRole(role));
  const [currentStep, setCurrentStep] = useState(0);

  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;

  const toggleStep = (id: string) => {
    setSteps(steps.map(step => 
      step.id === id ? { ...step, completed: !step.completed } : step
    ));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      toggleStep(steps[currentStep].id);
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Быстрая настройка</CardTitle>
        <CardDescription>
          Следуйте этим шагам для полной настройки системы
        </CardDescription>
        <Progress value={progress} className="mt-4" />
        <p className="text-sm text-muted-foreground mt-2">
          {steps.filter(s => s.completed).length} из {steps.length} шагов завершено
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
              index === currentStep 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <button
              onClick={() => toggleStep(step.id)}
              className="flex-shrink-0 mt-1"
            >
              {step.completed ? (
                <CheckCircle2 className="w-6 h-6 text-primary" />
              ) : (
                <Circle className="w-6 h-6 text-muted-foreground" />
              )}
            </button>

            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${
                step.completed ? 'line-through text-muted-foreground' : ''
              }`}>
                {step.title}
              </h4>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>

            {index === currentStep && !step.completed && (
              <Button onClick={handleNext} size="sm">
                Далее <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        ))}

        {progress === 100 && (
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-semibold mb-2">Настройка завершена!</h3>
            <p className="text-muted-foreground mb-4">
              Теперь вы можете начать полноценную работу в системе
            </p>
            <Button className="w-full">
              Перейти к работе
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function getStepsForRole(role: string): Step[] {
  const stepsMap: Record<string, Step[]> = {
    school: [
      {
        id: '1',
        title: 'Добавьте филиалы',
        description: 'Создайте филиалы школы и укажите их адреса',
        completed: false,
      },
      {
        id: '2',
        title: 'Пригласите преподавателей',
        description: 'Добавьте преподавателей и назначьте им предметы',
        completed: false,
      },
      {
        id: '3',
        title: 'Создайте расписание',
        description: 'Настройте расписание занятий для групп и индивидуальных уроков',
        completed: false,
      },
      {
        id: '4',
        title: 'Добавьте учеников',
        description: 'Импортируйте или создайте профили учеников',
        completed: false,
      },
      {
        id: '5',
        title: 'Настройте тарифы',
        description: 'Установите цены на курсы и абонементы',
        completed: false,
      },
    ],
    teacher: [
      {
        id: '1',
        title: 'Заполните профиль',
        description: 'Укажите ваши предметы и квалификацию',
        completed: false,
      },
      {
        id: '2',
        title: 'Создайте первую группу',
        description: 'Добавьте группу и укажите расписание',
        completed: false,
      },
      {
        id: '3',
        title: 'Пригласите учеников',
        description: 'Отправьте приглашения вашим ученикам',
        completed: false,
      },
      {
        id: '4',
        title: 'Подготовьте материалы',
        description: 'Загрузите учебные материалы и планы уроков',
        completed: false,
      },
    ],
    student: [
      {
        id: '1',
        title: 'Заполните профиль',
        description: 'Укажите ваше имя и контактную информацию',
        completed: false,
      },
      {
        id: '2',
        title: 'Просмотрите расписание',
        description: 'Ознакомьтесь с расписанием ваших занятий',
        completed: false,
      },
      {
        id: '3',
        title: 'Проверьте домашние задания',
        description: 'Посмотрите текущие домашние задания',
        completed: false,
      },
    ],
    parent: [
      {
        id: '1',
        title: 'Добавьте детей',
        description: 'Укажите информацию о ваших детях',
        completed: false,
      },
      {
        id: '2',
        title: 'Просмотрите расписание',
        description: 'Ознакомьтесь с расписанием занятий детей',
        completed: false,
      },
      {
        id: '3',
        title: 'Настройте уведомления',
        description: 'Выберите способы получения уведомлений',
        completed: false,
      },
    ],
  };

  return stepsMap[role] || [];
}
