# Intent-Based Payment Settlement

A production-grade payment settlement system where users define the **exact outcome** they want upfront, funds are locked in escrow, and settlement only happens through explicit fulfillment — otherwise funds are safely reclaimable.

This project focuses on **correctness, failure safety, and explicit state transitions**, rather than UI polish or automation hype.

[![View on BaseScan](https://img.shields.io/badge/BaseScan-View%20Contract-0052FF?style=flat&logo=base&logoColor=white)](https://basescan.org/address/0x4Bf1d41e3ebCA8497d120560B081b52448d888c8#code) [![Demo on YouTube](https://img.shields.io/badge/YouTube-Demo%20Video-FF0000?style=flat&logo=youtube&logoColor=white)](https://youtu.be/dXE-1h0Tf1I)

---

## Index

1. [Overview](#1-overview)  
2. [Core Idea](#2-core-idea)  
3. [Why This Matters](#3-why-this-matters)  
4. [System Architecture](#4-system-architecture)  
5. [Intent Lifecycle](#5-intent-lifecycle)  
6. [State Machine](#6-state-machine)  
7. [Smart Contract Design](#7-smart-contract-design)  
8. [Frontend Design](#8-frontend-design)  
9. [Cross-Chain Funding (LI.FI)](#9-cross-chain-funding-lifi)  
10. [Demo Flow](#10-demo-flow-same-chain-deterministic)  
11. [What This Is (and Is Not)](#11-what-this-is-and-is-not)  
12. [Tech Stack](#12-tech-stack)  
13. [Security & Guarantees](#13-security--guarantees)  
14. [Future Improvements](#14-future-improvements)  

---

## 1. Overview

Traditional payment flows (especially cross-chain) require users to manually manage swaps, bridges, retries, and edge cases. This creates partial failures, user error, and unpredictable outcomes.

This system flips the model:

- The **receiver defines the desired outcome**
- The **payer locks funds into escrow**
- Funds only move when the intent is explicitly fulfilled
- If anything goes wrong, funds are safely reclaimable

No partial settlement. No silent failure.

---

## 2. Core Idea

**Separate execution from correctness.**

- Execution (swaps, bridges, routing) can be messy and probabilistic
- Correctness (who gets paid, how much, and when) must be deterministic

This project enforces correctness **on-chain**, while allowing execution to happen externally.

---

## 3. Why This Matters

In real financial systems:
- Incorrect settlement is worse than no settlement
- Failure must be safe
- State transitions must be explicit

This system models payments as **stateful intents**, not one-off transactions.

---

## 4. System Architecture

High-level components:

- **IntentEscrow Contract (Base)**  
  Enforces intent state machine and holds funds
- **Frontend (React)**  
  Creates intents, locks funds, fulfills or reclaims
- **Routing Layer (LI.FI)**  
  Optional cross-chain funding abstraction

### Architecture (simplified)

```mermaid
flowchart LR
  Receiver -->|createIntent| Frontend
  Frontend -->|createIntent| IntentEscrow

  Payer -->|lockFunds| Frontend
  Frontend -->|lockFunds| IntentEscrow

  Receiver -->|fulfillIntent| Frontend
  Frontend -->|fulfillIntent| IntentEscrow

  IntentEscrow -->|release funds| Receiver
  IntentEscrow -->|refund| Payer
```

---

## 5. Intent lifecycle

An intent progresses through explicit states:
	1.	CREATED – Intent exists, no funds locked
	2.	LOCKED – Funds are secured in escrow
	3.	FULFILLED – Receiver explicitly releases funds
	4.	FAILED – Intent expired without fulfillment
	5.	REFUNDED – Payer reclaims funds after failure

Each transition is enforced by the smart contract.

⸻

## 6. State Machine

```mermaid
stateDiagram-v2
    CREATED --> LOCKED: lockFunds
    LOCKED --> FULFILLED: fulfillIntent
    LOCKED --> FAILED: expiry reached
    FAILED --> REFUNDED: reclaimFunds
```

There are no implicit transitions and no automatic execution.

⸻

## 7. Smart Contract Design

IntentEscrow.sol (Base):

Responsibilities:
	•	Store intent parameters (amount, token, receiver, expiry)
	•	Hold funds in escrow
	•	Enforce valid state transitions
	•	Prevent fulfillment after expiry
	•	Allow safe refunds on failure

Key properties:
	•	Single source of truth
	•	No off-chain trust assumptions
	•	Explicit authorization checks

⸻

## 8. Frontend Design

The frontend is intentionally simple and state-driven.

Key principles:
	•	UI derives entirely from on-chain state
	•	No optimistic assumptions
	•	Buttons only appear when actions are valid
	•	Expired intents cannot be paid or fulfilled

Wallet connectivity:
	•	wagmi
	•	RainbowKit

Styling:
	•	React + TailwindCSS

⸻

## 9. Cross-Chain Funding (LI.FI)

LI.FI is integrated as a cross-chain funding abstraction, not as a settlement engine.

What LI.FI does:
	•	Allows payers to fund intents from other chains
	•	Abstracts swaps + bridges into a single route

What LI.FI does not do:
	•	It does not release escrow funds
	•	It does not enforce settlement correctness

Correctness always lives on-chain.

Relevant integration points:
	•	frontend/src/lib/lifi.ts
	•	frontend/src/pages/PayIntent.tsx

⸻

## 10. Demo Flow (Same-Chain, Deterministic)

[![Watch the demo](https://img.youtube.com/vi/dXE-1h0Tf1I/maxresdefault.jpg)](https://youtu.be/dXE-1h0Tf1I)

Primary demo path:
	1.	Receiver creates intent on Base
	2.	Payer locks USDC into escrow
	3.	Intent enters LOCKED state
	4.	Receiver explicitly fulfills intent
	5.	Funds transfer from escrow to receiver
	6.	Intent resolves to FULFILLED

Blocked by design:
	•	Paying expired intents
	•	Fulfilling expired intents
	•	Implicit or automatic settlement

⸻

## 11. What This Is (and Is Not)

This is:
	•	An intent-based settlement primitive
	•	A correctness-first payment system
	•	A production-minded escrow design

This is not:
	•	A solver network
	•	An automated cross-chain executor
	•	A UI-heavy consumer app

⸻

## 12. Tech Stack
	•	Solidity (IntentEscrow)
	•	Base (deployment chain)
	•	React + Tailwind
	•	wagmi + RainbowKit
	•	LI.FI SDK (funding abstraction)
	•	Netlify (deployment)

⸻

## 13. Security & Guarantees

Guarantees provided:
	•	Funds cannot move without explicit fulfillment
	•	Funds cannot be fulfilled after expiry
	•	Funds are always reclaimable on failure
	•	UI cannot override contract logic

Failure is treated as a first-class outcome, not an edge case.

⸻

## 14. Future Improvements

Possible extensions:
	•	Automated fulfillment verification
	•	Solver-driven fulfillment flows
	•	Multi-receiver intents
	•	Partial settlement support
	•	Permissionless fulfillment bots

These are intentionally out of scope for the current demo to preserve correctness.

⸻

Summary

This project demonstrates a simple idea executed rigorously:

Define outcomes first.
Lock funds second.
Move value only when conditions are explicitly met.

Everything else is secondary.