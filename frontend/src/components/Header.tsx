import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/WalletButton";

export function Header() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="font-serif text-xl font-semibold text-foreground hover:text-primary transition-colors duration-300"
          >
            IntentPay
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <Link
              to="/pay-intent"
              className={cn(
                "text-sm font-medium transition-colors duration-300",
                isActive("/pay-intent")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Pay Intent
            </Link>

            {/* Wallet Connect */}
            <WalletButton />
          </nav>
        </div>
      </div>
    </header>
  );
}
