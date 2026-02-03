import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const exampleIntents = [
  { id: "example-created", label: "Created", status: "CREATED" },
  { id: "example-locked", label: "Locked", status: "LOCKED" },
  { id: "example-fulfilled", label: "Fulfilled", status: "FULFILLED" },
  { id: "example-failed", label: "Failed", status: "FAILED" },
  { id: "example-refunded", label: "Refunded", status: "REFUNDED" },
];

export function Header() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  const isExampleActive = location.pathname.startsWith("/intent/example-");

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
              to="/create-intent"
              className={cn(
                "text-sm font-medium transition-colors duration-300",
                isActive("/create-intent")
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Create Intent
            </Link>

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

            {/* Examples Dropdown */}
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium transition-colors duration-300",
                    isExampleActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Examples
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-card border-border"
              >
                {exampleIntents.map((intent) => (
                  <DropdownMenuItem key={intent.id} asChild>
                    <Link
                      to={`/intent/${intent.id}`}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{intent.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {intent.status}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
