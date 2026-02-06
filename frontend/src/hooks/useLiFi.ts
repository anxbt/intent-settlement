/**
 * useLiFi Hook
 *
 * React hook for LI.FI cross-chain routing and execution.
 * Uses direct API calls - no SDK dependency.
 *
 * ⚠️ IMPORTANT: This handles real money transactions.
 * All operations are logged for debugging and audit purposes.
 */

import { useState, useCallback } from "react";
import { useAccount, useChainId, useWalletClient, usePublicClient } from "wagmi";
import type { WalletClient, PublicClient } from "viem";
import {
  fetchRoutes as fetchLiFiRoutes,
  formatRouteEstimate,
  SUPPORTED_CHAINS,
  SUPPORTED_TOKENS,
  type LiFiRoute,
  type LiFiRouteParams,
  type RouteExecutionStatus,
  type RouteExecutionResult,
} from "@/lib/lifi";

// ============================================================================
// LOGGING UTILITIES - Critical for debugging real money transactions
// ============================================================================

const LOG_PREFIX = "[LiFi]";

interface LogData {
  [key: string]: unknown;
}

function logInfo(operation: string, data: LogData) {
  console.log(
    `%c${LOG_PREFIX} [INFO] ${operation}`,
    "color: #06b6d4; font-weight: bold;",
    {
      timestamp: new Date().toISOString(),
      ...data,
    }
  );
}

function logSuccess(operation: string, data: LogData) {
  console.log(
    `%c${LOG_PREFIX} [SUCCESS] ${operation}`,
    "color: #22c55e; font-weight: bold;",
    {
      timestamp: new Date().toISOString(),
      ...data,
    }
  );
}

function logError(operation: string, error: unknown, context: LogData = {}) {
  console.error(
    `%c${LOG_PREFIX} [ERROR] ${operation}`,
    "color: #ef4444; font-weight: bold;",
    {
      timestamp: new Date().toISOString(),
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack, name: error.name }
          : error,
      ...context,
    }
  );
}

function logBridge(phase: "request" | "route_found" | "executing" | "tx_sent" | "confirmed" | "failed", data: LogData) {
  const colors = {
    request: "#f59e0b",
    route_found: "#3b82f6",
    executing: "#8b5cf6",
    tx_sent: "#06b6d4",
    confirmed: "#22c55e",
    failed: "#ef4444",
  };
  console.log(
    `%c${LOG_PREFIX} [BRIDGE:${phase.toUpperCase()}] `,
    `color: ${colors[phase]}; font-weight: bold;`,
    {
      timestamp: new Date().toISOString(),
      ...data,
    }
  );
}

export interface UseLiFiRoutesParams {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  slippage?: number;
}

export interface RouteEstimate {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  gasCostUSD: string;
  executionTime: number;
  steps: Array<{
    type: string;
    tool: string;
    fromChain: number;
    toChain: number;
  }>;
}

/**
 * Hook for fetching and executing LI.FI routes
 */
