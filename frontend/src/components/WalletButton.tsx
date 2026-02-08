import { useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { isContractChain, isSupportedChain, getChainName } from "@/lib/chains";
import { base, arbitrum } from "wagmi/chains";

/**
 * WalletButton — pure wagmi wallet connect / disconnect button.
 *
 * Shows:
 * - "Connect Wallet" when disconnected (lists available connectors)
 * - Chain name + truncated address when connected
 * - "Wrong Network" when on unsupported chain
 */
export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [menuOpen, setMenuOpen] = useState(false);

  // Truncate address for display
  const truncated = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  // --- Disconnected state ---
  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          type="button"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-300 disabled:opacity-60"
        >
          {isPending ? "Connecting…" : "Connect Wallet"}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => {
                  connect({ connector: c });
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Connected but unsupported chain ---
  const supported = chain && isSupportedChain(chain.id);
  if (!supported) {
    return (
      <button
        onClick={() => switchChain?.({ chainId: base.id })}
        type="button"
        className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors duration-300"
      >
        Wrong Network
      </button>
    );
  }

  // --- Connected, valid chain ---
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Chain switcher */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          type="button"
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors duration-300"
        >
          <span className="hidden sm:inline">{chain.name}</span>
        </button>

        {/* Address + disconnect */}
        <button
          onClick={() => disconnect()}
          type="button"
          className="px-3 py-2 text-sm font-medium rounded-lg bg-card border border-border text-foreground hover:bg-card/80 transition-colors duration-300"
          title="Disconnect"
        >
          {truncated}
        </button>
      </div>

      {/* Chain switch dropdown */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
          {[base, arbitrum].map((c) => (
            <button
              key={c.id}
              onClick={() => {
                switchChain?.({ chainId: c.id });
                setMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                chain.id === c.id
                  ? "text-primary font-medium bg-secondary/50"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * NetworkWarning — Shows contextual message based on connected chain
 */
export function NetworkWarning() {
  const chainId = useChainId();
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  if (!isSupportedChain(chainId)) {
    return (
      <div className="w-full bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">
        Please switch to Base or Arbitrum to continue.
      </div>
    );
  }

  if (!isContractChain(chainId)) {
    return (
      <div className="w-full bg-warning/10 border border-warning/20 rounded-lg px-4 py-3 text-sm text-warning">
        Switch to Base to interact with intents.
      </div>
    );
  }

  return null;
}

/**
 * Hook to check if contract interactions are enabled
 */
export function useCanInteract(): boolean {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  return isConnected && isContractChain(chainId);
}
