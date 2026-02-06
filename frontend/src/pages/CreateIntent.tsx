/**
 * CreateIntent Page
 *
 * Intent settlement flow:
 * 1) User (Receiver) specifies desired token, amount, and expiry
 * 2) Contract creates intent with state = CREATED
 * 3) User shares intent ID with payer
 * 4) Payer locks funds via LI.FI or direct transfer
 *
 * ⚠️ LOGGING: All user actions are logged for debugging real money transactions
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { parseUnits } from "viem";
import { Header } from "@/components/Header";
import { VideoBackground } from "@/components/VideoBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NetworkWarning } from "@/components/WalletButton";
import { useCreateIntent, useNextIntentId } from "@/hooks/useIntentContract";
import { CONTRACT_CHAIN_ID } from "@/lib/contract";
import { SUPPORTED_TOKENS, SUPPORTED_CHAINS } from "@/hooks/useLiFi";

// Page-level logging
const LOG_PREFIX = "[CreateIntent]";
function logPage(action: string, data: Record<string, unknown>) {
  console.log(`%c${LOG_PREFIX} ${action}`, "color: #ec4899; font-weight: bold;", {
    timestamp: new Date().toISOString(),
    ...data,
  });
}

// Tokens available on Base (destination chain)
const tokens = [
  { value: SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].USDC, label: "USDC", decimals: 6 },
  { value: SUPPORTED_TOKENS[SUPPORTED_CHAINS.BASE].ETH, label: "ETH", decimals: 18 },
];

export default function CreateIntent() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isOnBase = chainId === CONTRACT_CHAIN_ID;

  const { createIntent, isPending, isConfirming, isSuccess, error, hash, createdIntentId, currentHash } = useCreateIntent();
  const { nextIntentId, refetch: refetchNextId } = useNextIntentId();

  const [formData, setFormData] = useState({
    token: tokens[0].value,
    amount: "10",
    expiry: "30",
    receiver: "",
  });

  // Log page mount
  useEffect(() => {
    logPage("mounted", {
      isConnected,
      address,
      chainId,
      isOnBase,
      contractChainId: CONTRACT_CHAIN_ID,
    });
  }, []);

  useEffect(() => {
    if (address && !formData.receiver) {
      logPage("autoFillReceiver", { address });
      setFormData((prev) => ({ ...prev, receiver: address }));
    }
  }, [address, formData.receiver]);

  useEffect(() => {
    // Only use the decoded intentId from logs. 
    // The fallback to nextIntentId was causing race conditions where we'd navigate to an old ID
    // because nextIntentId hadn't updated yet when isSuccess became true.
    const derivedId = createdIntentId; 
    
    // Only navigate when we have a current transaction hash to avoid old redirects
    // Both hash and currentHash must exist and match exactly
    if (derivedId !== null && hash && currentHash && currentHash === hash && isSuccess) {
      logPage("intentCreated:navigating", {
        createdIntentId: derivedId.toString(),
        transactionHash: hash,
        currentHash,
        source: "decodedLog",
      });
      navigate(`/intent/${derivedId.toString()}`);
    }
  }, [createdIntentId, isSuccess, navigate, hash, currentHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      logPage("submitBlocked", { reason: "Wallet not connected" });
      return;
    }

    const selectedToken = tokens.find((t) => t.value === formData.token);
    if (!selectedToken) {
      logPage("submitBlocked", { reason: "Invalid token", token: formData.token });
      return;
    }

    const amount = parseUnits(formData.amount, selectedToken.decimals);
    const expiryMinutes = parseInt(formData.expiry, 10);
    const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + expiryMinutes * 60);

    logPage("formSubmit", {
      token: selectedToken.label,
      tokenAddress: formData.token,
      amountRaw: formData.amount,
      amountParsed: amount.toString(),
      expiryMinutes,
      expiryTimestamp: expiryTimestamp.toString(),
      expiryDate: new Date(Number(expiryTimestamp) * 1000).toISOString(),
      receiver: formData.receiver,
      caller: address,
    });

    try {
      await createIntent(
        formData.receiver as `0x${string}`,
        formData.token as `0x${string}`,
        amount,
        expiryTimestamp
      );
      refetchNextId();
    } catch (err) {
      logPage("submitError", {
        error: err instanceof Error ? err.message : err,
      });
      console.error("Failed to create intent:", err);
    }
  };

  const isLoading = isPending || isConfirming;
  const canSubmit = isConnected && isOnBase && !isLoading;

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
              Create Payment Intent
            </h1>
            <p className="text-muted-foreground text-lg">
              Define exactly what you expect to receive. The intent becomes a binding commitment.
            </p>
          </div>

          <div className="mb-6">
            <NetworkWarning />
          </div>

          {!isConnected && (
            <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg text-center text-muted-foreground">
              Connect your wallet to create an intent
            </div>
          )}

          <form onSubmit={handleSubmit} className="premium-card space-y-8">
            <div className="space-y-3">
              <Label htmlFor="token" className="text-foreground">
                Receive Token (on Base)
              </Label>
              <Select
                value={formData.token}
                onValueChange={(value) => setFormData({ ...formData, token: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {tokens.map((token) => (
                    <SelectItem key={token.value} value={token.value}>
                      {token.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="amount" className="text-foreground">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="bg-background border-border focus:border-primary"
                placeholder="Enter amount"
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="expiry" className="text-foreground">
                Expiry (minutes)
              </Label>
              <Input
                id="expiry"
                type="number"
                value={formData.expiry}
                onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                className="bg-background border-border focus:border-primary"
                placeholder="30"
                min="1"
                max="1440"
              />
              <p className="text-xs text-muted-foreground">
                Intent will expire after this many minutes. Funds can be reclaimed if not fulfilled.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="receiver" className="text-foreground">
                Receiver Address
              </Label>
              <Input
                id="receiver"
                type="text"
                value={formData.receiver}
                onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                className="bg-background border-border focus:border-primary font-mono text-sm"
                placeholder="0x..."
              />
              <p className="text-xs text-muted-foreground">
                Address that will receive funds when intent is fulfilled.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error.message || "Failed to create intent"}
              </div>
            )}

            {hash && (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                <span className="text-muted-foreground">Transaction: </span>
                <a
                  href={`https://basescan.org/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono"
                >
                  {hash.slice(0, 10)}...{hash.slice(-8)}
                </a>
              </div>
            )}

            <Button type="submit" variant="gold" size="xl" className="w-full" disabled={!canSubmit}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Confirm in Wallet...
                </span>
              ) : isConfirming ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating Intent...
                </span>
              ) : !isConnected ? (
                "Connect Wallet to Continue"
              ) : !isOnBase ? (
                "Switch to Base Network"
              ) : (
                "Create Intent"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
