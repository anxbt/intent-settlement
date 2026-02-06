/**
 * IntentStatus Page
 *
 * Displays live intent state from the contract.
 * Actions available based on state:
 * - CREATED: Share link with payer
 * - LOCKED: Fulfill (receiver) or Mark Failed (anyone after expiry)
 * - FAILED: Reclaim funds (payer)
 * - FULFILLED: View completion details
 * - REFUNDED: View refund details
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { Header } from "@/components/Header";
import { VideoBackground } from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Loader2,
  Share2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NetworkWarning } from "@/components/WalletButton";
import {
  useIntent,
  useFulfillIntent,
  useReclaimFunds,
  useMarkFailed,
  IntentState,
} from "@/hooks/useIntentContract";
import { CONTRACT_CHAIN_ID, INTENT_ESCROW_ADDRESS } from "@/lib/contract";
import { SUPPORTED_TOKENS, SUPPORTED_CHAINS } from "@/hooks/useLiFi";

// =============================================================================
// LOGGING UTILITIES - IntentStatus Page
// =============================================================================

/**
 * Page-level logging with consistent format
 */
const logPage = (action: string, data?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  const prefix = `%c[IntentStatus][${timestamp}]`;
  const style = "color: #9f7aea; font-weight: bold;"; // Purple for status page
  
  if (data) {
    console.log(prefix, style, action, data);
  } else {
    console.log(prefix, style, action);
  }
};

const statusConfig: Record<
  IntentState,
  {
    color: string;
    bgColor: string;
    icon: typeof CheckCircle2;
    description: string;
    label: string;
  }
> = {
  [IntentState.CREATED]: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    icon: Clock,
    description: "Awaiting payment commitment",
    label: "CREATED",
  },
  [IntentState.LOCKED]: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    icon: Target,
    description: "Funds locked, awaiting fulfillment",
    label: "LOCKED",
  },
  [IntentState.FULFILLED]: {
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    icon: CheckCircle2,
    description: "Intent successfully fulfilled",
    label: "FULFILLED",
  },
  [IntentState.FAILED]: {
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    icon: XCircle,
    description: "Execution failed — funds can be reclaimed",
    label: "FAILED",
  },
  [IntentState.REFUNDED]: {
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    icon: RefreshCw,
    description: "Funds returned to payer",
    label: "REFUNDED",
  },
};

