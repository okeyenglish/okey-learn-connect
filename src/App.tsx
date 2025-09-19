import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatBot from "@/components/ChatBot";
import Index from "./pages/Index";
import SuperSafari from "./pages/programs/SuperSafari";
import KidsBox from "./pages/programs/KidsBox";
import Prepare from "./pages/programs/Prepare";
import Empower from "./pages/programs/Empower";
import Programs from "./pages/Programs";
import Branches from "./pages/Branches";
import LocationKotelniki from "./pages/branches/Kotelniki";
import LocationNovokosino from "./pages/branches/Novokosino";
import LocationOkskaya from "./pages/branches/Okskaya";
import LocationStakhanovskaya from "./pages/branches/Stakhanovskaya";
import Test from "./pages/Test";
import About from "./pages/About";
import Teachers from "./pages/Teachers";
import Reviews from "./pages/Reviews";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import LocationSolntsevo from "./pages/branches/Solntsevo";
import LocationMytishchi from "./pages/branches/Mytishchi";
import LocationLyubertsy1 from "./pages/branches/Lyubertsy1";
import LocationLyubertsy2 from "./pages/branches/Lyubertsy2";
import LocationOnline from "./pages/branches/Online";
import Contacts from "./pages/Contacts";
import ContactMethod from "./pages/ContactMethod";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 pb-16 lg:pb-0">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/programs/supersafari" element={<SuperSafari />} />
              <Route path="/programs/kidsbox" element={<KidsBox />} />
              <Route path="/programs/prepare" element={<Prepare />} />
              <Route path="/programs/empower" element={<Empower />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/branches/kotelniki" element={<LocationKotelniki />} />
              <Route path="/branches/novokosino" element={<LocationNovokosino />} />
              <Route path="/branches/okskaya" element={<LocationOkskaya />} />
              <Route path="/branches/stakhanovskaya" element={<LocationStakhanovskaya />} />
              <Route path="/branches/solntsevo" element={<LocationSolntsevo />} />
              <Route path="/branches/mytishchi" element={<LocationMytishchi />} />
              <Route path="/branches/lyubertsy-1" element={<LocationLyubertsy1 />} />
              <Route path="/branches/lyubertsy-2" element={<LocationLyubertsy2 />} />
              <Route path="/branches/online" element={<LocationOnline />} />
              <Route path="/test" element={<Test />} />
              <Route path="/about" element={<About />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contact-method" element={<ContactMethod />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <ChatBot />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;