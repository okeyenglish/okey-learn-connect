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

// Below the fold - lazy load (according to TZ structure)
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const AIAssistantSection = lazy(() => import('@/components/landing/AIAssistantSection').then(m => ({ default: m.AIAssistantSection })));
const BeforeAfterSection = lazy(() => import('@/components/landing/BeforeAfterSection').then(m => ({ default: m.BeforeAfterSection })));
const CapabilitiesSection = lazy(() => import('@/components/landing/CapabilitiesSection').then(m => ({ default: m.CapabilitiesSection })));
const SecuritySection = lazy(() => import('@/components/landing/SecuritySection').then(m => ({ default: m.SecuritySection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));

// Existing sections
const Testimonials = lazy(() => import('@/components/landing/Testimonials'));
const Pricing = lazy(() => import('@/components/landing/Pricing'));
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
        <StickyCTA />
        <FloatingChat />
        <ScrollToTop />
        <main>
          <Hero />
          
          {/* 2. Блок доверия и масштаб */}
          <ProofBar />
          
          {/* 4. Как это работает - пошаговый процесс */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <HowItWorksSection />
            </Suspense>
          </LazySection>
          
          {/* 5. AI-ассистент (тёмный фон) */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <AIAssistantSection />
            </Suspense>
          </LazySection>
          
          {/* 7. Возможности Академиус */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <CapabilitiesSection />
            </Suspense>
          </LazySection>
          
          {/* 8. Было/Стало с переключателем ролей */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <BeforeAfterSection />
            </Suspense>
          </LazySection>
          
          {/* 9. Лицензии, технологии и безопасность */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <SecuritySection />
            </Suspense>
          </LazySection>
          
          {/* 10. Кейсы и отзывы */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Testimonials />
            </Suspense>
          </LazySection>
          
          {/* 11. Тарифы */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <Pricing />
            </Suspense>
          </LazySection>
          
          {/* 12. FAQ */}
          <LazySection fallback={<LoadingPlaceholder />}>
            <Suspense fallback={<LoadingPlaceholder />}>
              <FAQSection />
            </Suspense>
          </LazySection>
          
          {/* Финальный CTA */}
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
