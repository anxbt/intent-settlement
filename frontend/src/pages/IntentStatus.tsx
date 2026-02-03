import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Target, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Copy,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

type IntentStatus = "CREATED" | "LOCKED" | "FULFILLED" | "FAILED" | "REFUNDED";

interface IntentData {
  id: string;
  status: IntentStatus;
  token: string;
  chain: string;
  amount: string;
  expiry: number; // seconds remaining
  receiver: string;
  payer?: string;
}

const mockIntents: Record<string, IntentData> = {
  "example-created": {
    id: "0x7a3b4c5d",
    status: "CREATED",
    token: "USDC",
    chain: "Ethereum",
    amount: "500",
    expiry: 600,
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
  },
  "example-locked": {
    id: "0x8b4c5d6e",
    status: "LOCKED",
    token: "USDC",
    chain: "Ethereum",
    amount: "500",
    expiry: 420,
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
    payer: "0x1234567890abcdef1234567890abcdef12345678",
  },
  "example-fulfilled": {
    id: "0x9c5d6e7f",
    status: "FULFILLED",
    token: "USDC",
    chain: "Ethereum",
    amount: "500",
    expiry: 0,
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
    payer: "0x1234567890abcdef1234567890abcdef12345678",
  },
  "example-failed": {
    id: "0xad6e7f80",
    status: "FAILED",
    token: "USDC",
    chain: "Ethereum",
    amount: "500",
    expiry: 0,
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
    payer: "0x1234567890abcdef1234567890abcdef12345678",
  },
  "example-refunded": {
    id: "0xbe7f8091",
    status: "REFUNDED",
    token: "USDC",
    chain: "Ethereum",
    amount: "500",
    expiry: 0,
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
    payer: "0x1234567890abcdef1234567890abcdef12345678",
  },
};

const statusConfig: Record<IntentStatus, { 
  color: string; 
  bgColor: string;
  icon: typeof CheckCircle2;
  description: string;
}> = {
  CREATED: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: Clock,
    description: "Awaiting payment commitment",
  },
  LOCKED: {
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: Target,
    description: "Funds locked, executing cross-chain transfer",
  },
  FULFILLED: {
    color: "text-success",
    bgColor: "bg-success/10",
    icon: CheckCircle2,
    description: "Intent successfully fulfilled",
  },
  FAILED: {
    color: "text-warning",
    bgColor: "bg-warning/10",
    icon: XCircle,
    description: "Execution failed — funds can be reclaimed",
  },
  REFUNDED: {
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: RefreshCw,
    description: "Funds returned to payer",
  },
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return "Expired";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function IntentStatus() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isReclaiming, setIsReclaiming] = useState(false);

  // Get intent data (mock or generated)
  const intent: IntentData = mockIntents[id || ""] || {
    id: id || "0x00000000",
    status: "CREATED" as IntentStatus,
    token: "USDC",
    chain: "Ethereum",
    amount: "500",
    expiry: 600,
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
  };

  const config = statusConfig[intent.status];
  const StatusIcon = config.icon;

  // Countdown timer
  useEffect(() => {
    setTimeLeft(intent.expiry);
    
    if (intent.expiry > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [intent.expiry]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(intent.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReclaim = async () => {
    setIsReclaiming(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    // In real app, would redirect to refunded state
    setIsReclaiming(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-8 max-w-2xl">
          {/* Status Header */}
          <div className="text-center mb-12">
            <div className={cn(
              "inline-flex items-center justify-center w-20 h-20 rounded-full mb-6",
              config.bgColor
            )}>
              <StatusIcon className={cn("h-10 w-10", config.color)} />
            </div>
            
            <h1 className="font-serif text-4xl md:text-5xl mb-4 text-foreground">
              Intent Status
            </h1>
            
            <Badge 
              className={cn(
                "text-sm px-4 py-1.5",
                config.bgColor,
                config.color,
                "border-0"
              )}
            >
              {intent.status}
            </Badge>
            
            <p className="text-muted-foreground mt-4">
              {config.description}
            </p>
          </div>

          {/* Intent Details Card */}
          <div className="premium-card space-y-6">
            {/* Intent ID */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <span className="text-muted-foreground">Intent ID</span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-foreground bg-background px-3 py-1.5 rounded">
                  {intent.id}
                </code>
                <button
                  onClick={handleCopyId}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  <Copy className={cn(
                    "h-4 w-4",
                    copied ? "text-success" : "text-muted-foreground"
                  )} />
                </button>
              </div>
            </div>

            {/* Target */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <span className="text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Target
              </span>
              <span className="font-medium text-foreground">
                {intent.amount} {intent.token} on {intent.chain}
              </span>
            </div>

            {/* Expiry Countdown */}
            {(intent.status === "CREATED" || intent.status === "LOCKED") && (
              <div className="flex items-center justify-between py-4 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Remaining
                </span>
                <span className={cn(
                  "font-mono text-xl font-semibold",
                  timeLeft < 60 ? "text-warning" : "text-foreground"
                )}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}

            {/* Receiver */}
            <div className="flex items-center justify-between py-4 border-b border-border/50">
              <span className="text-muted-foreground">Receiver</span>
              <a 
                href={`https://etherscan.io/address/${intent.receiver}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-foreground hover:text-primary transition-colors"
              >
                {shortenAddress(intent.receiver)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Payer (if exists) */}
            {intent.payer && (
              <div className="flex items-center justify-between py-4">
                <span className="text-muted-foreground">Payer</span>
                <a 
                  href={`https://etherscan.io/address/${intent.payer}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-mono text-foreground hover:text-primary transition-colors"
                >
                  {shortenAddress(intent.payer)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Action Button for Failed State */}
          {intent.status === "FAILED" && (
            <div className="mt-8">
              <Button
                onClick={handleReclaim}
                variant="gold-outline"
                size="xl"
                className="w-full"
                disabled={isReclaiming}
              >
                {isReclaiming ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    Reclaiming Funds...
                  </span>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Reclaim Funds
                  </>
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Safely return locked funds to the payer
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
