/**
 * IntentEscrow Contract Configuration
 * 
 * This file contains the ABI and address for the deployed IntentEscrow contract.
 * Contract is deployed on Base Mainnet.
 */

// Contract address on Base Mainnet
// Update this after deployment
export const INTENT_ESCROW_ADDRESS = import.meta.env.VITE_INTENT_ESCROW_ADDRESS as `0x${string}` || "0x0000000000000000000000000000000000000000" as `0x${string}`;

// Base Mainnet Chain ID
export const CONTRACT_CHAIN_ID = 8453;

// Intent states matching the Solidity enum
export enum IntentState {
  CREATED = 0,
  LOCKED = 1,
  FULFILLED = 2,
  FAILED = 3,
  REFUNDED = 4,
}

export const INTENT_STATE_LABELS: Record<IntentState, string> = {
  [IntentState.CREATED]: "CREATED",
  [IntentState.LOCKED]: "LOCKED",
  [IntentState.FULFILLED]: "FULFILLED",
  [IntentState.FAILED]: "FAILED",
  [IntentState.REFUNDED]: "REFUNDED",
};

// Contract ABI - only the functions we need
export const INTENT_ESCROW_ABI = [
  // Read functions
  {
    inputs: [{ name: "intentId", type: "uint256" }],
    name: "intents",
    outputs: [
      { name: "payer", type: "address" },
      { name: "receiver", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "state", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextIntentId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [
      { name: "receiver", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
    name: "createIntent",
    outputs: [{ name: "intentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "intentId", type: "uint256" }],
    name: "lockFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "intentId", type: "uint256" }],
    name: "fulfillIntent",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "intentId", type: "uint256" }],
    name: "markFailed",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "intentId", type: "uint256" }],
    name: "reclaimFunds",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "intentId", type: "uint256" },
      { indexed: true, name: "receiver", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "expiry", type: "uint256" },
    ],
    name: "IntentCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "intentId", type: "uint256" },
      { indexed: true, name: "payer", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "FundsLocked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "intentId", type: "uint256" },
      { indexed: true, name: "receiver", type: "address" },
    ],
    name: "IntentFulfilled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "intentId", type: "uint256" }],
    name: "IntentFailed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "intentId", type: "uint256" },
      { indexed: true, name: "payer", type: "address" },
    ],
    name: "FundsReclaimed",
    type: "event",
  },
] as const;

// ERC20 ABI for token approval
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
