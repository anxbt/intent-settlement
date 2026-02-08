/**
 * PayIntent Page
 *
 * Same-chain funding flow (Base only):
 * 1) Payer enters intent ID or navigates from link
 * 2) Page fetches settlement terms from contract
 * 3) Payer must have required tokens on Base to fund directly
 * 4) Funds are locked in escrow contract on Base
 * 5) Receiver must explicitly confirm settlement to release funds
 *
 * Note: Cross-chain funding via LI.FI is demonstrated separately
 * ⚠️ LOGGING: All user actions are logged for debugging real money transactions
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { Header } from "@/components/Header";
import { VideoBackground } from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight, Clock, Target, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { NetworkWarning } from "@/components/WalletButton";
import { useIntent, useLockFunds, IntentState } from "@/hooks/useIntentContract";
import { useLiFi, SUPPORTED_CHAINS, SUPPORTED_TOKENS } from "@/hooks/useLiFi";
import { INTENT_ESCROW_ADDRESS, CONTRACT_CHAIN_ID } from "@/lib/contract";
import { useToast } from "@/hooks/use-toast";

// Page-level logging
const LOG_PREFIX = "[PayIntent]";
function logPage(action: string, data: Record<string, unknown>) {
  console.log(`%c${LOG_PREFIX} ${action}`, "color: #14b8a6; font-weight: bold;", {
    timestamp: new Date().toISOString(),
    ...data,
  });
}

// Source tokens (what payer can pay with)
const sourceTokens = [
  { 
    chainId: SUPPORTED_CHAINS.BASE, 
    address: SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].USDC, 
    label: "USDC on Base", 
    icon: "$",
    decimals: 6 
  },
  { 
    chainId: SUPPORTED_CHAINS.BASE, 
    address: SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].ETH, 
    label: "ETH on Base", 
    icon: "Ξ",
    decimals: 18 
  },
  { 
    chainId: SUPPORTED_CHAINS.ARBITRUM, 
    address: SUPPORTED_TOKENS[SUPPORTED_CHAINS.ARBITRUM].USDC, 
    label: "USDC on Arbitrum", 
    icon: "$",
    decimals: 6 
  },
  { 
    chainId: SUPPORTED_CHAINS.ARBITRUM, 
    address: SUPPORTED_TOKENS[SUPPORTED_CHAINS.ARBITRUM].ETH, 
    label: "ETH on Arbitrum", 
    icon: "Ξ",
    decimals: 18 
  },
];

// Token label lookup
const getTokenLabel = (address: string) => {
  const lowerAddr = address.toLowerCase();
  if (lowerAddr === SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].USDC.toLowerCase()) return "USDC";
  if (lowerAddr === SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].ETH.toLowerCase()) return "ETH";
  return address.slice(0, 6) + "..." + address.slice(-4);
};

export default function PayIntent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isOnBase = chainId === CONTRACT_CHAIN_ID;
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();

  // Intent ID state
  const [intentIdInput, setIntentIdInput] = useState(id || searchParams.get("id") || "");
  const intentId = intentIdInput ? BigInt(intentIdInput) : undefined;

  // Log page mount
  useEffect(() => {
    logPage("mounted", {
      urlIntentId: id,
      queryIntentId: searchParams.get("id"),
      isConnected,
      address,
      chainId,
    });
  }, []);

  // Fetch intent from contract
  const { intent, isLoading: isLoadingIntent, error: intentError, refetch: refetchIntent } = useIntent(intentId);

  // Lock funds hook
  const { lockFunds, isPending: isLocking, isConfirming: isConfirmingLock, error: lockError, processingStep } = useLockFunds();

  // Selected source token (defaulted to first Base token)
  const [selectedSourceKey, setSelectedSourceKey] = useState("0");
  const selectedSource = sourceTokens[parseInt(selectedSourceKey)];
  
  // LI.FI cross-chain functionality (preserved for demonstration and prize submission)
  // Not used in core demo path, but available for testing and showcase
  const [paymentAmount, setPaymentAmount] = useState("");
  const isCrossChain = selectedSource.chainId !== SUPPORTED_CHAINS.BASE || 
                       selectedSource.address.toLowerCase() !== intent?.token.toLowerCase();
  
  // LI.FI route fetching and execution (callable and demonstrable)
  const { 
    routes, 
    isLoading: isLoadingRoutes, 
    error: routeError, 
    fetchRoutes,
    executeRoute,
    isExecuting,
    executionStatus 
  } = useLiFi();

  // Log source token change
  useEffect(() => {
    logPage("sourceTokenChanged", {
      selectedSourceKey,
      sourceToken: selectedSource.label,
      sourceChainId: selectedSource.chainId,
      sourceAddress: selectedSource.address,
    });
  }, [selectedSourceKey, selectedSource]);

  // LI.FI route fetching (preserved for demonstration - not core demo path)
  // Automatically fetch routes when cross-chain options are selected
  useEffect(() => {
    if (intent && selectedSource && address && paymentAmount && isCrossChain) {
      logPage("routeFetchCheck", {
        intentId: intentIdInput,
        isCrossChain,
        sourceChainId: selectedSource.chainId,
        sourceToken: selectedSource.address,
        destToken: intent.token,
        userPaymentAmount: paymentAmount,
        targetAmount: intent.amount.toString(),
        note: "LI.FI routing available for demonstration",
      });

      // Parse user's payment amount
      try {
        const fromAmount = parseUnits(paymentAmount, selectedSource.decimals);
        
        fetchRoutes({
          fromChainId: selectedSource.chainId,
          fromTokenAddress: selectedSource.address,
          toChainId: SUPPORTED_CHAINS.BASE,
          toTokenAddress: intent.token,
          fromAmount: fromAmount.toString(),
          fromAddress: address,
          toAddress: address, // Bridge tokens to payer's wallet first
        });
      } catch (err) {
        logPage("routeFetchError", {
          error: err instanceof Error ? err.message : String(err),
          paymentAmount,
        });
      }
    }
  }, [intent, selectedSource, address, paymentAmount, isCrossChain, fetchRoutes, intentIdInput]);

  // Format expiry time and check if expired
  const formatExpiry = (timestamp: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const remaining = timestamp - now;
    if (remaining <= 0n) return "Expired";
    const minutes = Number(remaining / 60n);
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ${minutes % 60} min`;
  };

  // Check if intent is expired
  const isExpired = intent ? Number(intent.expiry) < Math.floor(Date.now() / 1000) : false;

  // Get state badge color
  const getStateBadge = (state: IntentState) => {
    // Override with EXPIRED if intent is expired
    if (isExpired && (state === IntentState.CREATED || state === IntentState.LOCKED)) {
      return <Badge variant="outline" className="border-red-500 text-red-500">EXPIRED</Badge>;
    }

    switch (state) {
      case IntentState.CREATED:
        return <Badge variant="outline" className="border-blue-500 text-blue-500">CREATED</Badge>;
      case IntentState.LOCKED:
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">LOCKED</Badge>;
      case IntentState.FULFILLED:
        return <Badge variant="outline" className="border-green-500 text-green-500">FULFILLED</Badge>;
      case IntentState.FAILED:
        return <Badge variant="outline" className="border-red-500 text-red-500">FAILED</Badge>;
      case IntentState.REFUNDED:
        return <Badge variant="outline" className="border-gray-500 text-gray-500">REFUNDED</Badge>;
      default:
        return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  // Handle payment execution - same-chain primary, LI.FI demonstration available
  const handlePay = async () => {
    if (!intent || !address || !walletClient || !publicClient || !isOnBase) {
      logPage("payBlocked", {
        reason: "Missing required data or not on Base",
        hasIntent: !!intent,
        hasAddress: !!address,
        hasWalletClient: !!walletClient,
        hasPublicClient: !!publicClient,
        isOnBase,
      });
      return;
    }

    const isSameChainSameToken = 
      selectedSource.chainId === SUPPORTED_CHAINS.BASE && 
      selectedSource.address.toLowerCase() === intent.token.toLowerCase();

    logPage("payInitiated", {
      intentId: intentIdInput,
      isSameChainSameToken,
      isCrossChain,
      sourceToken: selectedSource.label,
      sourceChainId: selectedSource.chainId,
      destToken: getTokenLabel(intent.token),
      amount: intent.amount.toString(),
      amountFormatted: formatUnits(intent.amount, 6),
      payer: address,
      receiver: intent.receiver,
      isLiFiDemo: isCrossChain,
    });

    try {
      if (isSameChainSameToken) {
        // Direct lock on Base - primary demo path
        logPage("directLock:start", { 
          intentId: intentIdInput,
          note: "Primary demo path: direct lock on Base",
          requiredToken: intent.token,
          requiredAmount: intent.amount.toString(),
        });
        
        const lockResult = await lockFunds(intentId!, address, intent);
        
        logPage("directLock:success", { 
          intentId: intentIdInput,
          txHash: lockResult,
        });
      } else if (isCrossChain && routes && routes.length > 0) {
        // LI.FI demonstration path - preserved for prize submission
        logPage("lifiDemo:start", {
          intentId: intentIdInput,
          note: "LI.FI prize submission demonstration",
          route: {
            fromChain: routes[0].fromChainId,
            toChain: routes[0].toChainId,
            fromToken: routes[0].fromToken?.symbol,
            toToken: routes[0].toToken?.symbol,
            fromAmount: routes[0].fromAmount,
            toAmount: routes[0].toAmount,
            steps: routes[0].steps?.length,
          },
        });

        const bridgeResult = await executeRoute(routes[0], walletClient, publicClient);
        
        if (!bridgeResult.success) {
           throw new Error(bridgeResult.error || "LI.FI demo execution failed");
        }

        logPage("lifiDemo:success", {
          intentId: intentIdInput,
          bridgeResult,
          txHash: bridgeResult.txHash,
          note: "LI.FI demonstration completed successfully",
        });

        // Show success message for LI.FI demonstration
        alert(`LI.FI Demo Successful!\n\nTransaction: ${bridgeResult.txHash}\n\nThis demonstrates LI.FI integration for the prize submission.\nNote: This is separate from the core intent settlement protocol.`);
        
        return; // Don't navigate away for demo
      } else {
        logPage("payFailed", {
          reason: "No valid payment path available",
          isSameChainSameToken,
          isCrossChain,
          hasRoutes: routes?.length || 0,
        });
        return;
      }
      
      // Navigate to intent status after successful same-chain payment
      logPage("payComplete", {
        intentId: intentIdInput,
        navigatingTo: `/intent/${intentIdInput}`,
      });
      navigate(`/intent/${intentIdInput}`);
    } catch (err: any) {
      logPage("payError", {
        intentId: intentIdInput,
        isCrossChain,
        error: err?.message || String(err),
        errorCode: err?.code,
        errorName: err?.name,
        stack: err?.stack?.split("\n").slice(0, 5),
      });
      console.error("Payment failed:", err);
    }
  };

  const isProcessing = isLocking || isConfirmingLock || isExecuting;
  const selectedRoute = routes?.[0];

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 z-0">
        <VideoBackground src="https://customer-cbeadsgr09pnsezs.cloudflarestream.com/12a9780eeb1ea015801a5f55cf2e9d3d/manifest/video.m3u8" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background" />
      </div>

      <Header />

      <main className="relative z-10 pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-8 max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl mb-4 text-foreground">
              Pay Intent
            </h1>
            <p className="text-muted-foreground text-lg">
              Fund settlement using tokens on Base. LI.FI cross-chain funding is available separately.
            </p>
          </div>

          <div className="mb-6">
            <NetworkWarning />
          </div>

          {/* Intent ID Input */}
          {!id && (
            <div className="premium-card mb-8">
              <div className="space-y-3">
                <Label className="text-foreground">Intent ID</Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    value={intentIdInput}
                    onChange={(e) => setIntentIdInput(e.target.value)}
                    placeholder="Enter intent ID"
                    className="bg-background border-border"
                  />
                  <Button variant="outline" onClick={() => refetchIntent()}>
                    Load
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingIntent && (
            <div className="premium-card text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Loading intent...</p>
            </div>
          )}

          {/* Intent Error */}
          {intentError && (
            <div className="premium-card border-destructive/50 mb-8">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>Failed to load intent: {intentError.message}</span>
              </div>
            </div>
          )}

          {/* Intent Summary Card */}
          {intent && !isLoadingIntent && (
            <>
              <div className="premium-card mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-xl text-foreground">Intent Summary</h2>
                  {getStateBadge(intent.state)}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Target
                    </span>
                    <span className="font-medium text-foreground">
                      {formatUnits(intent.amount, 6)} {getTokenLabel(intent.token)} on Base
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Expiry
                    </span>
                    <span className="font-medium text-foreground">
                      {formatExpiry(intent.expiry)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-muted-foreground">Receiver</span>
                    <code className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded">
                      {intent.receiver.slice(0, 6)}...{intent.receiver.slice(-4)}
                    </code>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground">Intent ID</span>
                    <code className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded">
                      #{intentIdInput}
                    </code>
                  </div>
                </div>
              </div>

              {/* Payment Options - only show for CREATED state */}
              {intent.state === IntentState.CREATED && (
                <div className="premium-card space-y-6">
                  {/* Expired notification */}
                  {isExpired && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-100 mb-1">Intent Expired</p>
                          <p className="text-sm text-red-200 mb-2">
                            This intent has expired and can no longer be paid. It should be marked as failed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Network requirement notification */}
                  {!isOnBase && !isExpired && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-100 mb-1">Network Required: Base</p>
                          <p className="text-sm text-yellow-200">
                            Cross-chain funding is demonstrated separately. Please switch to Base to complete this intent.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  
                  {/* Info box about direct payment requirements - only show when on Base */}
                  {isOnBase && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-blue-100">
                          <p className="font-medium mb-1">Direct Funding on Base</p>
                          <p className="text-blue-200">
                            You must already have {formatUnits(intent.amount, 6)} {getTokenLabel(intent.token)} in your wallet on Base to fund this settlement directly.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Payment source selection - Base tokens for primary path, all tokens for demonstration */}
                  <div className="space-y-3">
                    <Label className="text-foreground">Pay With</Label>
                    <Select value={selectedSourceKey} onValueChange={setSelectedSourceKey}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select payment asset" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {/* Base tokens (primary demo path) */}
                        <optgroup label="Base (Primary Demo Path)">
                          {sourceTokens
                            .filter(token => token.chainId === CONTRACT_CHAIN_ID)
                            .map((token, idx) => {
                              const originalIdx = sourceTokens.findIndex(t => t.chainId === token.chainId && t.address === token.address);
                              return (
                                <SelectItem key={`base-${idx}`} value={originalIdx.toString()}>
                                  <span className="flex items-center gap-2">
                                    <span className="text-primary">{token.icon}</span>
                                    {token.label}
                                  </span>
                                </SelectItem>
                              );
                            })
                          }
                        </optgroup>
                        {/* Cross-chain tokens (LI.FI demonstration) */}
                        <optgroup label="Cross-Chain (LI.FI Demo)">
                          {sourceTokens
                            .filter(token => token.chainId !== CONTRACT_CHAIN_ID)
                            .map((token, idx) => {
                              const originalIdx = sourceTokens.findIndex(t => t.chainId === token.chainId && t.address === token.address);
                              return (
                                <SelectItem key={`cross-${idx}`} value={originalIdx.toString()}>
                                  <span className="flex items-center gap-2">
                                    <span className="text-primary">{token.icon}</span>
                                    {token.label} <span className="text-xs text-muted-foreground">(Demo)</span>
                                  </span>
                                </SelectItem>
                              );
                            })
                          }
                        </optgroup>
                      </SelectContent>
                    </Select>
                    {isCrossChain && (
                      <p className="text-xs text-blue-400">
                        Cross-chain option selected - LI.FI integration will be demonstrated
                      </p>
                    )}
                    
                    {!isCrossChain && (
                      <p className="text-xs text-muted-foreground">
                        Select Arbitrum tokens above to demonstrate LI.FI cross-chain routing
                      </p>
                    )}
                  </div>

                  {/* Payment amount input for cross-chain LI.FI demonstration */}
                  {isCrossChain && isOnBase && (
                    <div className="space-y-3">
                      <Label className="text-foreground">Amount to Pay (LI.FI Demo)</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={`Enter amount (e.g., 5 for $5)`}
                        className="bg-background border-border focus:border-primary"
                        step="0.01"
                        min="0"
                      />
                      <p className="text-xs text-blue-400">
                        Enter amount to demonstrate LI.FI cross-chain routing. 
                        Target: {formatUnits(intent.amount, 6)} {getTokenLabel(intent.token)} on Base
                      </p>
                    </div>
                  )}

                  {/* LI.FI Route Info (Demonstration) */}
                  {isCrossChain && isOnBase && isLoadingRoutes && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-blue-400">LI.FI: Finding optimal route...</span>
                    </div>
                  )}

                  {isCrossChain && isOnBase && selectedRoute && (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-200">LI.FI Route Demo</span>
                          <span className="text-xs text-blue-400">Prize Submission</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-300">You pay</span>
                          <span className="text-sm font-medium text-blue-100">{paymentAmount} {selectedSource.label.split(" ")[0]}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-300">You receive (estimated)</span>
                          <span className="text-sm font-medium text-blue-100">{formatUnits(BigInt(selectedRoute.toAmount), 6)} {getTokenLabel(intent.token)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-300">Route via</span>
                          <span className="text-sm font-medium text-blue-100">{selectedRoute.steps.map(s => s.tool).join(" → ")}</span>
                        </div>
                      </div>
                      <p className="text-xs text-blue-400">
                        ℹ️ This demonstrates LI.FI integration but is separate from the core intent settlement protocol
                      </p>
                    </div>
                  )}

                  {isCrossChain && isOnBase && routeError && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                      <span className="text-yellow-400">LI.FI Demo: {routeError}</span>
                    </div>
                  )}

                  {isCrossChain && isOnBase && executionStatus && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                      <span className="text-blue-400">LI.FI Status: {executionStatus}</span>
                    </div>
                  )}
                  {lockError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {lockError.message}
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      onClick={handlePay}
                      variant="gold"
                      size="xl"
                      className="w-full"
                      disabled={!isConnected || !isOnBase || isProcessing || isExpired || (isCrossChain && (!paymentAmount || isLoadingRoutes || !routes.length))}
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {isExecuting ? "LI.FI Demo..." : processingStep || "Processing..."}
                        </span>
                      ) : !isConnected ? (
                        "Connect Wallet"
                      ) : !isOnBase ? (
                        "Switch to Base Network"
                      ) : isExpired ? (
                        "Intent Expired"
                      ) : isCrossChain ? (
                        "Demonstrate LI.FI Integration"
                      ) : (
                        <>
                          Lock Payment
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    {isOnBase && !isExpired && (
                      <p className="text-center text-sm text-muted-foreground mt-4">
                        {isCrossChain 
                          ? "LI.FI demonstration for prize submission - separate from core protocol"
                          : "Direct payment on Base - you must have the tokens in your wallet"
                        }
                      </p>
                    )}

                    {isExpired && (
                      <p className="text-center text-sm text-red-400 mt-4">
                        This intent has expired and cannot be paid
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Already locked/fulfilled message */}
              {intent.state !== IntentState.CREATED && (
                <div className="premium-card text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    This intent has already been {IntentState[intent.state].toLowerCase()}.
                  </p>
                  <Button variant="outline" onClick={() => navigate(`/intent/${intentIdInput}`)}>
                    View Intent Status
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* No intent loaded */}
          {!intent && !isLoadingIntent && !intentError && intentIdInput && (
            <div className="premium-card text-center py-12">
              <p className="text-muted-foreground">Enter an intent ID to load payment details</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
