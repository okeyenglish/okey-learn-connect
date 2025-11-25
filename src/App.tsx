import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { queryConfig } from "@/lib/queryConfig";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ScrollToTop from "@/components/ScrollToTop";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Immediate load for critical pages
import Index from "./pages/Index";

// Lazy load all other pages for better code splitting
const SuperSafari = lazy(() => import("./pages/programs/SuperSafari"));
const KidsBox = lazy(() => import("./pages/programs/KidsBox"));
const ProgramsCourseDetails = lazy(() => import("./pages/programs/CourseDetails"));
const Prepare = lazy(() => import("./pages/programs/Prepare"));
const Empower = lazy(() => import("./pages/programs/Empower"));
const Programs = lazy(() => import("./pages/Programs"));
const MiniSadik = lazy(() => import("./pages/programs/MiniSadik"));
const Workshop = lazy(() => import("./pages/programs/Workshop"));
const SpeakingClub = lazy(() => import("./pages/programs/SpeakingClub"));
const Branches = lazy(() => import("./pages/Branches"));
const LocationKotelniki = lazy(() => import("./pages/branches/Kotelniki"));
const LocationNovokosino = lazy(() => import("./pages/branches/Novokosino"));
const LocationOkskaya = lazy(() => import("./pages/branches/Okskaya"));
const LocationStakhanovskaya = lazy(() => import("./pages/branches/Stakhanovskaya"));
const Test = lazy(() => import("./pages/Test"));
const About = lazy(() => import("./pages/About"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Pricing = lazy(() => import("./pages/Pricing"));
const FAQ = lazy(() => import("./pages/FAQ"));
const LocationSolntsevo = lazy(() => import("./pages/branches/Solntsevo"));
const LocationMytishchi = lazy(() => import("./pages/branches/Mytishchi"));
const LocationLyubertsy1 = lazy(() => import("./pages/branches/Lyubertsy1"));
const LocationLyubertsy2 = lazy(() => import("./pages/branches/Lyubertsy2"));
const LocationOnline = lazy(() => import("./pages/branches/Online"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactMethod = lazy(() => import("./pages/ContactMethod"));
const Admin = lazy(() => import("./pages/Admin"));
const CRM = lazy(() => import("./pages/CRM"));
const UnifiedCRM = lazy(() => import("./pages/UnifiedCRM"));
const Leads = lazy(() => import("./pages/Leads"));
const StudentPortal = lazy(() => import("./pages/StudentPortal"));
const TeacherPortal = lazy(() => import("./pages/TeacherPortal"));
const GroupDetailView = lazy(() => import("./components/teacher/GroupDetailView"));
const OnlineLesson = lazy(() => import("./pages/OnlineLesson"));
const Auth = lazy(() => import("./pages/Auth"));
const StudentCourseDetails = lazy(() => import('./pages/CourseDetails'));
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
  const isCRMPage = location.pathname === '/newcrm';
  const isPortalPage = location.pathname === '/student-portal' || location.pathname === '/teacher-portal' || location.pathname === '/methodist-portal' || location.pathname.startsWith('/teacher-group/');
  const isProgramsPage = location.pathname === '/programs' || location.pathname.startsWith('/programs/');

  if (isCRMPage) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <CRM />
      </Suspense>
    );
  }

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

  if (isProgramsPage) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pb-16 lg:pb-0">
          <Routes>
            <Route path="/programs" element={
              <Suspense fallback={<LoadingComponent />}>
                <Programs />
              </Suspense>
            } />
            <Route path="/programs/supersafari" element={
              <Suspense fallback={<LoadingComponent />}>
                <SuperSafari />
              </Suspense>
            } />
            <Route path="/programs/kidsbox" element={
              <Suspense fallback={<LoadingComponent />}>
                <KidsBox />
              </Suspense>
            } />
            <Route path="/course-details/:courseSlug" element={
              <Suspense fallback={<LoadingComponent />}>
                <ProgramsCourseDetails />
              </Suspense>
            } />
            <Route path="/programs/prepare" element={
              <Suspense fallback={<LoadingComponent />}>
                <Prepare />
              </Suspense>
            } />
            <Route path="/programs/empower" element={
              <Suspense fallback={<LoadingComponent />}>
                <Empower />
              </Suspense>
            } />
            <Route path="/programs/minisadik" element={
              <Suspense fallback={<LoadingComponent />}>
                <MiniSadik />
              </Suspense>
            } />
            <Route path="/programs/workshop" element={
              <Suspense fallback={<LoadingComponent />}>
                <Workshop />
              </Suspense>
            } />
            <Route path="/programs/speaking-club" element={
              <Suspense fallback={<LoadingComponent />}>
                <SpeakingClub />
              </Suspense>
            } />
          </Routes>
        </main>
        <Footer />
        <ChatBot />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/main" element={<Index />} />
          <Route path="/branches" element={
            <Suspense fallback={<LoadingComponent />}>
              <Branches />
            </Suspense>
          } />
          <Route path="/branches/kotelniki" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationKotelniki />
            </Suspense>
          } />
          <Route path="/branches/novokosino" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationNovokosino />
            </Suspense>
          } />
          <Route path="/branches/okskaya" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationOkskaya />
            </Suspense>
          } />
          <Route path="/branches/stakhanovskaya" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationStakhanovskaya />
            </Suspense>
          } />
          <Route path="/branches/solntsevo" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationSolntsevo />
            </Suspense>
          } />
          <Route path="/branches/mytishchi" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationMytishchi />
            </Suspense>
          } />
          <Route path="/branches/lyubertsy-1" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationLyubertsy1 />
            </Suspense>
          } />
          <Route path="/branches/lyubertsy-2" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationLyubertsy2 />
            </Suspense>
          } />
          <Route path="/branches/online" element={
            <Suspense fallback={<LoadingComponent />}>
              <LocationOnline />
            </Suspense>
          } />
          <Route path="/test" element={
            <Suspense fallback={<LoadingComponent />}>
              <Test />
            </Suspense>
          } />
          <Route path="/about" element={
            <Suspense fallback={<LoadingComponent />}>
              <About />
            </Suspense>
          } />
          <Route path="/teachers" element={
            <Suspense fallback={<LoadingComponent />}>
              <Teachers />
            </Suspense>
          } />
          <Route path="/reviews" element={
            <Suspense fallback={<LoadingComponent />}>
              <Reviews />
            </Suspense>
          } />
          <Route path="/pricing" element={
            <Suspense fallback={<LoadingComponent />}>
              <Pricing />
            </Suspense>
          } />
          <Route path="/faq" element={
            <Suspense fallback={<LoadingComponent />}>
              <FAQ />
            </Suspense>
          } />
          <Route path="/contacts" element={
            <Suspense fallback={<LoadingComponent />}>
              <Contacts />
            </Suspense>
          } />
          <Route path="/contact-method" element={
            <Suspense fallback={<LoadingComponent />}>
              <ContactMethod />
            </Suspense>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Suspense fallback={<LoadingComponent />}>
                <Admin />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/newcrm" element={
            <Suspense fallback={<LoadingComponent />}>
              <CRM />
            </Suspense>
          } />
          <Route path="/crm/*" element={
            <Suspense fallback={<LoadingComponent />}>
              <UnifiedCRM />
            </Suspense>
          } />
          <Route path="/leads" element={
            <Suspense fallback={<LoadingComponent />}>
              <Leads />
            </Suspense>
          } />
          <Route path="/student/:studentId" element={
            <Suspense fallback={<LoadingComponent />}>
              <StudentPortal />
            </Suspense>
          } />
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
          <Route path="/course/:courseId" element={
            <Suspense fallback={<LoadingComponent />}>
              <StudentCourseDetails />
            </Suspense>
          } />
          <Route path="/course/:courseId/live" element={
            <Suspense fallback={<LoadingComponent />}> 
              <OnlineLesson />
            </Suspense>
          } />
          {/* Public course details (programs) route accessible outside /programs section */}
          <Route path="/course-details/:courseSlug" element={
            <Suspense fallback={<LoadingComponent />}> 
              <ProgramsCourseDetails />
            </Suspense>
          } />
          <Route path="/online-lesson/:lessonId" element={
            <Suspense fallback={<LoadingComponent />}> 
              <OnlineLesson />
            </Suspense>
          } />
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
      </main>
      <Footer />
      <ChatBot />
    </div>
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
            <ScrollToTop />
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;