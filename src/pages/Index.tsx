import SEO from '@/components/SEO';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import Hero from '@/components/landing/Hero';
import TrustIndicators from '@/components/landing/TrustIndicators';
import ClientLogos from '@/components/landing/ClientLogos';
import HowItWorks from '@/components/landing/HowItWorks';
import VideoDemo from '@/components/landing/VideoDemo';
import ForSchools from '@/components/landing/ForSchools';
import ForTeachers from '@/components/landing/ForTeachers';
import ForParents from '@/components/landing/ForParents';
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
        <ClientLogos />
        <HowItWorks />
        <VideoDemo />
        <ForSchools />
        <ForTeachers />
        <ForParents />
        <Features />
        <Testimonials />
        <CaseStudies />
        <HowToStart />
        <Integrations />
        <WhoIsItFor />
        <Pricing />
        <Comparison />
        <FAQ />
        <FinalCTA />
        </main>
        <Footer />
      </div>
    </>
  );
}
