import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Reels from "@/components/Reels";
import CtaBreaker from "@/components/CtaBreaker";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <Reels />
        <CtaBreaker />
      </main>
      <Footer />
    </>
  );
}
