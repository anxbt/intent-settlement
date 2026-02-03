import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Slider } from "@/components/ui/slider";

const chains = [
  { value: "ethereum", label: "Ethereum" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "polygon", label: "Polygon" },
  { value: "base", label: "Base" },
];

const tokens = [
  { value: "usdc", label: "USDC" },
  { value: "usdt", label: "USDT" },
  { value: "dai", label: "DAI" },
  { value: "eth", label: "ETH" },
];

export default function CreateIntent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    token: "usdc",
    chain: "ethereum",
    amount: "500",
    slippage: [0.5],
    expiry: "10",
    receiver: "0x742d35Cc6634C0532925a3b844Bc9e7595f8fE21",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate intent creation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Navigate to a new intent status page
    const intentId = `0x${Math.random().toString(16).slice(2, 10)}`;
    navigate(`/intent/${intentId}`);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Video Background */}
      <div className="fixed inset-0 z-0">
        <VideoBackground 
          src="https://customer-cbeadsgr09pnsezs.cloudflarestream.com/12a9780eeb1ea015801a5f55cf2e9d3d/manifest/video.m3u8"
        />
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

          <form onSubmit={handleSubmit} className="premium-card space-y-8">
            {/* Token Selection */}
            <div className="space-y-3">
              <Label htmlFor="token" className="text-foreground">
                Receive Token
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

            {/* Chain Selection */}
            <div className="space-y-3">
              <Label htmlFor="chain" className="text-foreground">
                Receive Chain
              </Label>
              <Select
                value={formData.chain}
                onValueChange={(value) => setFormData({ ...formData, chain: value })}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {chains.map((chain) => (
                    <SelectItem key={chain.value} value={chain.value}>
                      {chain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
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
              />
            </div>

            {/* Slippage */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-foreground">Max Slippage</Label>
                <span className="text-sm text-primary font-medium">
                  {formData.slippage[0]}%
                </span>
              </div>
              <Slider
                value={formData.slippage}
                onValueChange={(value) => setFormData({ ...formData, slippage: value })}
                max={5}
                min={0.1}
                step={0.1}
                className="py-2"
              />
            </div>

            {/* Expiry */}
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
                placeholder="10"
              />
            </div>

            {/* Receiver Address */}
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
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="gold"
              size="xl"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating Intent...
                </span>
              ) : (
                "Generate Intent"
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
