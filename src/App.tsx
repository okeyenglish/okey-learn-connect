import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import Locations from "./pages/Locations";
import LocationKotelniki from "./pages/locations/Kotelniki";
import LocationKosino from "./pages/locations/Kosino";
import LocationOkskaya from "./pages/locations/Okskaya";
import LocationStakhanovskaya from "./pages/locations/Stakhanovskaya";
import PlacementTest from "./pages/PlacementTest";
import About from "./pages/About";
import Teachers from "./pages/Teachers";
import Reviews from "./pages/Reviews";
import Pricing from "./pages/Pricing";
import FAQ from "./pages/FAQ";
import Contacts from "./pages/Contacts";
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
              <Route path="/courses" element={<Courses />} />
              <Route path="/locations" element={<Locations />} />
              <Route path="/locations/kotelniki" element={<LocationKotelniki />} />
              <Route path="/locations/kosino" element={<LocationKosino />} />
              <Route path="/locations/okskaya" element={<LocationOkskaya />} />
              <Route path="/locations/stakhanovskaya" element={<LocationStakhanovskaya />} />
              <Route path="/placement-test" element={<PlacementTest />} />
              <Route path="/about" element={<About />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;