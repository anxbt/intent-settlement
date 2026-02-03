import { Header } from "@/components/Header";
import {
  HeroSection,
  WhySection,
  HowItWorksSection,
  FailureSection,
  FinalCTASection,
} from "@/components/landing/Sections";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <WhySection />
        <HowItWorksSection />
        <FailureSection />
        <FinalCTASection />
      </main>
      
      {/* Simple footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            Built for ETHGlobal HackMoney — Intent-Based Cross-Chain Payments
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
