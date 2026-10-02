import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Awards from "@/components/Awards";
import PracticeAreas from "@/components/PracticeAreas";
import Reels from "@/components/Reels";
import About from "@/components/About";
import Testimonials from "@/components/Testimonials";
import CtaBreaker from "@/components/CtaBreaker";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <Reels />
        <Awards />
        <PracticeAreas />
        <About />
        <Testimonials />
        <CtaBreaker />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
