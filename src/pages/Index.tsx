import Hero from '@/components/landing/Hero';
import TrustIndicators from '@/components/landing/TrustIndicators';
import ClientLogos from '@/components/landing/ClientLogos';
import HowItWorks from '@/components/landing/HowItWorks';
import ForSchools from '@/components/landing/ForSchools';
import ForTeachers from '@/components/landing/ForTeachers';
import ForParents from '@/components/landing/ForParents';
import Features from '@/components/landing/Features';
import Testimonials from '@/components/landing/Testimonials';
import HowToStart from '@/components/landing/HowToStart';
import Integrations from '@/components/landing/Integrations';
import WhoIsItFor from '@/components/landing/WhoIsItFor';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import StickyCTA from '@/components/landing/StickyCTA';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <StickyCTA />
      <main>
        <Hero />
        <TrustIndicators />
        <ClientLogos />
        <HowItWorks />
        <ForSchools />
        <ForTeachers />
        <ForParents />
        <Features />
        <Testimonials />
        <HowToStart />
        <Integrations />
        <WhoIsItFor />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
