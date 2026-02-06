/**
 * useIntentContract Hook
 *
 * React hook for interacting with the IntentEscrow contract.
 * Provides:
 * - Intent state reading
 * - Write operations (createIntent, lockFunds, fulfillIntent, reclaimFunds)
 * - Event listening for state updates
 *
 * ⚠️ IMPORTANT: This handles real money transactions.
 * All operations are logged for debugging and audit purposes.
 */

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { decodeEventLog } from "viem";
import {
  INTENT_ESCROW_ABI,
  INTENT_ESCROW_ADDRESS,
  CONTRACT_CHAIN_ID,
  IntentState,
  INTENT_STATE_LABELS,
} from "@/lib/contract";

// Re-export IntentState for convenience
export { IntentState };

// ============================================================================
// LOGGING UTILITIES - Critical for debugging real money transactions
// ============================================================================

const LOG_PREFIX = "[IntentContract]";

interface LogData {
  [key: string]: unknown;
}

function formatBigInt(value: bigint | undefined): string {
  return value !== undefined ? value.toString() : "undefined";
}

function logInfo(operation: string, data: LogData) {
  console.log(
    `%c${LOG_PREFIX} [INFO] ${operation}`,
    "color: #3b82f6; font-weight: bold;",
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

function logWarning(operation: string, message: string, data: LogData = {}) {
  console.warn(
    `%c${LOG_PREFIX} [WARN] ${operation}`,
    "color: #f59e0b; font-weight: bold;",
    {
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }
  );
}

function logEvent(eventName: string, data: LogData) {
  console.log(
    `%c${LOG_PREFIX} [EVENT] ${eventName}`,
    "color: #8b5cf6; font-weight: bold;",
    {
      timestamp: new Date().toISOString(),
      ...data,
    }
  );
}

function logTransaction(operation: string, phase: "initiated" | "pending" | "confirmed" | "failed", data: LogData) {
  const colors = {
    initiated: "#f59e0b",
    pending: "#3b82f6",
    confirmed: "#22c55e",
    failed: "#ef4444",
  };
  console.log(
    `%c${LOG_PREFIX} [TX:${phase.toUpperCase()}] ${operation}`,
    `color: ${colors[phase]}; font-weight: bold;`,
    {
      timestamp: new Date().toISOString(),
      ...data,
    }
  );
}

// ============================================================================
// TYPES
// ============================================================================

export interface IntentData {
  id: bigint;
  payer: `0x${string}`;
  receiver: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
  expiry: bigint;
  state: IntentState;
  stateLabel: string;
}

// ============================================================================
// HOOK: useIntent - Read intent data from contract
// Maps to: intents(uint256) view function
// ============================================================================

export function useIntent(intentId: bigint | undefined) {
  const [intent, setIntent] = useState<IntentData | null>(null);
  const chainId = useChainId();
  const isCorrectChain = chainId === CONTRACT_CHAIN_ID;

  // Log initialization
  useEffect(() => {
    if (intentId !== undefined) {
      logInfo("useIntent:init", {
        intentId: formatBigInt(intentId),
        chainId,
        expectedChainId: CONTRACT_CHAIN_ID,
        isCorrectChain,
        contractAddress: INTENT_ESCROW_ADDRESS,
      });
    }
  }, [intentId, chainId, isCorrectChain]);

  // Read intent data
  const { data, isLoading, error, refetch } = useReadContract({
    address: INTENT_ESCROW_ADDRESS,
    abi: INTENT_ESCROW_ABI,
    functionName: "intents",
    args: intentId !== undefined ? [intentId] : undefined,
    query: {
      enabled: intentId !== undefined && isCorrectChain,
      refetchInterval: 10000, // Poll every 10 seconds
    },
  });

  // Log read errors
  useEffect(() => {
    if (error) {
      logError("useIntent:read", error, {
        intentId: formatBigInt(intentId),
        contractAddress: INTENT_ESCROW_ADDRESS,
      });
    }
  }, [error, intentId]);

  // Parse contract response into IntentData
  useEffect(() => {
    if (data && intentId !== undefined) {
      const [payer, receiver, token, amount, expiry, state] = data;

      const intentData: IntentData = {
        id: intentId,
        payer,
        receiver,
        token,
        amount,
        expiry,
        state: state as IntentState,
        stateLabel: INTENT_STATE_LABELS[state as IntentState],
      };

      logSuccess("useIntent:read", {
        intentId: formatBigInt(intentId),
        payer,
        receiver,
        token,
        amount: formatBigInt(amount),
        expiry: formatBigInt(expiry),
        expiryDate: new Date(Number(expiry) * 1000).toISOString(),
        state: INTENT_STATE_LABELS[state as IntentState],
        isExpired: BigInt(Math.floor(Date.now() / 1000)) > expiry,
      });

      setIntent(intentData);
    }
  }, [data, intentId]);

  // Watch for FundsLocked event
  useWatchContractEvent({
    address: INTENT_ESCROW_ADDRESS,
    abi: INTENT_ESCROW_ABI,
    eventName: "FundsLocked",
    onLogs: (logs) => {
      for (const log of logs) {
        logEvent("FundsLocked", {
          intentId: log.args.intentId?.toString(),
          payer: log.args.payer,
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber?.toString(),
        });
        if (log.args.intentId === intentId) {
          logInfo("useIntent:refetch", {
            reason: "FundsLocked event received",
            intentId: formatBigInt(intentId),
          });
          refetch();
        }
      }
    },
    enabled: intentId !== undefined && isCorrectChain,
  });

  // Watch for IntentFulfilled event
  useWatchContractEvent({
    address: INTENT_ESCROW_ADDRESS,
    abi: INTENT_ESCROW_ABI,
    eventName: "IntentFulfilled",
    onLogs: (logs) => {
      for (const log of logs) {
        logEvent("IntentFulfilled", {
          intentId: log.args.intentId?.toString(),
          receiver: log.args.receiver,
          amount: log.args.amount?.toString(),
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber?.toString(),
        });
        if (log.args.intentId === intentId) {
          logInfo("useIntent:refetch", {
            reason: "IntentFulfilled event received",
            intentId: formatBigInt(intentId),
          });
          refetch();
        }
      }
    },
    enabled: intentId !== undefined && isCorrectChain,
  });

  // Watch for IntentFailed event
  useWatchContractEvent({
    address: INTENT_ESCROW_ADDRESS,
    abi: INTENT_ESCROW_ABI,
    eventName: "IntentFailed",
    onLogs: (logs) => {
      for (const log of logs) {
        logEvent("IntentFailed", {
          intentId: log.args.intentId?.toString(),
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber?.toString(),
        });
        if (log.args.intentId === intentId) {
          logInfo("useIntent:refetch", {
            reason: "IntentFailed event received",
            intentId: formatBigInt(intentId),
          });
          refetch();
        }
      }
    },
    enabled: intentId !== undefined && isCorrectChain,
  });

  // Watch for FundsReclaimed event
  useWatchContractEvent({
    address: INTENT_ESCROW_ADDRESS,
    abi: INTENT_ESCROW_ABI,
    eventName: "FundsReclaimed",
    onLogs: (logs) => {
      for (const log of logs) {
        logEvent("FundsReclaimed", {
          intentId: log.args.intentId?.toString(),
          payer: log.args.payer,
          amount: log.args.amount?.toString(),
          transactionHash: log.transactionHash,
          blockNumber: log.blockNumber?.toString(),
        });
        if (log.args.intentId === intentId) {
          logInfo("useIntent:refetch", {
            reason: "FundsReclaimed event received",
            intentId: formatBigInt(intentId),
          });
          refetch();
        }
      }
    },
    enabled: intentId !== undefined && isCorrectChain,
  });

  return {
    intent,
    isLoading,
    error,
    refetch,
    isCorrectChain,
  };
}

// ============================================================================
// HOOK: useCreateIntent - Create a new payment intent
// Maps to: createIntent(address receiver, address token, uint256 amount, uint256 expiry)
// ============================================================================

export function useCreateIntent() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === CONTRACT_CHAIN_ID;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const [createdIntentId, setCreatedIntentId] = useState<bigint | null>(null);
  const [currentHash, setCurrentHash] = useState<`0x${string}` | null>(null);

  // Track the latest submitted hash and clear previous intentId on new submissions
  useEffect(() => {
    if (hash && hash !== currentHash) {
      setCurrentHash(hash as `0x${string}`);
      setCreatedIntentId(null);
    } else if (!hash) {
      // Reset state when hash is cleared (new transaction starting)
      setCurrentHash(null);
      setCreatedIntentId(null);
    }
  }, [hash, currentHash]);

  // Log transaction lifecycle
  useEffect(() => {
    if (hash && isPending) {
      logTransaction("createIntent", "pending", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [hash, isPending, address]);

  useEffect(() => {
    if (hash && isConfirming) {
      logTransaction("createIntent", "confirmed", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [hash, isConfirming, address]);

  useEffect(() => {
    if (isSuccess && hash) {
      // Decode IntentCreated from receipt logs to get the intentId
      if (receipt?.logs && receipt.transactionHash === currentHash) {
        try {
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== INTENT_ESCROW_ADDRESS.toLowerCase()) continue;
            const decoded = decodeEventLog({
              abi: INTENT_ESCROW_ABI,
              data: log.data,
              topics: log.topics as `0x${string}`[],
            });
            if (decoded.eventName === "IntentCreated") {
              const intentId = decoded.args.intentId as bigint;
              setCreatedIntentId(intentId);
              logSuccess("createIntent:intentIdDecoded", {
                transactionHash: hash,
                caller: address,
                intentId: intentId.toString(),
              });
              break;
            }
          }
        } catch (err) {
          logError("createIntent:decodeIntentId", err, { transactionHash: hash });
        }
      }

      logSuccess("createIntent:complete", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [isSuccess, hash, address, receipt, currentHash]);

  useEffect(() => {
    if (error) {
      logError("createIntent", error, {
        caller: address,
        transactionHash: hash,
      });
    }
  }, [error, address, hash]);

  const createIntent = useCallback(
    async (
      receiver: `0x${string}`,
      token: `0x${string}`,
      amount: bigint,
      expiry: bigint
    ) => {
      logTransaction("createIntent", "initiated", {
        caller: address,
        receiver,
        token,
        amount: formatBigInt(amount),
        expiry: formatBigInt(expiry),
        expiryDate: new Date(Number(expiry) * 1000).toISOString(),
        contractAddress: INTENT_ESCROW_ADDRESS,
        chainId,
      });

      if (!isCorrectChain) {
        const error = new Error("Please switch to Base to create intents");
        logError("createIntent", error, { currentChainId: chainId, requiredChainId: CONTRACT_CHAIN_ID });
        throw error;
      }

      if (!address) {
        const error = new Error("Wallet not connected");
        logError("createIntent", error, {});
        throw error;
      }

      writeContract({
        address: INTENT_ESCROW_ADDRESS,
        abi: INTENT_ESCROW_ABI,
        functionName: "createIntent",
        args: [receiver, token, amount, expiry],
      });
    },
    [writeContract, isCorrectChain, address, chainId]
  );

  return {
    createIntent,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    createdIntentId,
    currentHash,
    canCreate: isCorrectChain && !!address,
  };
}

// ============================================================================
// HOOK: useLockFunds - Lock funds for an intent (payer action)
// Maps to: lockFunds(uint256 intentId)
// Handles ERC20 approval + lockFunds call
// ============================================================================

// ERC20 ABI for approval
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useLockFunds() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === CONTRACT_CHAIN_ID;

  const { writeContractAsync } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const isPending = isProcessing;

  // Log transaction lifecycle
  useEffect(() => {
    if (hash && isPending) {
      logTransaction("lockFunds", "pending", {
        transactionHash: hash,
        payer: address,
      });
    }
  }, [hash, isPending, address]);

  useEffect(() => {
    if (hash && isConfirming) {
      logTransaction("lockFunds", "confirmed", {
        transactionHash: hash,
        payer: address,
      });
    }
  }, [hash, isConfirming, address]);

  useEffect(() => {
    if (isSuccess && hash) {
      logSuccess("lockFunds:complete", {
        transactionHash: hash,
        payer: address,
      });
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [isSuccess, hash, address]);

  useEffect(() => {
    if (error) {
      logError("lockFunds", error, {
        payer: address,
        transactionHash: hash,
      });
    }
  }, [error, address, hash]);

  const lockFunds = useCallback(
    async (intentId: bigint, payerAddress?: `0x${string}`, intentData?: IntentData) => {
      const effectivePayer = payerAddress || address;

      logTransaction("lockFunds", "initiated", {
        intentId: formatBigInt(intentId),
        payer: effectivePayer,
        contractAddress: INTENT_ESCROW_ADDRESS,
        chainId,
      });

      if (!isCorrectChain) {
        const error = new Error("Please switch to Base to lock funds");
        logError("lockFunds", error, { currentChainId: chainId, requiredChainId: CONTRACT_CHAIN_ID });
        setError(error);
        throw error;
      }

      if (!address) {
        const error = new Error("Wallet not connected");
        logError("lockFunds", error, {});
        setError(error);
        throw error;
      }

      if (!intentData) {
        const error = new Error("Intent data required for approval check");
        logError("lockFunds", error, {});
        setError(error);
        throw error;
      }

      try {
        setIsProcessing(true);
        setError(null);
        
        // Step 1: Check current allowance
        setProcessingStep("Checking token allowance...");
        logInfo("lockFunds:checkAllowance", {
          token: intentData.token,
          spender: INTENT_ESCROW_ADDRESS,
          owner: address,
          requiredAmount: formatBigInt(intentData.amount),
        });

        // Use viem's readContract directly
        const { createPublicClient, http } = await import("viem");
        const { base } = await import("viem/chains");
        const { waitForTransactionReceipt: waitForTx } = await import("viem/actions");
        
        const client = createPublicClient({
          chain: base,
          transport: http(),
        }) as any; // Type assertion to work around viem type compatibility

        const currentAllowance = await client.readContract({
          address: intentData.token,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, INTENT_ESCROW_ADDRESS],
        });

        logInfo("lockFunds:allowanceChecked", {
          currentAllowance: formatBigInt(currentAllowance),
          requiredAllowance: formatBigInt(intentData.amount),
          needsApproval: currentAllowance < intentData.amount,
        });

        // Step 2: Approve if needed
        if (currentAllowance < intentData.amount) {
          setProcessingStep("Approving token spend...");
          logInfo("lockFunds:approvingToken", {
            token: intentData.token,
            spender: INTENT_ESCROW_ADDRESS,
            amount: formatBigInt(intentData.amount),
          });

          const approvalHash = await writeContractAsync({
            address: intentData.token,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [INTENT_ESCROW_ADDRESS, intentData.amount],
          });

          logSuccess("lockFunds:approvalTxSent", {
            token: intentData.token,
            amount: formatBigInt(intentData.amount),
            transactionHash: approvalHash,
          });

          // Wait for approval confirmation
          setProcessingStep("Waiting for approval confirmation...");
          await waitForTx(client, { hash: approvalHash });

          logSuccess("lockFunds:approvalConfirmed", {
            token: intentData.token,
            transactionHash: approvalHash,
          });
        } else {
          logInfo("lockFunds:approvalSkipped", {
            reason: "Sufficient allowance already exists",
            currentAllowance: formatBigInt(currentAllowance),
          });
        }

        // Step 3: Lock funds
        setProcessingStep("Locking funds...");
        logInfo("lockFunds:callingLockFunds", {
          intentId: formatBigInt(intentId),
        });

        const lockHash = await writeContractAsync({
          address: INTENT_ESCROW_ADDRESS,
          abi: INTENT_ESCROW_ABI,
          functionName: "lockFunds",
          args: [intentId],
        });

        setHash(lockHash);
        setProcessingStep("Waiting for confirmation...");
        
        return lockHash;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const errorMessage = error.message;
        
        // Check for specific error types and provide helpful messages
        if (errorMessage.includes("transfer amount exceeds balance") || errorMessage.includes("insufficient")) {
          const enhancedError = new Error(
            `Insufficient token balance. Please ensure you have ${formatBigInt(intentData.amount)} tokens (${intentData.token.slice(0, 6)}...${intentData.token.slice(-4)}) in your wallet on Base chain.`
          );
          setError(enhancedError);
          setIsProcessing(false);
          setProcessingStep("");
          logError("lockFunds:insufficientBalance", enhancedError, {
            intentId: formatBigInt(intentId),
            requiredAmount: formatBigInt(intentData.amount),
            token: intentData.token,
          });
          throw enhancedError;
        }
        
        setIsProcessing(false);
        setProcessingStep("");
        setError(error);
        logError("lockFunds:failed", error, {
          intentId: formatBigInt(intentId),
        });
        throw error;
      }
    },
    [writeContractAsync, isCorrectChain, address, chainId]
  );

  return {
    lockFunds,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    canLock: isCorrectChain && !!address,
    processingStep,
  };
}

// ============================================================================
// HOOK: useFulfillIntent - Release funds to receiver
// Maps to: fulfillIntent(uint256 intentId)
// ============================================================================

export function useFulfillIntent() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === CONTRACT_CHAIN_ID;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Log transaction lifecycle
  useEffect(() => {
    if (hash && isPending) {
      logTransaction("fulfillIntent", "pending", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [hash, isPending, address]);

  useEffect(() => {
    if (hash && isConfirming) {
      logTransaction("fulfillIntent", "confirmed", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [hash, isConfirming, address]);

  useEffect(() => {
    if (isSuccess && hash) {
      logSuccess("fulfillIntent:complete", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [isSuccess, hash, address]);

  useEffect(() => {
    if (error) {
      logError("fulfillIntent", error, {
        caller: address,
        transactionHash: hash,
      });
    }
  }, [error, address, hash]);

  const fulfillIntent = useCallback(
    async (intentId: bigint) => {
      logTransaction("fulfillIntent", "initiated", {
        intentId: formatBigInt(intentId),
        caller: address,
        contractAddress: INTENT_ESCROW_ADDRESS,
        chainId,
      });

      if (!isCorrectChain) {
        const error = new Error("Please switch to Base to fulfill intents");
        logError("fulfillIntent", error, { currentChainId: chainId, requiredChainId: CONTRACT_CHAIN_ID });
        throw error;
      }

      if (!address) {
        const error = new Error("Wallet not connected");
        logError("fulfillIntent", error, {});
        throw error;
      }

      writeContract({
        address: INTENT_ESCROW_ADDRESS,
        abi: INTENT_ESCROW_ABI,
        functionName: "fulfillIntent",
        args: [intentId],
      });
    },
    [writeContract, isCorrectChain, address, chainId]
  );

  return {
    fulfillIntent,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    canFulfill: isCorrectChain && !!address,
  };
}

// ============================================================================
// HOOK: useReclaimFunds - Reclaim funds after failure (payer only)
// Maps to: reclaimFunds(uint256 intentId)
// ============================================================================

export function useReclaimFunds() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === CONTRACT_CHAIN_ID;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Log transaction lifecycle
  useEffect(() => {
    if (hash && isPending) {
      logTransaction("reclaimFunds", "pending", {
        transactionHash: hash,
        payer: address,
      });
    }
  }, [hash, isPending, address]);

  useEffect(() => {
    if (hash && isConfirming) {
      logTransaction("reclaimFunds", "confirmed", {
        transactionHash: hash,
        payer: address,
      });
    }
  }, [hash, isConfirming, address]);

  useEffect(() => {
    if (isSuccess && hash) {
      logSuccess("reclaimFunds:complete", {
        transactionHash: hash,
        payer: address,
      });
    }
  }, [isSuccess, hash, address]);

  useEffect(() => {
    if (error) {
      logError("reclaimFunds", error, {
        payer: address,
        transactionHash: hash,
      });
    }
  }, [error, address, hash]);

  const reclaimFunds = useCallback(
    async (intentId: bigint) => {
      logTransaction("reclaimFunds", "initiated", {
        intentId: formatBigInt(intentId),
        payer: address,
        contractAddress: INTENT_ESCROW_ADDRESS,
        chainId,
      });

      if (!isCorrectChain) {
        const error = new Error("Please switch to Base to reclaim funds");
        logError("reclaimFunds", error, { currentChainId: chainId, requiredChainId: CONTRACT_CHAIN_ID });
        throw error;
      }

      if (!address) {
        const error = new Error("Wallet not connected");
        logError("reclaimFunds", error, {});
        throw error;
      }

      writeContract({
        address: INTENT_ESCROW_ADDRESS,
        abi: INTENT_ESCROW_ABI,
        functionName: "reclaimFunds",
        args: [intentId],
      });
    },
    [writeContract, isCorrectChain, address, chainId]
  );

  return {
    reclaimFunds,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    canReclaim: isCorrectChain && !!address,
  };
}

// ============================================================================
// HOOK: useMarkFailed - Mark an intent as failed (allows reclaim)
// Maps to: markFailed(uint256 intentId)
// ============================================================================

export function useMarkFailed() {
  const { address } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === CONTRACT_CHAIN_ID;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Log transaction lifecycle
  useEffect(() => {
    if (hash && isPending) {
      logTransaction("markFailed", "pending", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [hash, isPending, address]);

  useEffect(() => {
    if (hash && isConfirming) {
      logTransaction("markFailed", "confirmed", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [hash, isConfirming, address]);

  useEffect(() => {
    if (isSuccess && hash) {
      logSuccess("markFailed:complete", {
        transactionHash: hash,
        caller: address,
      });
    }
  }, [isSuccess, hash, address]);

  useEffect(() => {
    if (error) {
      logError("markFailed", error, {
        caller: address,
        transactionHash: hash,
      });
    }
  }, [error, address, hash]);

  const markFailed = useCallback(
    async (intentId: bigint) => {
      logTransaction("markFailed", "initiated", {
        intentId: formatBigInt(intentId),
        caller: address,
        contractAddress: INTENT_ESCROW_ADDRESS,
        chainId,
      });

      if (!isCorrectChain) {
        const error = new Error("Please switch to Base to mark intent as failed");
        logError("markFailed", error, { currentChainId: chainId, requiredChainId: CONTRACT_CHAIN_ID });
        throw error;
      }

      if (!address) {
        const error = new Error("Wallet not connected");
        logError("markFailed", error, {});
        throw error;
      }

      writeContract({
        address: INTENT_ESCROW_ADDRESS,
        abi: INTENT_ESCROW_ABI,
        functionName: "markFailed",
        args: [intentId],
      });
    },
    [writeContract, isCorrectChain, address, chainId]
  );

  return {
    markFailed,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    canMark: isCorrectChain && !!address,
  };
}

// ============================================================================
// HOOK: useNextIntentId - Get the next intent ID counter
// Maps to: nextIntentId() view function
// ============================================================================

export function useNextIntentId() {
  const chainId = useChainId();
  const isCorrectChain = chainId === CONTRACT_CHAIN_ID;

  const { data, isLoading, error, refetch } = useReadContract({
    address: INTENT_ESCROW_ADDRESS,
    abi: INTENT_ESCROW_ABI,
    functionName: "nextIntentId",
    query: {
      enabled: isCorrectChain,
    },
  });

  useEffect(() => {
    if (data !== undefined) {
      logInfo("useNextIntentId:read", {
        nextIntentId: formatBigInt(data),
        totalIntentsCreated: data > 0n ? formatBigInt(data - 1n) : "0",
      });
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      logError("useNextIntentId:read", error, {
        contractAddress: INTENT_ESCROW_ADDRESS,
      });
    }
  }, [error]);

  return {
    nextIntentId: data,
    isLoading,
    error,
    refetch,
  };
}
