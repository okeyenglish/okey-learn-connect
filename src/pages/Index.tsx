import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import ForSchools from '@/components/landing/ForSchools';
import ForTeachers from '@/components/landing/ForTeachers';
import ForParents from '@/components/landing/ForParents';
import Features from '@/components/landing/Features';
import WhoIsItFor from '@/components/landing/WhoIsItFor';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import FinalCTA from '@/components/landing/FinalCTA';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <ForSchools />
        <ForTeachers />
        <ForParents />
        <Features />
        <WhoIsItFor />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
