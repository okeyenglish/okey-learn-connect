import ProtectedRoute from '@/components/ProtectedRoute';
import { TabsContent } from '@/components/ui/tabs';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';
import { TeacherHome } from '@/components/teacher/TeacherHome';
import { TeacherJournal } from '@/components/teacher/TeacherJournal';
import { TeacherMaterials } from '@/components/teacher/TeacherMaterials';
import { TeacherSchedule } from '@/components/teacher/TeacherSchedule';
import { TeacherSubstitutions } from '@/components/teacher/TeacherSubstitutions';
import { TeacherProfile } from '@/components/teacher/TeacherProfile';
import { TeacherChats } from '@/components/teacher/TeacherChats';

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
              {teacher && <TeacherJournal teacher={teacher} />}
            </TabsContent>

            <TabsContent value="materials">
              {teacher && <TeacherMaterials teacher={teacher} />}
            </TabsContent>

            <TabsContent value="schedule">
              {teacher && <TeacherSchedule teacher={teacher} />}
            </TabsContent>

            <TabsContent value="substitutions">
              {teacher && <TeacherSubstitutions teacher={teacher} />}
            </TabsContent>

            <TabsContent value="chats">
              {teacher && <TeacherChats teacher={teacher} />}
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
