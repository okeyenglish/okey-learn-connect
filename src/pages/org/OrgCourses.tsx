import { useOutletContext } from 'react-router-dom';
import { PublicOrganization } from '@/hooks/useOrganizationPublic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Clock, Star } from 'lucide-react';

interface OrgContext {
  org: PublicOrganization;
}

const SAMPLE_COURSES = [
  {
    id: 1,
    title: 'Английский для детей',
    description: 'Увлекательные занятия для детей от 4 до 12 лет',
    level: 'Начальный',
    duration: '45 мин',
    groupSize: '6-8 чел',
    popular: true,
  },
  {
    id: 2,
    title: 'Английский для подростков',
    description: 'Подготовка к экзаменам и развитие разговорных навыков',
    level: 'Средний',
    duration: '60 мин',
    groupSize: '8-10 чел',
    popular: false,
  },
  {
    id: 3,
    title: 'Английский для взрослых',
    description: 'Бизнес-английский и общий курс для работы и путешествий',
    level: 'Любой',
    duration: '90 мин',
    groupSize: '6-8 чел',
    popular: true,
  },
  {
    id: 4,
    title: 'Подготовка к ЕГЭ/ОГЭ',
    description: 'Интенсивная подготовка к государственным экзаменам',
    level: 'Продвинутый',
    duration: '90 мин',
    groupSize: '4-6 чел',
    popular: false,
  },
];

export const OrgCourses = () => {
  const { org } = useOutletContext<OrgContext>();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">Наши курсы</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Выберите программу обучения, которая подходит именно вам
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SAMPLE_COURSES.map((course) => (
          <Card key={course.id} className="relative overflow-hidden">
            {course.popular && (
              <Badge className="absolute top-4 right-4 gap-1">
                <Star className="h-3 w-3" />
                Популярный
              </Badge>
            )}
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{course.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{course.description}</p>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <Badge variant="secondary">{course.level}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {course.groupSize}
                </div>
              </div>

              <Button variant="outline" className="w-full">
                Подробнее
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrgCourses;
