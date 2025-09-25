import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CourseLesson {
  id: string;
  lesson_number: number;
  title: string;
  objectives?: string;
  lesson_structure?: string;
  homework?: string;
  materials?: string;
  unit_id: string;
  unit_title?: string;
  unit_number?: number;
}

export interface CourseUnitWithLessons {
  id: string;
  unit_number: number;
  title: string;
  description?: string;
  vocabulary?: string;
  grammar?: string;
  lessons_count: number;
  lessons: CourseLesson[];
}

export const useCourseUnitsWithLessons = (courseSlug?: string) => {
  return useQuery({
    queryKey: ['course-units-with-lessons', courseSlug],
    queryFn: async () => {
      if (!courseSlug) return [];

      // Получаем курс
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('slug', courseSlug)
        .single();

      if (courseError || !course) {
        throw new Error(`Course not found: ${courseSlug}`);
      }

      // Получаем юниты с уроками
      const { data: units, error: unitsError } = await supabase
        .from('course_units')
        .select(`
          id,
          unit_number,
          title,
          description,
          vocabulary,
          grammar,
          lessons_count,
          lessons (
            id,
            lesson_number,
            title,
            objectives,
            lesson_structure,
            homework,
            materials
          )
        `)
        .eq('course_id', course.id)
        .order('unit_number');

      if (unitsError) {
        throw new Error('Failed to fetch course units');
      }

      // Преобразуем данные в нужный формат
      return (units || []).map((unit: any) => ({
        ...unit,
        lessons: (unit.lessons || [])
          .sort((a: any, b: any) => a.lesson_number - b.lesson_number)
          .map((lesson: any) => ({
            ...lesson,
            unit_id: unit.id,
            unit_title: unit.title,
            unit_number: unit.unit_number
          }))
      })) as CourseUnitWithLessons[];
    },
    enabled: !!courseSlug,
  });
};

// Хелпер для получения урока по номеру для конкретного курса
export const getLessonByCourseAndNumber = (units: CourseUnitWithLessons[], lessonNumber: number): CourseLesson | null => {
  for (const unit of units) {
    const lesson = unit.lessons.find(l => l.lesson_number === lessonNumber);
    if (lesson) {
      return lesson;
    }
  }
  return null;
};

// Хелпер для получения всех уроков курса в плоском списке
export const getAllCourseLessons = (units: CourseUnitWithLessons[]): CourseLesson[] => {
  return units.flatMap(unit => unit.lessons).sort((a, b) => a.lesson_number - b.lesson_number);
};