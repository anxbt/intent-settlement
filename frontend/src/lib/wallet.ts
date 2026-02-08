import { createConfig, http, fallback } from "wagmi";
import { base, arbitrum } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

/**
 * Shared RPC URLs — the Alchemy key is used as primary for Base.
 */
export const BASE_RPC_URL =
  import.meta.env.VITE_BASE_RPC_URL ||
  "https://base-rpc.publicnode.com";

/**
 * Wagmi configuration — pure wagmi, no RainbowKit / WalletConnect.
 *
 * Connectors:
 *   - injected  → MetaMask, Brave Wallet, Rabby, etc.
 *   - coinbaseWallet → Coinbase Wallet (no WC projectId needed)
 *
 * Transports use Alchemy as primary, with public fallbacks.
 *
 * Strictly limited to Base + Arbitrum mainnets.
 */
export const config = createConfig({
  chains: [base, arbitrum],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Intent Settlement" }),
  ],
  transports: {
    [base.id]: fallback([
      http(BASE_RPC_URL),
      http("https://base-rpc.publicnode.com"),
      http("https://1rpc.io/base"),
      http(), // default mainnet.base.org as last resort
    ]),
    [arbitrum.id]: fallback([
      http("https://arbitrum-one-rpc.publicnode.com"),
      http("https://1rpc.io/arb"),
      http(), // default arb1.arbitrum.io/rpc as last resort
    ]),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
