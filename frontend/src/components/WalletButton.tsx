import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { isContractChain, isSupportedChain, getChainName } from "@/lib/chains";

/**
 * WalletButton — RainbowKit connect button styled to match the design system
 * 
 * Shows:
 * - Connect button when disconnected
 * - Truncated address + chain when connected
 * - Warning state for unsupported chains
 */
export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-300"
                  >
                    Connect Wallet
                  </button>
                );
              }

              // Check for unsupported chain
              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors duration-300"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {/* Chain Selector */}
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors duration-300"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? "Chain icon"}
                        src={chain.iconUrl}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </button>

                  {/* Account */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-card border border-border text-foreground hover:bg-card/80 transition-colors duration-300"
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

/**
 * NetworkWarning — Shows contextual message based on connected chain
 * 
 * - Unsupported chain: "Please switch to Base or Arbitrum to continue."
 * - Arbitrum: "Switch to Base to interact with intents."
 * - Base: No warning
 */
export function NetworkWarning() {
  const chainId = useChainId();
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  // Unsupported network
  if (!isSupportedChain(chainId)) {
    return (
      <div className="w-full bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">
        Please switch to Base or Arbitrum to continue.
      </div>
    );
  }

  // On Optimism (can't interact with contract)
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
