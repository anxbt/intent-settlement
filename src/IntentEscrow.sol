// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title IntentEscrow
/// @notice Intent-based cross-chain payment protocol
/// @dev Holds funds and enforces fulfillment constraints. Does not perform swaps or bridges.

enum IntentState {
    CREATED,
    LOCKED,
    FULFILLED,
    FAILED,
    REFUNDED
}

struct Intent {
    address payer;
    address receiver;
    address token;
    uint256 amount;
    uint256 expiry;
    IntentState state;
}

contract IntentEscrow is ReentrancyGuard {
    using SafeERC20 for ERC20;

    // ============================================================================
    // STORAGE
    // ============================================================================

    uint256 public nextIntentId = 1;
    mapping(uint256 => Intent) public intents;

    // ============================================================================
    // EVENTS
    // ============================================================================

    event IntentCreated(
        uint256 indexed intentId,
        address indexed receiver,
        address indexed token,
        uint256 amount,
        uint256 expiry
    );

    event FundsLocked(
        uint256 indexed intentId,
        address indexed payer,
        address indexed token,
        uint256 amount
    );

    event IntentFulfilled(uint256 indexed intentId, address indexed receiver);

    event IntentFailed(uint256 indexed intentId);

    event FundsReclaimed(uint256 indexed intentId, address indexed payer);

    // ============================================================================
    // FUNCTIONS: CORE FLOW
    // ============================================================================

    /// @notice Create an intent specifying desired outcome
    /// @dev Called by receiver to declare the terms
    /// @param receiver Address that will receive funds if fulfilled
    /// @param token ERC20 token address
    /// @param amount Token amount required
    /// @param expiry Block timestamp deadline
    /// @return intentId Unique identifier for this intent
    function createIntent(
        address receiver,
        address token,
        uint256 amount,
        uint256 expiry
    ) external returns (uint256 intentId) {
        require(receiver != address(0), "IntentEscrow: invalid receiver");
        require(token != address(0), "IntentEscrow: invalid token");
        require(amount > 0, "IntentEscrow: invalid amount");
        require(expiry > block.timestamp, "IntentEscrow: expiry in past");

        intentId = nextIntentId;
        nextIntentId += 1;

        intents[intentId] = Intent({
            payer: address(0),
            receiver: receiver,
            token: token,
            amount: amount,
            expiry: expiry,
            state: IntentState.CREATED
        });

        emit IntentCreated(intentId, receiver, token, amount, expiry);
    }

    /// @notice Lock funds into escrow
    /// @dev Called by payer to commit funds. Only once per intent.
    /// @param intentId Intent identifier
    function lockFunds(uint256 intentId) external nonReentrant {
        Intent storage intent = intents[intentId];

        require(intent.receiver != address(0), "IntentEscrow: intent does not exist");
        require(intent.state == IntentState.CREATED, "IntentEscrow: intent not in CREATED state");

        intent.payer = msg.sender;
        intent.state = IntentState.LOCKED;

        // Transfer tokens from payer into this contract
        ERC20(intent.token).safeTransferFrom(msg.sender, address(this), intent.amount);

        emit FundsLocked(intentId, msg.sender, intent.token, intent.amount);
    }

    /// @notice Fulfill intent and release funds to receiver
    /// @dev Called after external execution succeeds (e.g., LI.FI routing)
    /// @param intentId Intent identifier
    function fulfillIntent(uint256 intentId) external nonReentrant {
        Intent storage intent = intents[intentId];

        require(intent.receiver != address(0), "IntentEscrow: intent does not exist");
        require(intent.state == IntentState.LOCKED, "IntentEscrow: intent not in LOCKED state");
        require(block.timestamp <= intent.expiry, "IntentEscrow: intent has expired");

        // Verify escrow holds sufficient balance
        uint256 balance = ERC20(intent.token).balanceOf(address(this));
        require(balance >= intent.amount, "IntentEscrow: insufficient escrow balance");

        intent.state = IntentState.FULFILLED;

        // Release funds to receiver
        ERC20(intent.token).safeTransfer(intent.receiver, intent.amount);

        emit IntentFulfilled(intentId, intent.receiver);
    }

    /// @notice Mark intent as failed after expiry
    /// @dev Separates failure detection from refund logic
    /// @param intentId Intent identifier
    function markFailed(uint256 intentId) external {
        Intent storage intent = intents[intentId];

        require(intent.receiver != address(0), "IntentEscrow: intent does not exist");
        require(intent.state == IntentState.LOCKED, "IntentEscrow: intent not in LOCKED state");
        require(block.timestamp > intent.expiry, "IntentEscrow: intent has not expired");

        intent.state = IntentState.FAILED;

        emit IntentFailed(intentId);
    }

    /// @notice Reclaim funds after failure
    /// @dev Only payer can reclaim, only after intent marked FAILED
    /// @param intentId Intent identifier
    function reclaimFunds(uint256 intentId) external nonReentrant {
        Intent storage intent = intents[intentId];

        require(intent.receiver != address(0), "IntentEscrow: intent does not exist");
        require(intent.state == IntentState.FAILED, "IntentEscrow: intent not in FAILED state");
        require(msg.sender == intent.payer, "IntentEscrow: only payer can reclaim");

        intent.state = IntentState.REFUNDED;

        // Return funds to payer
        ERC20(intent.token).safeTransfer(intent.payer, intent.amount);

        emit FundsReclaimed(intentId, intent.payer);
    }
}
