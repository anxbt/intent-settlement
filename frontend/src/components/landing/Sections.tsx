import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { VideoBackground } from "@/components/VideoBackground";
import { ArrowRight, Shield, Zap, RefreshCw } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <VideoBackground 
        src="https://customer-cbeadsgr09pnsezs.cloudflarestream.com/12a9780eeb1ea015801a5f55cf2e9d3d/manifest/video.m3u8"
      />
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 lg:px-8 py-32 text-center">
        <h1 className="fade-in-up font-serif text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground mb-8 max-w-4xl mx-auto leading-tight">
          Intent-Based Settlement with{" "}
          <span className="text-gold-gradient">Cross-Chain Funding</span>
        </h1>
        
        <p className="fade-in-up delay-100 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          Define payment terms up-front. Cross-chain funding executors like LI.FI available separately, with 
          settlement correctness enforced on-chain.
        </p>

        <div className="fade-in-up delay-200 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild variant="gold" size="xl">
            <Link to="/create-intent">
              Create Payment Intent
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
          <Button asChild variant="gold-outline" size="xl">
            <Link to="/demo">
              View Demo
            </Link>
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}

export function WhySection() {
  const reasons = [
    {
      icon: Zap,
      title: "Cross-Chain Funding",
      description: "External funding executors like LI.FI can bridge to settlement chain. Explicit settlement happens on the destination chain."
    },
    {
      icon: Shield,
      title: "Explicit Settlement",
      description: "Fulfillment is intentional and verifiable. Smart contracts enforce settlement correctness on-chain."
    },
    {
      icon: RefreshCw,
      title: "On-Chain Guarantees",
      description: "Settlement terms are enforced by smart contracts. Funds are protected until explicitly released."
    }
  ];

  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6 lg:px-8">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-16 text-foreground">
          Why Intent-Based Payments?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {reasons.map((reason, index) => (
            <div 
              key={reason.title}
              className="premium-card hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <reason.icon className="h-8 w-8 text-primary mb-6" />
              <h3 className="font-serif text-2xl mb-4 text-foreground">
                {reason.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Create an Intent",
      description: "The receiver defines exactly what they expect: token, chain, amount, and expiry."
    },
    {
      number: "02",
      title: "Cross-Chain Funding",
      description: "Payer can use external funding executors like LI.FI to bridge funds to the settlement chain."
    },
    {
      number: "03",
      title: "Lock in Escrow",
      description: "Funds are locked in a smart contract escrow, securing the payment commitment."
    },
    {
      number: "04",
      title: "Explicit Settlement",
      description: "Receiver explicitly confirms fulfillment to release funds, or payer reclaims if failed."
    }
  ];

  return (
    <section className="py-32 bg-card/50">
      <div className="container mx-auto px-6 lg:px-8">
        <h2 className="font-serif text-4xl md:text-5xl text-center mb-16 text-foreground">
          How It Works
        </h2>
        
        <div className="max-w-3xl mx-auto space-y-8">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className="flex gap-6 items-start group"
            >
              <span className="font-serif text-4xl text-primary font-semibold group-hover:scale-110 transition-transform duration-300">
                {step.number}
              </span>
              <div className="flex-1 premium-card">
                <h3 className="font-serif text-xl mb-2 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FailureSection() {
  return (
    <section className="py-32">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-5xl mb-8 text-foreground">
            Failure Is a <span className="text-gold-gradient">Feature</span>
          </h2>
          
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Traditional cross-chain transfers can leave funds in limbo. 
            With intent-based settlement, failure is an explicit state — 
            funds are either properly settled or safely reclaimable.
          </p>
          
          <div className="premium-card inline-block">
            <p className="text-lg text-foreground">
              <span className="text-primary font-semibold">Intent fails?</span>{" "}
              Funds return to the payer. Always.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCTASection() {
  return (
    <section className="py-32 bg-card/30">
      <div className="container mx-auto px-6 lg:px-8 text-center">
        <h2 className="font-serif text-4xl md:text-5xl mb-6 text-foreground">
          Ready to See It in Action?
        </h2>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Experience intent-based settlement with explicit control and on-chain guarantees.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild variant="gold" size="xl">
            <Link to="/demo">
              View Interactive Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
          <Button asChild variant="gold-outline" size="xl">
            <Link to="/create-intent">
              Create Payment Intent
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
