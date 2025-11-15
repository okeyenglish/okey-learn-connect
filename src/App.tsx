import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { queryConfig } from "@/lib/queryConfig";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy load CRM and admin pages
const Admin = lazy(() => import("./pages/Admin"));
const UnifiedCRM = lazy(() => import("./pages/UnifiedCRM"));
const StudentPortal = lazy(() => import("./pages/StudentPortal"));
const TeacherPortal = lazy(() => import("./pages/TeacherPortal"));
const GroupDetailView = lazy(() => import("./components/teacher/GroupDetailView"));
const OnlineLesson = lazy(() => import("./pages/OnlineLesson"));
const Auth = lazy(() => import("./pages/Auth"));
const TestUserCreator = lazy(() => import('./pages/TestUserCreator'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const TeacherRegistration = lazy(() => import('./pages/auth/TeacherRegistration'));
const SupabaseDiagnostics = lazy(() => import('./pages/SupabaseDiagnostics'));
const HolihopeImport = lazy(() => import('./pages/HolihopeImport'));
const SeoManager = lazy(() => import('./pages/SeoManager'));
const CallsForTeachers = lazy(() => import('./pages/CallsForTeachers'));
const PaymentSystemTest = lazy(() => import('./pages/PaymentSystemTest'));
const BalanceSystemTest = lazy(() => import('./pages/BalanceSystemTest'));
const TeacherPortalTest = lazy(() => import('./pages/TeacherPortalTest'));
const NotFound = lazy(() => import("./pages/NotFound"));
const WhatsAppSessions = lazy(() => import("./pages/WhatsAppSessions"));

// Loading component for better UX
const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="loading-spinner rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Загрузка...</p>
    </div>
  </div>
);

// Создаем Query Client один раз на верхнем уровне модуля
const queryClient = new QueryClient({
  defaultOptions: queryConfig,
});

const AppContent = () => {
  const location = useLocation();
  const isPortalPage = location.pathname === '/student-portal' || location.pathname === '/teacher-portal' || location.pathname.startsWith('/teacher-group/');

  if (isPortalPage) {
    return (
      <Routes>
        <Route path="/student-portal" element={
          <Suspense fallback={<LoadingComponent />}>
            <StudentPortal />
          </Suspense>
        } />
        <Route path="/teacher-portal" element={
          <Suspense fallback={<LoadingComponent />}>
            <TeacherPortal />
          </Suspense>
        } />
        <Route path="/teacher-group/:groupId" element={
          <Suspense fallback={<LoadingComponent />}>
            <GroupDetailView />
          </Suspense>
        } />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Redirect root to CRM */}
      <Route path="/" element={<Navigate to="/crm/main" replace />} />
      
      {/* CRM Routes */}
      <Route path="/crm/*" element={
        <Suspense fallback={<LoadingComponent />}>
          <UnifiedCRM />
        </Suspense>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Suspense fallback={<LoadingComponent />}>
            <Admin />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Auth Routes */}
      <Route path="/auth" element={
        <Suspense fallback={<LoadingComponent />}>
          <Auth />
        </Suspense>
      } />
      <Route path="/auth/callback" element={
        <Suspense fallback={<LoadingComponent />}>
          <AuthCallback />
        </Suspense>
      } />
      <Route path="/auth/forgot-password" element={
        <Suspense fallback={<LoadingComponent />}>
          <ForgotPassword />
        </Suspense>
      } />
      <Route path="/auth/reset-password" element={
        <Suspense fallback={<LoadingComponent />}>
          <ResetPassword />
        </Suspense>
      } />
      <Route path="/register/teacher/:token" element={
        <Suspense fallback={<LoadingComponent />}>
          <TeacherRegistration />
        </Suspense>
      } />
      
      {/* Online Lesson */}
      <Route path="/online-lesson/:lessonId" element={
        <Suspense fallback={<LoadingComponent />}>
          <OnlineLesson />
        </Suspense>
      } />
      
      {/* Utility Routes */}
      <Route path="/diag" element={
        <Suspense fallback={<LoadingComponent />}>
          <SupabaseDiagnostics />
        </Suspense>
      } />
      <Route path="/test-user" element={
        <Suspense fallback={<LoadingComponent />}>
          <TestUserCreator />
        </Suspense>
      } />
      <Route path="/holihope-import" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Suspense fallback={<LoadingComponent />}>
            <HolihopeImport />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/seo" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingComponent />}>
            <SeoManager />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/callsforteachers" element={
        <Suspense fallback={<LoadingComponent />}>
          <CallsForTeachers />
        </Suspense>
      } />
      <Route path="/payment-test" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Suspense fallback={<LoadingComponent />}>
            <PaymentSystemTest />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/balance-test" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Suspense fallback={<LoadingComponent />}>
            <BalanceSystemTest />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/teacher-portal-test" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Suspense fallback={<LoadingComponent />}>
            <TeacherPortalTest />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/whatsapp-sessions" element={
        <ProtectedRoute allowedRoles={['admin', 'manager', 'methodist']}>
          <Suspense fallback={<LoadingComponent />}>
            <WhatsAppSessions />
          </Suspense>
        </ProtectedRoute>
      } />
      
      {/* Fallback Routes */}
      <Route path="/5000" element={
        <Suspense fallback={<LoadingComponent />}>
          <NotFound />
        </Suspense>
      } />
      <Route path="*" element={
        <Suspense fallback={<LoadingComponent />}>
          <NotFound />
        </Suspense>
      } />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;