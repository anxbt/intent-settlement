

import { encodeFunctionData } from "viem";
import { INTENT_ESCROW_ABI, INTENT_ESCROW_ADDRESS } from "./contract";

// LI.FI API endpoints
const LIFI_API_BASE = "https://li.quest/v1";

// Supported chains for Intent Settlement
export const SUPPORTED_CHAINS = {
  ARBITRUM: 42161,
  BASE: 8453,
} as const;

// Common tokens on each chain
// Arbitrum token addresses from official sources
export const SUPPORTED_TOKENS = {
  [SUPPORTED_CHAINS.ARBITRUM]: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Native USDC on Arbitrum
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT on Arbitrum
    ETH: "0x0000000000000000000000000000000000000000",   // Native ETH
  },
  [SUPPORTED_CHAINS.BASE]: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    ETH: "0x0000000000000000000000000000000000000000",
  },
} as const;

// Type definitions for LI.FI API responses
export interface LiFiRoute {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromToken: LiFiToken;
  toToken: LiFiToken;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  gasCostUSD?: string;
  steps: LiFiStep[];
}

export interface LiFiToken {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  name: string;
  priceUSD?: string;
}

export interface LiFiStep {
  id: string;
  type: "swap" | "cross" | "lifi";
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: LiFiToken;
    toToken: LiFiToken;
    fromAmount: string;
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    executionDuration: number;
    gasCosts?: Array<{
      amount: string;
      amountUSD?: string;
    }>;
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice?: string;
  };
}

export interface LiFiQuoteResponse {
  routes: LiFiRoute[];
}

export interface LiFiRouteParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
}

/**
 * Fetch routes from LI.FI API
 */
export async function fetchRoutes(params: LiFiRouteParams): Promise<LiFiRoute[]> {
  const {
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    fromAmount,
    fromAddress,
    toAddress,
    slippage = 0.5,
  } = params;

  const queryParams = new URLSearchParams({
    fromChain: fromChainId.toString(),
    toChain: toChainId.toString(),
    fromToken: fromTokenAddress,
    toToken: toTokenAddress,
    fromAmount,
    fromAddress,
    toAddress,
    slippage: (slippage / 100).toString(),
    integrator: "intent-settlement",
  });

  try {
    const response = await fetch(`${LIFI_API_BASE}/quote?${queryParams}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    // The /quote endpoint returns a single LiFiStep object
    const step: LiFiStep = await response.json();
    
    // Construct a LiFiRoute object from the step
    const route: LiFiRoute = {
      id: step.id,
      fromChainId: step.action.fromChainId,
      toChainId: step.action.toChainId,
      fromToken: step.action.fromToken,
      toToken: step.action.toToken,
      fromAmount: step.action.fromAmount,
      toAmount: step.estimate.toAmount,
      toAmountMin: step.estimate.toAmountMin,
      gasCostUSD: step.estimate.gasCosts?.reduce((sum, cost) => sum + parseFloat(cost.amountUSD || "0"), 0).toString(),
      steps: [step]
    };

    return [route];
  } catch (error) {
    console.error("Error fetching LI.FI routes:", error);
    throw error;
  }
}

/**
 * Get transaction data for a specific route step
 */
export async function getStepTransaction(stepId: string): Promise<LiFiStep | null> {
  try {
    const response = await fetch(`${LIFI_API_BASE}/step?id=${stepId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting step transaction:", error);
    return null;
  }
}

/**
 * Format route estimate for display
 */
export function formatRouteEstimate(route: LiFiRoute) {
  return {
    fromToken: route.fromToken.symbol,
    toToken: route.toToken.symbol,
    fromAmount: route.fromAmount,
    toAmount: route.toAmount,
    gasCostUSD: route.gasCostUSD || "~",
    executionTime: route.steps.reduce(
      (acc, step) => acc + (step.estimate?.executionDuration || 0),
      0
    ),
    steps: route.steps.map((step) => ({
      type: step.type,
      tool: step.tool,
      fromChain: step.action.fromChainId,
      toChain: step.action.toChainId,
    })),
  };
}

export type RouteExecutionStatus =
  | "pending"
  | "approving"
  | "swapping"
  | "bridging"
  | "executing_contract"
  | "success"
  | "failed";

export interface RouteExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Get token info for display
 */
export function getTokenInfo(chainId: number, tokenAddress: string): { symbol: string; decimals: number } | null {
  const chainTokens = SUPPORTED_TOKENS[chainId as keyof typeof SUPPORTED_TOKENS];
  if (!chainTokens) return null;

  for (const [symbol, address] of Object.entries(chainTokens)) {
    if (address.toLowerCase() === tokenAddress.toLowerCase()) {
      return {
        symbol,
        decimals: symbol === "ETH" ? 18 : 6, // USDC/USDT are 6 decimals
      };
    }
  }
  return null;
}
