import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import ScrollToTop from "@/components/ScrollToTop";
import { lazy, Suspense } from "react";

// Immediate load for critical pages
import Index from "./pages/Index";

// Lazy load all other pages for better code splitting
const SuperSafari = lazy(() => import("./pages/programs/SuperSafari"));
const KidsBox = lazy(() => import("./pages/programs/KidsBox"));
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
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for better UX
const LoadingComponent = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="loading-spinner rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Загрузка...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isCRMPage = location.pathname === '/newcrm';

  console.log("AppContent rendering, location:", location.pathname, "isCRMPage:", isCRMPage);

  if (isCRMPage) {
    return (
      <Suspense fallback={<LoadingComponent />}>
        <CRM />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">
        <Routes>
          <Route path="/" element={<Index />} />
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
            <Suspense fallback={<LoadingComponent />}>
              <Admin />
            </Suspense>
          } />
          <Route path="/newcrm" element={
            <Suspense fallback={<LoadingComponent />}>
              <CRM />
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;