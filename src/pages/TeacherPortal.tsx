import ProtectedRoute from '@/components/ProtectedRoute';
import { TabsContent } from '@/components/ui/tabs';
import { TeacherLayout } from '@/components/teacher/TeacherLayout';
import { TeacherHome } from '@/components/teacher/TeacherHome';
import { TeacherJournal } from '@/components/teacher/TeacherJournal';
import { TeacherMaterials } from '@/components/teacher/TeacherMaterials';
import { TeacherSchedule } from '@/components/teacher/TeacherSchedule';
import { TeacherSubstitutions } from '@/components/teacher/TeacherSubstitutions';
import { TeacherProfile } from '@/components/teacher/TeacherProfile';
import { TeacherAIHub } from '@/components/teacher/TeacherAIHub';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function TeacherPortal() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <TeacherLayout>
        {({ teacher, isLoading, activeTab, setActiveTab, selectedBranchId, branches }) => (
          <>
            <TabsContent value="home">
              {teacher && activeTab === 'home' && (
                <TeacherHome teacher={teacher} selectedBranchId={selectedBranchId} />
              )}
            </TabsContent>

            <TabsContent value="journal">
              {teacher && activeTab === 'journal' && (
                <TeacherJournal teacher={teacher} selectedBranchId={selectedBranchId} />
              )}
            </TabsContent>

            <TabsContent value="materials">
              {teacher && activeTab === 'materials' && (
                <TeacherMaterials teacher={teacher} selectedBranchId={selectedBranchId} />
              )}
            </TabsContent>

            <TabsContent value="schedule">
              {teacher && activeTab === 'schedule' && (
                <TeacherSchedule teacher={teacher} selectedBranchId={selectedBranchId} />
              )}
            </TabsContent>

            <TabsContent value="substitutions">
              {teacher && activeTab === 'substitutions' && (
                <TeacherSubstitutions teacher={teacher} selectedBranchId={selectedBranchId} />
              )}
            </TabsContent>

            <TabsContent value="profile">
              {teacher && activeTab === 'profile' && (
                <TeacherProfile teacher={teacher} />
              )}
            </TabsContent>

            <TabsContent value="ai-hub">
              {teacher && activeTab === 'ai-hub' && (
                <TeacherAIHub teacher={teacher} />
              )}
            </TabsContent>
          </>
        )}
      </TeacherLayout>
    </ProtectedRoute>
    </ErrorBoundary>
  );
}
