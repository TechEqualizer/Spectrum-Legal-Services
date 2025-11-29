import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ValueProposition from "@/components/ValueProposition";
import PracticeAreas from "@/components/PracticeAreas";
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
        <ValueProposition />
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
