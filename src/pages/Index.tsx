import SEO from '@/components/SEO';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import Hero from '@/components/landing/Hero';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import StickyCTA from '@/components/landing/StickyCTA';
import FloatingChat from '@/components/landing/FloatingChat';
import ScrollToTop from '@/components/landing/ScrollToTop';
import ProofBar from '@/components/landing/ProofBar';
import { LazySection } from '@/components/common/LazyLoadWrapper';
import { lazy, Suspense } from 'react';

// Above the fold - load immediately
// Hero, Header, ProofBar, StickyCTA already imported

// Below the fold - lazy load
const CrossPlatformSection = lazy(() => import('@/components/landing/CrossPlatformSection'));
const AIShowcase = lazy(() => import('@/components/landing/AIShowcase'));
const LiveStats = lazy(() => import('@/components/landing/LiveStats'));
const TechStack = lazy(() => import('@/components/landing/TechStack'));
const ClientLogos = lazy(() => import('@/components/landing/ClientLogos'));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks'));
const RolesTabs = lazy(() => import('@/components/landing/RolesTabs'));
const Features = lazy(() => import('@/components/landing/Features'));
const Testimonials = lazy(() => import('@/components/landing/Testimonials'));
const CaseStudies = lazy(() => import('@/components/landing/CaseStudies'));
const HowToStart = lazy(() => import('@/components/landing/HowToStart'));
const Integrations = lazy(() => import('@/components/landing/Integrations'));
const WhoIsItFor = lazy(() => import('@/components/landing/WhoIsItFor'));
const Pricing = lazy(() => import('@/components/landing/Pricing'));
const Roadmap = lazy(() => import('@/components/landing/Roadmap'));
const Comparison = lazy(() => import('@/components/landing/Comparison'));
const FAQ = lazy(() => import('@/components/landing/FAQ'));
const FinalCTA = lazy(() => import('@/components/landing/FinalCTA'));

const LoadingPlaceholder = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Загрузка...</div>
  </div>
);

export default function Index() {
  useSmoothScroll();

  return (
    <>
      <SEO />
      <div className="min-h-screen bg-background">
        <Header />
        <ProofBar />
        <StickyCTA />
        <FloatingChat />
        <ScrollToTop />
        <main>
          <Hero />
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <CrossPlatformSection />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <AIShowcase />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <LiveStats />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <HowItWorks />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <ClientLogos />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <TechStack />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <RolesTabs />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Features />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Testimonials />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <CaseStudies />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <HowToStart />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Integrations />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <WhoIsItFor />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Pricing />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Roadmap />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Comparison />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <FAQ />
            </Suspense>
          </LazySection>
          
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <FinalCTA />
            </Suspense>
          </LazySection>
        </main>
        <Footer />
      </div>
    </>
  );
}
