import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, GraduationCap, Phone, Mail } from "lucide-react";
import { questionBank } from "@/lib/questionBank";

interface TestState {
  track: 'kids' | 'adults';
  name: string;
  ageOrGrade: string;
  phone: string;
  email: string;
  currentLevel: string;
  currentQuestionIndex: number;
  levelQuestionCount: number;
  answers: Array<{
    id: string;
    given: string;
    correct: boolean;
    level: string;
  }>;
  totalQuestions: number;
  timeSpent: number;
  finalLevel: string;
}

interface Question {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  answer: string;
}

export default function PlacementTestComponent() {
  const [screen, setScreen] = useState<'selection' | 'test' | 'result'>('selection');
  const [testState, setTestState] = useState<TestState>({
    track: 'kids',
    name: '',
    ageOrGrade: '',
    phone: '',
    email: '',
    currentLevel: '',
    currentQuestionIndex: 0,
    levelQuestionCount: 0,
    answers: [],
    totalQuestions: 0,
    timeSpent: 0,
    finalLevel: ''
  });
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [startTime, setStartTime] = useState<number>(0);

  // Timer logic
  useEffect(() => {
    if (screen === 'test' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && screen === 'test') {
      // Auto-submit when time runs out
      handleAnswer('');
    }
  }, [timeLeft, screen]);

  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startTest = () => {
    if (!testState.name.trim()) return;
    
    const initialLevel = testState.track === 'kids' ? 'A1' : 'A1';
    const newState = {
      ...testState,
      currentLevel: initialLevel,
      currentQuestionIndex: 0,
      levelQuestionCount: 0
    };
    
    setTestState(newState);
    setStartTime(Date.now());
    loadNextQuestion(newState);
    setScreen('test');
  };

  const loadNextQuestion = (state: TestState) => {
    const levels = questionBank[state.track].levels;
    const blocks = questionBank[state.track].blocks;
    const questions = blocks[state.currentLevel as keyof typeof blocks];
    
    if (questions && state.levelQuestionCount < 4) {
      const question = questions[state.levelQuestionCount];
      setCurrentQuestion({
        ...question,
        options: shuffleArray(question.options)
      });
      setTimeLeft(45);
    } else {
      // Level completed, determine next action
      evaluateLevel(state);
    }
  };

  const evaluateLevel = (state: TestState) => {
    const levelAnswers = state.answers.slice(-4);
    const correctCount = levelAnswers.filter(a => a.correct).length;
    
    const levels = questionBank[state.track].levels;
    const currentLevelIndex = levels.indexOf(state.currentLevel);
    
    let nextLevel = state.currentLevel;
    let shouldContinue = true;

    if (correctCount >= 3) {
      // Move up if possible
      if (currentLevelIndex < levels.length - 1) {
        nextLevel = levels[currentLevelIndex + 1];
      } else {
        // At highest level, check for C1 for adults
        if (state.track === 'adults' && state.currentLevel === 'B2') {
          nextLevel = 'C1';
        } else {
          shouldContinue = false;
        }
      }
    } else if (correctCount <= 1) {
      // Move down if possible
      if (currentLevelIndex > 0) {
        nextLevel = levels[currentLevelIndex - 1];
      } else {
        shouldContinue = false;
      }
    } else {
      // 2/4 correct - fix level
      shouldContinue = false;
    }

    const maxQuestions = state.track === 'kids' ? 16 : 20;
    
    if (!shouldContinue || state.totalQuestions >= maxQuestions) {
      // Finish test
      finishTest(state, state.currentLevel);
    } else {
      // Continue with next level
      const newState = {
        ...state,
        currentLevel: nextLevel,
        levelQuestionCount: 0
      };
      setTestState(newState);
      loadNextQuestion(newState);
    }
  };

  const finishTest = (state: TestState, finalLevel: string) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    setTestState({
      ...state,
      finalLevel,
      timeSpent
    });

    // Send webhook data
    const webhookData = {
      track: state.track,
      name: state.name,
      age_or_grade: state.ageOrGrade,
      phone: state.phone,
      email: state.email,
      answers: state.answers,
      raw_score: state.answers.filter(a => a.correct).length,
      final_level: finalLevel,
      time_spent_sec: timeSpent,
      utm: { source: 'site', campaign: 'placement' }
    };

    console.log('Test completed:', webhookData);
    setScreen('result');
  };

  const handleAnswer = (answer: string) => {
    if (!currentQuestion) return;

    const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();
    const newAnswer = {
      id: currentQuestion.id,
      given: answer,
      correct: isCorrect,
      level: testState.currentLevel
    };

    const newState = {
      ...testState,
      answers: [...testState.answers, newAnswer],
      levelQuestionCount: testState.levelQuestionCount + 1,
      totalQuestions: testState.totalQuestions + 1
    };

    setTestState(newState);
    loadNextQuestion(newState);
  };

  const getLevelDescription = (level: string, track: string) => {
    const descriptions = {
      kids: {
        'Pre-A1': 'Начинаем с азов: цвета, числа, простые фразы. Рекомендуем Kids Box Starter. Запишем на пробный?',
        'A1': 'Уже строит короткие фразы и понимает простые диалоги. Подойдут группы Kids Box 2–3.',
        'A2': 'Уверенно понимает и говорит на базовые темы. Рассмотрите переход к Prepare для подростков (по возрасту).'
      },
      adults: {
        'A0': 'Старт с нуля: алфавит, базовая лексика, простые конструкции. Курс Empower A0–A1.',
        'A1': 'Повседневные темы, простые диалоги. Empower A1–A2.',
        'A2': 'Уверенный базовый уровень, начинаем говорить свободнее. Empower A2–B1.',
        'B1': 'Свободнее общение в поездках/работе. Empower B1–B2.',
        'B2': 'Уверенный разговорный/деловой. Подготовка к FCE/CAE.',
        'B2/C1': 'Продвинутый. Рассмотрите CAE/IELTS-трек.'
      }
    };
    
    return descriptions[track as keyof typeof descriptions][level as keyof typeof descriptions.kids] || 'Уровень определен';
  };

  if (screen === 'selection') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <Card className="card-elevated">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-4">Выберите тип теста</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  testState.track === 'kids' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setTestState({...testState, track: 'kids'})}
              >
                <CardContent className="p-6 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-2">Дети 6–10 лет</h3>
                  <p className="text-sm text-muted-foreground">Pre-A1, A1, A2</p>
                </CardContent>
              </Card>
              
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  testState.track === 'adults' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setTestState({...testState, track: 'adults'})}
              >
                <CardContent className="p-6 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-2">Подростки/Взрослые 11+</h3>
                  <p className="text-sm text-muted-foreground">A0, A1, A2, B1, B2, C1</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Имя *</Label>
                <Input
                  id="name"
                  value={testState.name}
                  onChange={(e) => setTestState({...testState, name: e.target.value})}
                  placeholder="Введите ваше имя"
                  required
                />
              </div>

              <div>
                <Label htmlFor="ageOrGrade">
                  {testState.track === 'kids' ? 'Возраст/Класс' : 'Возраст'}
                </Label>
                <Input
                  id="ageOrGrade"
                  value={testState.ageOrGrade}
                  onChange={(e) => setTestState({...testState, ageOrGrade: e.target.value})}
                  placeholder={testState.track === 'kids' ? '8 лет / 2 класс' : '25 лет'}
                />
              </div>

              <div>
                <Label htmlFor="phone">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Телефон (необязательно)
                </Label>
                <Input
                  id="phone"
                  value={testState.phone}
                  onChange={(e) => setTestState({...testState, phone: e.target.value})}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div>
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-1" />
                  E-mail (необязательно)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={testState.email}
                  onChange={(e) => setTestState({...testState, email: e.target.value})}
                  placeholder="example@email.com"
                />
              </div>
            </div>

            <Button 
              onClick={startTest} 
              variant="hero" 
              size="lg" 
              className="w-full"
              disabled={!testState.name.trim()}
            >
              Начать тест
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Это экспресс-оценка. Итоговый уровень уточним на бесплатном пробном уроке.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screen === 'test' && currentQuestion) {
    const progress = (testState.totalQuestions / (testState.track === 'kids' ? 16 : 20)) * 100;
    
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Вопрос {testState.totalQuestions + 1} • Уровень {testState.currentLevel}
          </div>
        </div>

        <Progress value={progress} className="w-full" />

        <Card className="card-elevated">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {currentQuestion.prompt}
              </h2>
            </div>

            <div className="grid gap-3">
              {currentQuestion.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="lg"
                  className="justify-start text-left p-6 h-auto whitespace-normal hover:bg-primary hover:text-primary-foreground transition-all"
                  onClick={() => handleAnswer(option)}
                >
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mr-4 text-sm font-semibold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {option}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {timeLeft <= 10 && (
              <span className="text-orange-500 font-medium">
                ⏰ Осталось {timeLeft} секунд
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (screen === 'result') {
    const correctAnswers = testState.answers.filter(a => a.correct).length;
    const totalAnswers = testState.answers.length;
    const percentage = Math.round((correctAnswers / totalAnswers) * 100);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="card-elevated text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-bold mb-4">
              Ваш уровень: <span className="text-gradient">{testState.finalLevel}</span>
            </h2>

            <div className="bg-background border rounded-lg p-4 mb-6">
              <p className="text-muted-foreground mb-2">
                Правильных ответов: {correctAnswers} из {totalAnswers} ({percentage}%)
              </p>
              <p className="text-sm text-muted-foreground">
                Время тестирования: {Math.floor(testState.timeSpent / 60)} мин {testState.timeSpent % 60} сек
              </p>
            </div>

            <p className="text-lg mb-8">
              {getLevelDescription(testState.finalLevel, testState.track)}
            </p>

            <div className="space-y-4">
              <Button variant="hero" size="lg" className="w-full">
                📞 Записаться на пробный урок
              </Button>
              
              <Button variant="outline" size="lg" className="w-full">
                🎁 Получить купон 5000 ₽
              </Button>
            </div>

            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Спасибо за прохождение теста! Наш менеджер свяжется с вами для уточнения деталей.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}