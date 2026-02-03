import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight, Clock, Target } from "lucide-react";

const paymentAssets = [
  { value: "eth-base", label: "ETH on Base", icon: "Ξ" },
  { value: "usdc-arbitrum", label: "USDC on Arbitrum", icon: "$" },
  { value: "usdt-polygon", label: "USDT on Polygon", icon: "$" },
  { value: "eth-optimism", label: "ETH on Optimism", icon: "Ξ" },
];

export default function PayIntent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState("eth-base");

  // Mock intent data
  const intent = {
    id: "0x7a3b4c5d",
    token: "USDC",
    chain: "Ethereum",
    amount: "500",
    expiry: "10 minutes",
    status: "CREATED",
  };

  const handlePay = async () => {
    setIsLoading(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Navigate to intent status
    navigate("/intent/example-locked");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 lg:px-8 max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl md:text-5xl mb-4 text-foreground">
              Pay Intent
            </h1>
            <p className="text-muted-foreground text-lg">
              Choose how you want to fulfill this payment intent.
            </p>
          </div>

          {/* Intent Summary Card */}
          <div className="premium-card mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-foreground">
                Intent Summary
              </h2>
              <Badge 
                variant="outline" 
                className="border-primary text-primary"
              >
                {intent.status}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Target
                </span>
                <span className="font-medium text-foreground">
                  {intent.amount} {intent.token} on {intent.chain}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Expiry
                </span>
                <span className="font-medium text-foreground">
                  {intent.expiry}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">Intent ID</span>
                <code className="text-sm font-mono text-foreground bg-background px-2 py-1 rounded">
                  {intent.id}
                </code>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="premium-card space-y-6">
            <div className="space-y-3">
              <Label className="text-foreground">
                Pay With
              </Label>
              <Select
                value={selectedAsset}
                onValueChange={setSelectedAsset}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select payment asset" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {paymentAssets.map((asset) => (
                    <SelectItem key={asset.value} value={asset.value}>
                      <span className="flex items-center gap-2">
                        <span className="text-primary">{asset.icon}</span>
                        {asset.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button
                onClick={handlePay}
                variant="gold"
                size="xl"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Processing with LI.FI...
                  </span>
                ) : (
                  <>
                    Pay with LI.FI Composer
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
              
              <p className="text-center text-sm text-muted-foreground mt-4">
                LI.FI will find the optimal cross-chain route
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
