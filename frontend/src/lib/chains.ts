import { base, arbitrum } from "wagmi/chains";

/**
 * Supported chains for Intent Settlement Protocol
 * 
 * - Base: Contract deployment chain (IntentEscrow)
 * - Arbitrum: Supported for LI.FI bridging
 * 
 * No testnets. No other mainnets.
 */
export const supportedChains = [base, arbitrum] as const;

export const CONTRACT_CHAIN_ID = base.id; // 8453

export type SupportedChainId = typeof supportedChains[number]["id"];

export function isContractChain(chainId: number | undefined): boolean {
  return chainId === CONTRACT_CHAIN_ID;
}

export function isSupportedChain(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return supportedChains.some((chain) => chain.id === chainId);
}

export function getChainName(chainId: number | undefined): string {
  if (!chainId) return "Unknown";
  const chain = supportedChains.find((c) => c.id === chainId);
  return chain?.name ?? "Unsupported";
}
