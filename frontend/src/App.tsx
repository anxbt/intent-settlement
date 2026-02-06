import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/lib/wallet";
import Index from "./pages/Index";
import CreateIntent from "./pages/CreateIntent";
import PayIntent from "./pages/PayIntent";
import IntentStatus from "./pages/IntentStatus";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Custom RainbowKit theme to match the design system
const customTheme = darkTheme({
  accentColor: "hsl(43 56% 52%)", // primary (champagne gold)
  accentColorForeground: "hsl(240 6% 4%)", // primary-foreground
  borderRadius: "medium",
  fontStack: "system",
});

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={customTheme} modalSize="compact">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/create" element={<CreateIntent />} />
              <Route path="/create-intent" element={<CreateIntent />} />
              <Route path="/pay/:id" element={<PayIntent />} />
              <Route path="/pay-intent" element={<PayIntent />} />
              <Route path="/intent/:id" element={<IntentStatus />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;
