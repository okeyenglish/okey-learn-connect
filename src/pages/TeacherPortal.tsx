import ProtectedRoute from '@/components/ProtectedRoute';
import { TabsContent } from '@/components/ui/tabs';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';
import { TeacherHome } from '@/components/teacher/TeacherHome';
import { TeacherJournal } from '@/components/teacher/TeacherJournal';
import { TeacherMaterials } from '@/components/teacher/TeacherMaterials';
import { TeacherSchedule } from '@/components/teacher/TeacherSchedule';
import { TeacherSubstitutions } from '@/components/teacher/TeacherSubstitutions';
import { TeacherProfile } from '@/components/teacher/TeacherProfile';

export default function TeacherPortal() {
  return (
    <ProtectedRoute>
      <TeacherLayout>
        {({ teacher, isLoading, activeTab, setActiveTab }) => (
          <>
            <TabsContent value="home">
              {teacher && <TeacherHome teacher={teacher} />}
            </TabsContent>

            <TabsContent value="journal">
              <TeacherJournal />
            </TabsContent>

            <TabsContent value="materials">
              <TeacherMaterials />
            </TabsContent>

            <TabsContent value="schedule">
              <TeacherSchedule />
            </TabsContent>

            <TabsContent value="substitutions">
              <TeacherSubstitutions />
            </TabsContent>

            <TabsContent value="profile">
              {teacher && <TeacherProfile teacher={teacher} />}
            </TabsContent>
          </>
        )}
      </TeacherLayout>
    </ProtectedRoute>
  );
}