// Token label lookup
const getTokenLabel = (address: string) => {
  const lowerAddr = address.toLowerCase();
  if (lowerAddr === SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].USDC.toLowerCase()) return "USDC";
  if (lowerAddr === SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].ETH.toLowerCase()) return "ETH";
  return address.slice(0, 6) + "..." + address.slice(-4);
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
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isOnBase = chainId === CONTRACT_CHAIN_ID;

  const intentId = id ? BigInt(id) : undefined;

  // Log page mount
  useEffect(() => {
    logPage("mounted", {
      intentId: id,
      isConnected,
      address,
      chainId,
      isOnBase,
    });
  }, []);

  // Fetch intent from contract
  const { intent, isLoading, error, refetch } = useIntent(intentId);

  // Log intent data changes
  useEffect(() => {
    if (intent) {
      logPage("intentLoaded", {
        intentId: id,
        state: IntentState[intent.state],
        stateNum: intent.state,
        receiver: intent.receiver,
        payer: intent.payer,
        token: intent.token,
        amount: intent.amount.toString(),
        expiry: new Date(Number(intent.expiry) * 1000).toISOString(),
        isExpired: Number(intent.expiry) < Math.floor(Date.now() / 1000),
      });
    }
  }, [intent, id]);

  // Log errors
  useEffect(() => {
    if (error) {
      logPage("intentError", {
        intentId: id,
        error: error.message,
      });
    }
  }, [error, id]);

  // Contract write hooks
  const { fulfillIntent, isPending: isFulfilling, isConfirming: isConfirmingFulfill, error: fulfillError } = useFulfillIntent();
  const { reclaimFunds, isPending: isReclaiming, isConfirming: isConfirmingReclaim, error: reclaimError } = useReclaimFunds();
  const { markFailed, isPending: isMarking, isConfirming: isConfirmingMark, error: markError } = useMarkFailed();

  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Calculate time remaining
  useEffect(() => {
    if (!intent) return;

    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Number(intent.expiry) - now;
      setTimeLeft(Math.max(0, remaining));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [intent]);

  // Refresh intent data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [refetch]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    logPage("copiedIntentId", { intentId: id });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/pay/${id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    logPage("copiedPaymentLink", { intentId: id, link });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFulfill = async () => {
    if (!intentId) return;
    
    logPage("fulfill:initiated", {
      intentId: id,
      caller: address,
      isReceiver: intent?.receiver.toLowerCase() === address?.toLowerCase(),
      currentState: intent ? IntentState[intent.state] : "unknown",
    });

    try {
      const result = await fulfillIntent(intentId);
      
      logPage("fulfill:success", {
        intentId: id,
        result,
      });
      
      refetch();
    } catch (err: any) {
      logPage("fulfill:error", {
        intentId: id,
        error: err?.message || String(err),
        errorCode: err?.code,
        errorName: err?.name,
      });
      console.error("Fulfill failed:", err);
    }
  };

  const handleReclaim = async () => {
    if (!intentId) return;
    
    logPage("reclaim:initiated", {
      intentId: id,
      caller: address,
      isPayer: intent?.payer.toLowerCase() === address?.toLowerCase(),
      currentState: intent ? IntentState[intent.state] : "unknown",
    });

    try {
      const result = await reclaimFunds(intentId);
      
      logPage("reclaim:success", {
        intentId: id,
        result,
      });
      
      refetch();
    } catch (err: any) {
      logPage("reclaim:error", {
        intentId: id,
        error: err?.message || String(err),
        errorCode: err?.code,
        errorName: err?.name,
      });
      console.error("Reclaim failed:", err);
    }
  };

  const handleMarkFailed = async () => {
    if (!intentId) return;
    
    logPage("markFailed:initiated", {
      intentId: id,
      caller: address,
      currentState: intent ? IntentState[intent.state] : "unknown",
      isExpired: intent ? Number(intent.expiry) < Math.floor(Date.now() / 1000) : false,
    });

    try {
      const result = await markFailed(intentId);
      
      logPage("markFailed:success", {
        intentId: id,
        result,
      });
      
      refetch();
    } catch (err: any) {
      logPage("markFailed:error", {
        intentId: id,
        error: err?.message || String(err),
        errorCode: err?.code,
        errorName: err?.name,
      });
      console.error("Mark failed:", err);
    }
  };

  // Determine user role
  const isReceiver = intent && address?.toLowerCase() === intent.receiver.toLowerCase();
  const isPayer = intent && intent.payer && address?.toLowerCase() === intent.payer.toLowerCase();
  const isExpired = timeLeft === 0;

  // Get config for current state
  const config = intent ? statusConfig[intent.state] : statusConfig[IntentState.CREATED];
  const StatusIcon = config.icon;

  const isProcessing = isFulfilling || isConfirmingFulfill || isReclaiming || isConfirmingReclaim || isMarking || isConfirmingMark;
  const actionError = fulfillError || reclaimError || markError;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 z-0">
        <VideoBackground src="https://customer-cbeadsgr09pnsezs.cloudflarestream.com/12a9780eeb1ea015801a5f55cf2e9d3d/manifest/video.m3u8" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background" />
      </div>

      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-8 max-w-2xl">
          <div className="mb-6">
            <NetworkWarning />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="premium-card text-center py-16">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Loading intent #{id}...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="premium-card border-destructive/50">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-6 w-6" />
                <div>
                  <p className="font-medium">Failed to load intent</p>
                  <p className="text-sm opacity-80">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Intent Found */}
          {intent && !isLoading && (
            <>
              {/* Status Header */}
              <div className="text-center mb-12">
                <div
                  className={cn(
                    "inline-flex items-center justify-center w-20 h-20 rounded-full mb-6",
                    config.bgColor
                  )}
                >
                  <StatusIcon className={cn("h-10 w-10", config.color)} />
                </div>

                <h1 className="font-serif text-4xl md:text-5xl mb-4 text-foreground">
                  Intent #{id}
                </h1>

                <Badge
                  className={cn("text-sm px-4 py-1.5", config.bgColor, config.color, "border-0")}
                >
                  {config.label}
                </Badge>

                <p className="text-muted-foreground mt-4">{config.description}</p>
              </div>

              {/* Intent Details Card */}
              <div className="premium-card space-y-6">
                {/* Intent ID */}
                <div className="flex items-center justify-between py-4 border-b border-border/50">
                  <span className="text-muted-foreground">Intent ID</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-foreground bg-background px-3 py-1.5 rounded">
                      #{id}
                    </code>
                    <button
                      onClick={handleCopyId}
                      className="p-2 hover:bg-muted rounded transition-colors"
                    >
                      <Copy
                        className={cn("h-4 w-4", copied ? "text-green-500" : "text-muted-foreground")}
                      />
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
                    {formatUnits(intent.amount, 6)} {getTokenLabel(intent.token)} on Base
                  </span>
                </div>

                {/* Expiry Countdown */}
                {(intent.state === IntentState.CREATED || intent.state === IntentState.LOCKED) && (
                  <div className="flex items-center justify-between py-4 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time Remaining
                    </span>
                    <span
                      className={cn(
                        "font-mono text-xl font-semibold",
                        timeLeft < 60 ? "text-red-400" : timeLeft < 300 ? "text-yellow-400" : "text-foreground"
                      )}
                    >
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}

                {/* Receiver */}
                <div className="flex items-center justify-between py-4 border-b border-border/50">
                  <span className="text-muted-foreground">Receiver</span>
                  <a
                    href={`https://basescan.org/address/${intent.receiver}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-mono text-foreground hover:text-primary transition-colors"
                  >
                    {shortenAddress(intent.receiver)}
                    {isReceiver && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Payer (if exists) */}
                {intent.payer && intent.payer !== "0x0000000000000000000000000000000000000000" && (
                  <div className="flex items-center justify-between py-4">
                    <span className="text-muted-foreground">Payer</span>
                    <a
                      href={`https://basescan.org/address/${intent.payer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-mono text-foreground hover:text-primary transition-colors"
                    >
                      {shortenAddress(intent.payer)}
                      {isPayer && <Badge variant="outline" className="ml-2 text-xs">You</Badge>}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Contract */}
                <div className="flex items-center justify-between py-4 border-t border-border/50">
                  <span className="text-muted-foreground">Contract</span>
                  <a
                    href={`https://basescan.org/address/${INTENT_ESCROW_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {shortenAddress(INTENT_ESCROW_ADDRESS)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Action Error */}
              {actionError && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {actionError.message}
                </div>
              )}

              {/* Action Buttons based on state */}
              <div className="mt-8 space-y-4">
                {/* CREATED: Share payment link */}
                {intent.state === IntentState.CREATED && (
                  <>
                    <Button
                      onClick={handleShareLink}
                      variant="gold"
                      size="xl"
                      className="w-full"
                    >
                      {copiedLink ? (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Link Copied!
                        </>
                      ) : (
                        <>
                          <Share2 className="mr-2 h-5 w-5" />
                          Share Payment Link
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => navigate(`/pay/${id}`)}
                    >
                      Pay This Intent
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Share this link with the payer to receive funds
                    </p>
                  </>
                )}

                {/* LOCKED: Fulfill (receiver only) or Mark Failed (after expiry) */}
                {intent.state === IntentState.LOCKED && (
                  <>
                    {isReceiver && (
                      <Button
                        onClick={handleFulfill}
                        variant="gold"
                        size="xl"
                        className="w-full"
                        disabled={!isConnected || !isOnBase || isProcessing}
                      >
                        {isFulfilling || isConfirmingFulfill ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Fulfilling...
                          </span>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Fulfill Intent
                          </>
                        )}
                      </Button>
                    )}

                    {isExpired && (
                      <Button
                        onClick={handleMarkFailed}
                        variant="outline"
                        size="lg"
                        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                        disabled={!isConnected || !isOnBase || isProcessing}
                      >
                        {isMarking || isConfirmingMark ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Marking Failed...
                          </span>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-5 w-5" />
                            Mark as Failed (Expired)
                          </>
                        )}
                      </Button>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                      {isReceiver
                        ? "Confirm receipt to release funds"
                        : isExpired
                        ? "Intent expired - can be marked as failed"
                        : "Waiting for receiver to fulfill"}
                    </p>
                  </>
                )}

                {/* FAILED: Reclaim (payer only) */}
                {intent.state === IntentState.FAILED && isPayer && (
                  <>
                    <Button
                      onClick={handleReclaim}
                      variant="gold-outline"
                      size="xl"
                      className="w-full"
                      disabled={!isConnected || !isOnBase || isProcessing}
                    >
                      {isReclaiming || isConfirmingReclaim ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Reclaiming Funds...
                        </span>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5" />
                          Reclaim Funds
                        </>
                      )}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Safely return locked funds to your wallet
                    </p>
                  </>
                )}

                {/* FULFILLED: Success message */}
                {intent.state === IntentState.FULFILLED && (
                  <div className="premium-card bg-green-500/5 border-green-500/20 text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">Payment Complete!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Funds have been transferred to the receiver
                    </p>
                  </div>
                )}

                {/* REFUNDED: Refund confirmation */}
                {intent.state === IntentState.REFUNDED && (
                  <div className="premium-card bg-muted/50 text-center py-8">
                    <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground">Funds Refunded</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Locked funds have been returned to the payer
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* No ID provided */}
          {!id && !isLoading && (
            <div className="premium-card text-center py-12">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No intent ID provided</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/create")}>
                Create New Intent
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
