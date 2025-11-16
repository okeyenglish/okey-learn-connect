import SEO from '@/components/SEO';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import Hero from '@/components/landing/Hero';
import CrossPlatformSection from '@/components/landing/CrossPlatformSection';
import AIShowcase from '@/components/landing/AIShowcase';
import LiveStats from '@/components/landing/LiveStats';
import TechStack from '@/components/landing/TechStack';
import ClientLogos from '@/components/landing/ClientLogos';
import HowItWorks from '@/components/landing/HowItWorks';
import RolesTabs from '@/components/landing/RolesTabs';
import Features from '@/components/landing/Features';
import Testimonials from '@/components/landing/Testimonials';
import CaseStudies from '@/components/landing/CaseStudies';
import HowToStart from '@/components/landing/HowToStart';
import Integrations from '@/components/landing/Integrations';
import WhoIsItFor from '@/components/landing/WhoIsItFor';
import Pricing from '@/components/landing/Pricing';
import Comparison from '@/components/landing/Comparison';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import StickyCTA from '@/components/landing/StickyCTA';
import FloatingChat from '@/components/landing/FloatingChat';
import ScrollToTop from '@/components/landing/ScrollToTop';
import ProofBar from '@/components/landing/ProofBar';
import Roadmap from '@/components/landing/Roadmap';

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
        <CrossPlatformSection />
        <AIShowcase />
        <LiveStats />
        <HowItWorks />
        <ClientLogos />
        <TechStack />
        <RolesTabs />
        <Features />
        <Testimonials />
        <CaseStudies />
        <HowToStart />
        <Integrations />
        <WhoIsItFor />
        <Pricing />
        <Roadmap />
        <Comparison />
        <FAQ />
        <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
