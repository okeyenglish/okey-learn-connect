import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UnifiedCRMHeader } from '@/components/crm/UnifiedCRMHeader';
import { useAuth } from '@/hooks/useAuth';
import { Suspense, lazy } from 'react';

// Lazy load компоненты
const CRM = lazy(() => import('./CRM'));
const TeacherPortal = lazy(() => import('./TeacherPortal'));
const StudentPortal = lazy(() => import('./StudentPortal'));
const Admin = lazy(() => import('./Admin'));

// Компоненты-заглушки для новых разделов
const ScheduleSection = lazy(() => import('@/components/crm/sections/ScheduleSection'));
const GroupsSection = lazy(() => import('@/components/crm/sections/GroupsSection'));
const ReportsSection = lazy(() => import('@/components/crm/sections/ReportsSection'));
const InternalChatsSection = lazy(() => import('@/components/internal-chats/InternalChatsSection'));
const ReferencesSection = lazy(() => import('@/components/references/ReferencesSection'));
const LeadsSection = lazy(() => import('@/components/leads/LeadsSection'));
const FinancesSection = lazy(() => import('@/components/finances/FinancesSection'));
const StudentsSection = lazy(() => import('@/components/students/StudentsSection'));
const SubscriptionsSection = lazy(() => import('@/components/subscriptions/SubscriptionsSection'));

const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="loading-spinner rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Загрузка...</p>
    </div>
  </div>
);

export default function UnifiedCRM() {
  const { role } = useAuth();
  const location = useLocation();

  // Определяем дефолтный маршрут в зависимости от роли
  const getDefaultRoute = () => {
    switch (role) {
      case 'teacher':
        return '/crm/teacher-portal';
      case 'student':
        return '/crm/student-portal';
      case 'admin':
      case 'methodist':
        return '/crm/main';
      default:
        return '/crm/main';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <UnifiedCRMHeader />
        
        <main className="flex-1">
          <Routes>
            {/* Главный маршрут - перенаправление на подходящую страницу */}
            <Route 
              path="/" 
              element={<Navigate to={getDefaultRoute().replace('/crm', '')} replace />} 
            />
            
            {/* Основная CRM страница */}
            <Route 
              path="/main" 
              element={
                <Suspense fallback={<LoadingComponent />}>
                  <CRM />
                </Suspense>
              } 
            />
            
            {/* Портал преподавателя */}
            <Route 
              path="/teacher-portal" 
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin', 'methodist']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <TeacherPortal />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Портал ученика */}
            <Route 
              path="/student-portal" 
              element={
                <ProtectedRoute allowedRoles={['student', 'admin']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <StudentPortal />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Администрирование */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'methodist']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <Admin />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Расписание */}
            <Route 
              path="/schedule" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'methodist']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <ScheduleSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Группы */}
            <Route 
              path="/groups" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'methodist']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <GroupsSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Отчеты */}
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'methodist']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <ReportsSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Внутренние чаты */}
            <Route 
              path="/internal-chats" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'methodist', 'teacher']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <InternalChatsSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Справочники и настройки */}
            <Route 
              path="/references" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'methodist']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <ReferencesSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Ученики и клиенты */}
            <Route 
              path="/students" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'methodist', 'teacher']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <StudentsSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Финансы */}
            <Route 
              path="/finances" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'accountant']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <FinancesSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />

            {/* Абонементы */}
            <Route 
              path="/subscriptions" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'accountant']}>
                  <Suspense fallback={<LoadingComponent />}>
                    <SubscriptionsSection />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Fallback для несуществующих маршрутов */}
            <Route path="*" element={<Navigate to="/main" replace />} />
          </Routes>
        </main>
      </div>
    </ProtectedRoute>
  );
}