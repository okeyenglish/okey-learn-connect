import { Card, CardContent } from "@/components/ui/card";
import OptimizedImage from "@/components/OptimizedImage";
import teacherFemale1 from "@/assets/teacher-female-1.png";
import teacherFemale2 from "@/assets/teacher-female-2.png";
import teacherFemale4 from "@/assets/teacher-female-4.png";
import teacherFemale5 from "@/assets/teacher-female-5.png";
import teacherFemale6 from "@/assets/teacher-female-6.png";
import teacherMale1 from "@/assets/teacher-male-1.png";
import teacherMale2 from "@/assets/teacher-male-2.png";
import teacherMale3 from "@/assets/teacher-male-3.png";
import teacherMale4 from "@/assets/teacher-male-4.png";
import teacherMale5 from "@/assets/teacher-male-5.png";

interface Teacher {
  id: string;
  name: string;
  specialization: string;
  image: string;
}

const teachers: Teacher[] = [
  {
    id: "1",
    name: "Анна Петрова",
    specialization: "Преподаватель по подготовке к международным экзаменам Cambridge",
    image: teacherFemale1
  },
  {
    id: "2",
    name: "Елена Смирнова",
    specialization: "Преподаватель по подготовке к государственным экзаменам",
    image: teacherFemale2
  },
  {
    id: "4",
    name: "Александр Козлов",
    specialization: "Преподаватель разговорного английского",
    image: teacherMale3
  },
  {
    id: "5",
    name: "Дмитрий Волков",
    specialization: "Преподаватель английского языка",
    image: teacherMale4
  },
  {
    id: "6",
    name: "Ольга Николаева",
    specialization: "Преподаватель английского для детей",
    image: teacherFemale4
  },
  {
    id: "7",
    name: "Юлия Морозова",
    specialization: "Преподаватель английского языка",
    image: teacherFemale5
  },
  {
    id: "8",
    name: "Emmanuel Mwazo",
    specialization: "Спикинг тренер",
    image: teacherMale5
  },
  {
    id: "9",
    name: "Светлана Федорова",
    specialization: "Методист и преподаватель английского языка",
    image: teacherFemale6
  },
  {
    id: "10",
    name: "Игорь Сидоров",
    specialization: "Преподаватель английского языка",
    image: teacherMale1
  },
  {
    id: "11",
    name: "Андрей Романов",
    specialization: "Преподаватель по подготовке к ЕГЭ и ОГЭ",
    image: teacherMale2
  }
];

interface TeachersSectionProps {
  branchName?: string;
  showTitle?: boolean;
  showAllTeachers?: boolean;
}

export const TeachersSection: React.FC<TeachersSectionProps> = ({ 
  branchName, 
  showTitle = true,
  showAllTeachers = false
}) => {
  // Show all teachers or random 4-6 teachers for each branch
  const displayedTeachers = showAllTeachers 
    ? teachers
    : teachers
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 4);

  return (
    <section className="py-12 bg-muted/20">
      <div className="container mx-auto px-4">
        {showTitle && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Наши преподаватели</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Сертифицированные специалисты с опытом от 5 лет
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedTeachers.map((teacher) => (
            <Card key={teacher.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden mb-4 bg-muted">
                    <OptimizedImage
                      src={teacher.image}
                      alt={`Преподаватель ${teacher.name}`}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{teacher.name}</h3>
                  <p className="text-sm text-muted-foreground">{teacher.specialization}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};