/**
 * Demo Page - Interactive Workflow Showcase for Judges
 * 
 * This page demonstrates the complete intent-based cross-chain payment flow:
 * 1. Receiver creates an intent specifying desired outcome
 * 2. Payer locks funds from any supported chain
 * 3. Protocol executes cross-chain routing via LI.FI
 * 4. Funds settle to receiver OR return to payer on failure
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { VideoBackground } from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  ArrowDown,
  User, 
  Wallet, 
  FileCheck, 
  Lock, 
  Zap, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Globe,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INTENT_ESCROW_ADDRESS, CONTRACT_CHAIN_ID } from "@/lib/contract";

// Contract deployment info
const DEPLOYED_CONTRACT = "0x4Bf1d41e3ebCA8497d120560B081b52448d888c8";
const BASESCAN_URL = `https://basescan.org/address/${DEPLOYED_CONTRACT}`;

// Demo states
type DemoStep = 0 | 1 | 2 | 3 | 4 | 5;
type DemoPath = "success" | "failure";

const stepInfo = {
  0: { title: "Start", description: "Begin the demo" },
  1: { title: "Create Intent", description: "Receiver specifies desired outcome" },
  2: { title: "Share Link", description: "Payment link sent to payer" },
  3: { title: "Lock Funds", description: "Payer commits funds from any chain" },
  4: { title: "Cross-Chain Execution", description: "LI.FI routes funds to destination" },
  5: { title: "Settlement", description: "Funds released or returned" },
};

export default function Demo() {
  const [currentStep, setCurrentStep] = useState<DemoStep>(0);
  const [demoPath, setDemoPath] = useState<DemoPath>("success");
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);

  const handleCopyContract = () => {
    navigator.clipboard.writeText(DEPLOYED_CONTRACT);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as DemoStep);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => (prev - 1) as DemoStep);
    }
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setIsAutoPlaying(false);
  };

  const toggleAutoPlay = () => {
    if (!isAutoPlaying && currentStep < 5) {
      setIsAutoPlaying(true);
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 5) {
            clearInterval(interval);
            setIsAutoPlaying(false);
            return prev;
          }
          return (prev + 1) as DemoStep;
        });
      }, 2500);
    } else {
      setIsAutoPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Video Background */}
      <div className="fixed inset-0 z-0">
        <VideoBackground src="https://customer-cbeadsgr09pnsezs.cloudflarestream.com/12a9780eeb1ea015801a5f55cf2e9d3d/manifest/video.m3u8" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
      </div>

      <Header />

      <main className="relative z-10 pt-28 pb-20">
        <div className="container mx-auto px-6 lg:px-8">
          
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
              ETHGlobal HackMoney Submission
            </Badge>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl mb-4 text-foreground">
              Intent-Based Cross-Chain Payments
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              A protocol where payments are defined by <span className="text-primary font-semibold">outcomes, not steps</span>. 
              Funds move only when the intent is fulfilled — otherwise they return safely.
            </p>
          </div>

          {/* Deployed Contract Info */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="premium-card bg-card/80 backdrop-blur-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Live on Base Mainnet</p>
                    <p className="font-mono text-sm text-foreground">
                      {DEPLOYED_CONTRACT.slice(0, 10)}...{DEPLOYED_CONTRACT.slice(-8)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyContract}
                    className="gap-2"
                  >
                    {copiedContract ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedContract ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2"
                  >
                    <a href={BASESCAN_URL} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      BaseScan
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Demo Section */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="premium-card bg-card/90 backdrop-blur-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-serif text-2xl text-foreground">Interactive Flow Demo</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetDemo}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    variant={isAutoPlaying ? "destructive" : "gold"}
                    size="sm"
                    onClick={toggleAutoPlay}
                    className="gap-2"
                  >
                    {isAutoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isAutoPlaying ? "Pause" : "Auto Play"}
                  </Button>
                </div>
              </div>

              {/* Demo Path Toggle */}
              <div className="flex justify-center gap-4 mb-8">
                <Button
                  variant={demoPath === "success" ? "gold" : "outline"}
                  size="sm"
                  onClick={() => setDemoPath("success")}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Success Path
                </Button>
                <Button
                  variant={demoPath === "failure" ? "gold" : "outline"}
                  size="sm"
                  onClick={() => setDemoPath("failure")}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Failure Path
                </Button>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8 overflow-x-auto pb-4">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={cn(
                        "flex flex-col items-center min-w-[100px]",
                        currentStep >= step ? "opacity-100" : "opacity-40"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300",
                          currentStep > step
                            ? "bg-green-500 text-white"
                            : currentStep === step
                            ? "bg-primary text-primary-foreground animate-pulse"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {currentStep > step ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="font-semibold">{step}</span>
                        )}
                      </div>
                      <span className="text-xs text-center text-muted-foreground">
                        {stepInfo[step as DemoStep].title}
                      </span>
                    </div>
                    {step < 5 && (
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 mx-2 transition-colors",
                          currentStep > step ? "text-green-500" : "text-muted-foreground/30"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Demo Content */}
              <div className="min-h-[350px] relative">
                <DemoStepContent step={currentStep} path={demoPath} />
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  Previous
                </Button>
                <Button
                  variant="gold"
                  onClick={nextStep}
                  disabled={currentStep === 5}
                  className="gap-2"
                >
                  {currentStep === 0 ? "Start Demo" : currentStep === 5 ? "Complete" : "Next Step"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Key Features Grid */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="font-serif text-3xl text-center mb-8 text-foreground">
              Protocol Highlights
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={Shield}
                title="Atomic Settlement"
                description="Payments either complete fully or fail safely. No partial states, no stuck funds."
              />
              <FeatureCard
                icon={Globe}
                title="Chain Agnostic"
                description="Pay from any supported chain. LI.FI handles routing to the destination."
              />
              <FeatureCard
                icon={RefreshCw}
                title="Safe Failure"
                description="If execution fails after expiry, funds automatically return to the payer."
              />
            </div>
          </div>

          {/* State Machine Diagram */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="font-serif text-3xl text-center mb-8 text-foreground">
              Intent State Machine
            </h2>
            <div className="premium-card bg-card/90 backdrop-blur-sm p-8">
              <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
                <StateBadge state="CREATED" color="blue" />
                <Arrow />
                <StateBadge state="LOCKED" color="yellow" />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-4">
                    <Arrow />
                    <StateBadge state="FULFILLED" color="green" />
                  </div>
                  <span className="text-muted-foreground text-xs">or</span>
                  <div className="flex items-center gap-4">
                    <Arrow />
                    <StateBadge state="FAILED" color="red" />
                    <Arrow />
                    <StateBadge state="REFUNDED" color="gray" />
                  </div>
                </div>
              </div>
              <p className="text-center text-muted-foreground mt-6 text-sm">
                Each state transition is enforced on-chain with strict access control
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="font-serif text-3xl text-center mb-8 text-foreground">
              Built With
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TechCard name="Foundry" description="Smart Contract Development" />
              <TechCard name="Base" description="L2 Deployment" />
              <TechCard name="LI.FI" description="Cross-Chain Routing" />
              <TechCard name="RainbowKit" description="Wallet Connection" />
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-3xl mb-4 text-foreground">
              Try It Yourself
            </h2>
            <p className="text-muted-foreground mb-8">
              Connect your wallet and experience intent-based payments firsthand.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="gold" size="xl">
                <Link to="/create-intent">
                  Create Payment Intent
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="gold-outline" size="xl">
                <a href={BASESCAN_URL} target="_blank" rel="noopener noreferrer">
                  View Contract
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-border">
        <div className="container mx-auto px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            Built for ETHGlobal HackMoney — Intent-Based Cross-Chain Payments on Base
          </p>
        </div>
      </footer>
    </div>
  );
}

// Demo Step Content Component
function DemoStepContent({ step, path }: { step: DemoStep; path: DemoPath }) {
  const content: Record<DemoStep, React.ReactNode> = {
    0: (
      <div className="text-center py-12">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Play className="h-10 w-10 text-primary" />
        </div>
        <h3 className="font-serif text-2xl mb-4 text-foreground">
          Welcome to the Demo
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          This interactive walkthrough shows how intent-based payments work. 
          Click "Start Demo" to begin or use "Auto Play" for a guided tour.
        </p>
      </div>
    ),
    1: (
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-sm text-blue-400 font-medium">Receiver (Alice)</span>
          </div>
          <h3 className="font-serif text-xl mb-3 text-foreground">
            1. Create Payment Intent
          </h3>
          <p className="text-muted-foreground mb-4">
            Alice wants to receive <span className="text-primary font-semibold">100 USDC on Base</span>. 
            She creates an intent specifying:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Token: USDC</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Amount: 100 USDC</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Expiry: 30 minutes</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Destination: Base Mainnet</span>
            </li>
          </ul>
        </div>
        <div className="premium-card bg-blue-500/5 border-blue-500/20">
          <code className="text-xs text-blue-300 block">
            <span className="text-muted-foreground">// Transaction</span><br />
            createIntent(<br />
            &nbsp;&nbsp;receiver: 0xAlice...,<br />
            &nbsp;&nbsp;token: USDC,<br />
            &nbsp;&nbsp;amount: 100e6,<br />
            &nbsp;&nbsp;expiry: now + 30min<br />
            )<br /><br />
            <span className="text-green-400">→ Intent #42 Created</span><br />
            <span className="text-yellow-400">State: CREATED</span>
          </code>
        </div>
      </div>
    ),
    2: (
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-purple-500" />
            </div>
            <span className="text-sm text-purple-400 font-medium">Payment Link</span>
          </div>
          <h3 className="font-serif text-xl mb-3 text-foreground">
            2. Share Payment Link
          </h3>
          <p className="text-muted-foreground mb-4">
            Alice shares the intent link with Bob (the payer). 
            The link contains all payment details encoded on-chain.
          </p>
          <div className="bg-card rounded-lg p-3 font-mono text-sm break-all border border-border">
            https://intentpay.xyz/pay/42
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Bob can verify all details before committing funds
          </p>
        </div>
        <div className="text-center">
          <div className="inline-flex items-center gap-4 py-4">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-2">
                <User className="h-8 w-8 text-blue-500" />
              </div>
              <span className="text-sm text-muted-foreground">Alice</span>
            </div>
            <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                <User className="h-8 w-8 text-green-500" />
              </div>
              <span className="text-sm text-muted-foreground">Bob</span>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-500/50 text-purple-400">
            Link Shared
          </Badge>
        </div>
      </div>
    ),
    3: (
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-green-500" />
            </div>
            <span className="text-sm text-green-400 font-medium">Payer (Bob)</span>
          </div>
          <h3 className="font-serif text-xl mb-3 text-foreground">
            3. Lock Funds
          </h3>
          <p className="text-muted-foreground mb-4">
            Bob has <span className="text-primary font-semibold">USDC on Arbitrum</span> but the intent 
            requires USDC on Base. No problem — LI.FI will handle the routing!
          </p>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline" className="border-blue-500/50">Arbitrum</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="border-blue-500/50">Base</Badge>
          </div>
        </div>
        <div className="premium-card bg-green-500/5 border-green-500/20">
          <code className="text-xs text-green-300 block">
            <span className="text-muted-foreground">// Bob's Transaction</span><br />
            lockFunds(intentId: 42)<br /><br />
            <span className="text-muted-foreground">// ERC20 Approval</span><br />
            ✓ USDC.approve(escrow, 100e6)<br /><br />
            <span className="text-muted-foreground">// Transfer to Escrow</span><br />
            ✓ USDC.transferFrom(Bob, Escrow)<br /><br />
            <span className="text-green-400">→ Funds Locked</span><br />
            <span className="text-yellow-400">State: LOCKED</span>
          </code>
        </div>
      </div>
    ),
    4: (
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <span className="text-sm text-yellow-400 font-medium">LI.FI Router</span>
          </div>
          <h3 className="font-serif text-xl mb-3 text-foreground">
            4. Cross-Chain Execution
          </h3>
          <p className="text-muted-foreground mb-4">
            LI.FI finds the optimal route and executes the cross-chain transfer:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Best route calculated</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Bridge: Stargate</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>Estimated time: ~2 minutes</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Executing...</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <Badge variant="outline" className="border-blue-500/50 text-blue-400">
              Arbitrum
            </Badge>
            <div className="flex flex-col items-center">
              <ArrowDown className="h-5 w-5 text-yellow-500 animate-bounce" />
              <span className="text-xs text-yellow-400 my-1">LI.FI Bridge</span>
              <ArrowDown className="h-5 w-5 text-yellow-500 animate-bounce" />
            </div>
            <Badge variant="outline" className="border-blue-500/50 text-blue-400">
              Base
            </Badge>
          </div>
        </div>
      </div>
    ),
    5: path === "success" ? (
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <span className="text-sm text-green-400 font-medium">Success!</span>
          </div>
          <h3 className="font-serif text-xl mb-3 text-foreground">
            5. Intent Fulfilled ✓
          </h3>
          <p className="text-muted-foreground mb-4">
            Cross-chain execution completed successfully. 
            Alice calls <code className="text-primary">fulfillIntent()</code> to release funds.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>100 USDC transferred to Alice</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Intent state: FULFILLED</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Transaction complete</span>
            </div>
          </div>
        </div>
        <div className="premium-card bg-green-500/5 border-green-500/20 text-center py-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-green-400 mb-2">
            Payment Complete
          </p>
          <p className="text-sm text-muted-foreground">
            Alice received 100 USDC on Base
          </p>
        </div>
      </div>
    ) : (
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-sm text-red-400 font-medium">Failure Path</span>
          </div>
          <h3 className="font-serif text-xl mb-3 text-foreground">
            5. Safe Recovery
          </h3>
          <p className="text-muted-foreground mb-4">
            Intent expired without fulfillment. Anyone can call <code className="text-primary">markFailed()</code>, 
            then Bob reclaims his funds.
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <Clock className="h-4 w-4" />
              <span>Intent expired (30 min passed)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-red-400">
              <XCircle className="h-4 w-4" />
              <span>State changed: FAILED</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-400">
              <RefreshCw className="h-4 w-4" />
              <span>Bob calls reclaimFunds()</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>100 USDC returned to Bob</span>
            </div>
          </div>
        </div>
        <div className="premium-card bg-yellow-500/5 border-yellow-500/20 text-center py-8">
          <RefreshCw className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-yellow-400 mb-2">
            Funds Recovered
          </p>
          <p className="text-sm text-muted-foreground">
            Bob's 100 USDC safely returned
          </p>
          <Badge className="mt-3 bg-green-500/10 text-green-400 border-green-500/30">
            State: REFUNDED
          </Badge>
        </div>
      </div>
    ),
  };

  return (
    <div className="animate-in fade-in duration-300">
      {content[step]}
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon: Icon, title, description }: { 
  icon: typeof Shield; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="premium-card hover-lift">
      <Icon className="h-8 w-8 text-primary mb-4" />
      <h3 className="font-serif text-xl mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

// State Badge Component
function StateBadge({ state, color }: { state: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "border-blue-500/50 text-blue-400 bg-blue-500/10",
    yellow: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10",
    green: "border-green-500/50 text-green-400 bg-green-500/10",
    red: "border-red-500/50 text-red-400 bg-red-500/10",
    gray: "border-gray-500/50 text-gray-400 bg-gray-500/10",
  };
  return (
    <Badge variant="outline" className={cn("font-mono", colors[color])}>
      {state}
    </Badge>
  );
}

// Arrow Component
function Arrow() {
  return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
}

// Tech Card Component
function TechCard({ name, description }: { name: string; description: string }) {
  return (
    <div className="premium-card text-center py-6">
      <p className="font-semibold text-foreground mb-1">{name}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