export function useLiFi() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [routes, setRoutes] = useState<LiFiRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);

  // Check if wallet is on a supported chain
  const isOnSupportedChain =
    chainId === SUPPORTED_CHAINS.ARBITRUM || chainId === SUPPORTED_CHAINS.BASE;

  const fetchRoutes = useCallback(
    async (params: LiFiRouteParams) => {
      logBridge("request", {
        fromChainId: params.fromChainId,
        toChainId: params.toChainId,
        fromToken: params.fromTokenAddress,
        toToken: params.toTokenAddress,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        slippage: params.slippage,
      });

      if (!address) {
        const errMsg = "Please connect your wallet";
        logError("fetchRoutes", new Error(errMsg), {});
        setError(errMsg);
        return;
      }

      setIsLoading(true);
      setError(null);
      setRoutes([]);

      try {
        const fetchedRoutes = await fetchLiFiRoutes(params);

        if (fetchedRoutes.length === 0) {
          const errMsg = "No routes found for this transfer";
          logError("fetchRoutes", new Error(errMsg), params);
          setError(errMsg);
          return;
        }

        // Log all found routes
        logBridge("route_found", {
          routeCount: fetchedRoutes.length,
          bestRoute: {
            id: fetchedRoutes[0].id,
            fromAmount: fetchedRoutes[0].fromAmount,
            toAmount: fetchedRoutes[0].toAmount,
            toAmountMin: fetchedRoutes[0].toAmountMin,
            gasCostUSD: fetchedRoutes[0].gasCostUSD,
            stepsCount: fetchedRoutes[0].steps.length,
            tools: fetchedRoutes[0].steps.map(s => s.tool).join(" → "),
          },
        });

        setRoutes(fetchedRoutes);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to fetch routes";
        logError("fetchRoutes", err, params);
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [address]
  );

  const executeRoute = useCallback(
    async (
      route: LiFiRoute,
      walletClientOverride?: WalletClient,
      publicClientOverride?: PublicClient
    ): Promise<RouteExecutionResult> => {
      const wc = walletClientOverride || walletClient;
      const pc = publicClientOverride || publicClient;

      logBridge("executing", {
        routeId: route.id,
        fromChainId: route.fromChainId,
        toChainId: route.toChainId,
        fromToken: route.fromToken.symbol,
        toToken: route.toToken.symbol,
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
        stepsCount: route.steps.length,
        tools: route.steps.map(s => s.tool).join(" → "),
      });

      if (!wc || !pc) {
        const errMsg = "Wallet not connected";
        logError("executeRoute", new Error(errMsg), { routeId: route.id });
        return { success: false, error: errMsg };
      }

      setIsExecuting(true);
      setExecutionStatus("Preparing transaction...");

      try {
        // For each step, we need to execute the transaction
        for (let i = 0; i < route.steps.length; i++) {
          const step = route.steps[i];
          
          logInfo(`executeRoute:step${i + 1}`, {
            stepIndex: i + 1,
            totalSteps: route.steps.length,
            type: step.type,
            tool: step.tool,
            fromChainId: step.action.fromChainId,
            toChainId: step.action.toChainId,
            hasTransactionRequest: !!step.transactionRequest,
          });

          if (!step.transactionRequest) {
            // If no transaction request, the step needs to be fetched first
            logInfo("executeRoute:skipStep", {
              reason: "No transaction request",
              tool: step.tool,
            });
            setExecutionStatus(`Executing ${step.tool}...`);
            continue;
          }

          const { to, data, value, gasLimit } = step.transactionRequest;

          logBridge("tx_sent", {
            stepIndex: i + 1,
            tool: step.tool,
            to,
            value,
            gasLimit,
            dataLength: data?.length,
          });

          setExecutionStatus(`Sending transaction via ${step.tool}...`);

          // Send the transaction
          const hash = await wc.sendTransaction({
            to: to as `0x${string}`,
            data: data as `0x${string}`,
            value: BigInt(value || "0"),
            gas: BigInt(gasLimit || "200000"),
          });

          logInfo("executeRoute:txSubmitted", {
            transactionHash: hash,
            tool: step.tool,
          });

          setExecutionStatus("Waiting for confirmation...");

          // Wait for confirmation
          const receipt = await pc.waitForTransactionReceipt({ hash });

          logBridge("confirmed", {
            transactionHash: hash,
            tool: step.tool,
            blockNumber: receipt.blockNumber.toString(),
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status,
          });
        }

        logSuccess("executeRoute:complete", {
          routeId: route.id,
          stepsExecuted: route.steps.length,
        });

        setExecutionStatus(null);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Execution failed";
        logBridge("failed", {
          routeId: route.id,
          error: errorMsg,
        });
        setError(errorMsg);
        setExecutionStatus(null);
        return { success: false, error: errorMsg };
      } finally {
        setIsExecuting(false);
      }
    },
    [walletClient, publicClient]
  );

  const clearRoutes = useCallback(() => {
    logInfo("clearRoutes", { previousRouteCount: routes.length });
    setRoutes([]);
    setError(null);
    setExecutionStatus(null);
  }, [routes.length]);

  return {
    routes,
    isLoading,
    error,
    fetchRoutes,
    executeRoute,
    isExecuting,
    executionStatus,
    clearRoutes,
    isOnSupportedChain,
    canFetchRoutes: !!address,
  };
}

// Re-export constants for convenience
export { SUPPORTED_CHAINS, SUPPORTED_TOKENS };
