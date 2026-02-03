// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IntentEscrow, IntentState} from "../src/IntentEscrow.sol";

// Mock ERC20 for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract IntentEscrowTest is Test {
    IntentEscrow escrow;
    MockToken token;

    address receiver = address(0x1111);
    address payer = address(0x2222);
    address attacker = address(0x3333);
    uint256 amount = 100e18;

    function setUp() public {
        escrow = new IntentEscrow();
        token = new MockToken();

        // Fund accounts
        token.mint(payer, 1000e18);
        token.mint(attacker, 1000e18);

        // Approve escrow to spend tokens
        vm.prank(payer);
        token.approve(address(escrow), type(uint256).max);

        vm.prank(attacker);
        token.approve(address(escrow), type(uint256).max);
    }

    // ============================================================================
    // TEST: CREATE INTENT
    // ============================================================================

    function test_createIntent_success() public {
        uint256 expiry = block.timestamp + 1 days;

        vm.expectEmit(true, true, true, true);
        emit IntentCreated(1, receiver, address(token), amount, expiry);

        uint256 intentId = escrow.createIntent(receiver, address(token), amount, expiry);

        assertEq(intentId, 1);
        assertEq(escrow.nextIntentId(), 2);

        (address p, address r, address t, uint256 amt, uint256 exp, IntentState state) = escrow
            .intents(intentId);
        assertEq(p, address(0)); // payer not yet set
        assertEq(r, receiver);
        assertEq(t, address(token));
        assertEq(amt, amount);
        assertEq(exp, expiry);
        assertEq(uint8(state), uint8(IntentState.CREATED));
    }

    function test_createIntent_invalidReceiver() public {
        uint256 expiry = block.timestamp + 1 days;
        vm.expectRevert("IntentEscrow: invalid receiver");
        escrow.createIntent(address(0), address(token), amount, expiry);
    }

    function test_createIntent_invalidToken() public {
        uint256 expiry = block.timestamp + 1 days;
        vm.expectRevert("IntentEscrow: invalid token");
        escrow.createIntent(receiver, address(0), amount, expiry);
    }

    function test_createIntent_zeroAmount() public {
        uint256 expiry = block.timestamp + 1 days;
        vm.expectRevert("IntentEscrow: invalid amount");
        escrow.createIntent(receiver, address(token), 0, expiry);
    }

    function test_createIntent_expiryInPast() public {
        uint256 expiry = block.timestamp - 1;
        vm.expectRevert("IntentEscrow: expiry in past");
        escrow.createIntent(receiver, address(token), amount, expiry);
    }

    // ============================================================================
    // TEST: LOCK FUNDS
    // ============================================================================

    function test_lockFunds_success() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        vm.expectEmit(true, true, true, true);
        emit FundsLocked(intentId, payer, address(token), amount);
        escrow.lockFunds(intentId);

        (address p, address r, address t, uint256 amt, uint256 exp, IntentState state) = escrow
            .intents(intentId);
        assertEq(p, payer);
        assertEq(uint8(state), uint8(IntentState.LOCKED));
        assertEq(token.balanceOf(address(escrow)), amount);
        assertEq(token.balanceOf(payer), 1000e18 - amount);
    }

    function test_lockFunds_intentDoesNotExist() public {
        vm.prank(payer);
        vm.expectRevert("IntentEscrow: intent does not exist");
        escrow.lockFunds(999);
    }

    function test_lockFunds_notInCreatedState() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        escrow.lockFunds(intentId);

        // Try to lock again
        vm.prank(payer);
        vm.expectRevert("IntentEscrow: intent not in CREATED state");
        escrow.lockFunds(intentId);
    }

    function test_lockFunds_insufficientBalance() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            1000e18 + 1,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        vm.expectRevert(); // SafeTransferFrom will fail
        escrow.lockFunds(intentId);
    }

    // ============================================================================
    // TEST: FULFILL INTENT (HAPPY PATH)
    // ============================================================================

    function test_fulfillIntent_success() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        escrow.lockFunds(intentId);

        vm.expectEmit(true, true, false, false);
        emit IntentFulfilled(intentId, receiver);
        escrow.fulfillIntent(intentId);

        (, address r, address t, uint256 amt, uint256 exp, IntentState state) = escrow
            .intents(intentId);
        assertEq(uint8(state), uint8(IntentState.FULFILLED));
        assertEq(token.balanceOf(receiver), amount);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_fulfillIntent_notInLockedState() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.expectRevert("IntentEscrow: intent not in LOCKED state");
        escrow.fulfillIntent(intentId);
    }

    function test_fulfillIntent_expiredIntent() public {
        uint256 expiry = block.timestamp + 1 days;
        uint256 intentId = escrow.createIntent(receiver, address(token), amount, expiry);

        vm.prank(payer);
        escrow.lockFunds(intentId);

        // Warp past expiry
        vm.warp(expiry + 1);

        vm.expectRevert("IntentEscrow: intent has expired");
        escrow.fulfillIntent(intentId);
    }

    function test_fulfillIntent_insufficientEscrowBalance() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        escrow.lockFunds(intentId);

        // Manually drain escrow (simulate error)
        vm.prank(address(escrow));
        token.transfer(attacker, amount);

        vm.expectRevert("IntentEscrow: insufficient escrow balance");
        escrow.fulfillIntent(intentId);
    }

    // ============================================================================
    // TEST: MARK FAILED
    // ============================================================================

    function test_markFailed_success() public {
        uint256 expiry = block.timestamp + 1 days;
        uint256 intentId = escrow.createIntent(receiver, address(token), amount, expiry);

        vm.prank(payer);
        escrow.lockFunds(intentId);

        // Move past expiry
        vm.warp(expiry + 1);

        vm.expectEmit(true, false, false, false);
        emit IntentFailed(intentId);
        escrow.markFailed(intentId);

        (, address r, address t, uint256 amt, uint256 exp, IntentState state) = escrow
            .intents(intentId);
        assertEq(uint8(state), uint8(IntentState.FAILED));
    }

    function test_markFailed_notInLockedState() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.expectRevert("IntentEscrow: intent not in LOCKED state");
        escrow.markFailed(intentId);
    }

    function test_markFailed_notExpired() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        escrow.lockFunds(intentId);

        vm.expectRevert("IntentEscrow: intent has not expired");
        escrow.markFailed(intentId);
    }

    function test_markFailed_intentDoesNotExist() public {
        vm.expectRevert("IntentEscrow: intent does not exist");
        escrow.markFailed(999);
    }

    // ============================================================================
    // TEST: RECLAIM FUNDS
    // ============================================================================

    function test_reclaimFunds_success() public {
        uint256 expiry = block.timestamp + 1 days;
        uint256 intentId = escrow.createIntent(receiver, address(token), amount, expiry);

        vm.prank(payer);
        escrow.lockFunds(intentId);

        vm.warp(expiry + 1);
        escrow.markFailed(intentId);

        uint256 payerBalanceBefore = token.balanceOf(payer);
        vm.prank(payer);
        vm.expectEmit(true, true, false, false);
        emit FundsReclaimed(intentId, payer);
        escrow.reclaimFunds(intentId);

        assertEq(token.balanceOf(payer), payerBalanceBefore + amount);
        assertEq(token.balanceOf(address(escrow)), 0);

        (, address r, address t, uint256 amt, uint256 exp, IntentState state) = escrow
            .intents(intentId);
        assertEq(uint8(state), uint8(IntentState.REFUNDED));
    }

    function test_reclaimFunds_notFailedState() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        escrow.lockFunds(intentId);

        vm.prank(payer);
        vm.expectRevert("IntentEscrow: intent not in FAILED state");
        escrow.reclaimFunds(intentId);
    }

    function test_reclaimFunds_onlyPayerCanReclaim() public {
        uint256 expiry = block.timestamp + 1 days;
        uint256 intentId = escrow.createIntent(receiver, address(token), amount, expiry);

        vm.prank(payer);
        escrow.lockFunds(intentId);

        vm.warp(expiry + 1);
        escrow.markFailed(intentId);

        vm.prank(attacker);
        vm.expectRevert("IntentEscrow: only payer can reclaim");
        escrow.reclaimFunds(intentId);
    }

    function test_reclaimFunds_doubleReclaim() public {
        uint256 expiry = block.timestamp + 1 days;
        uint256 intentId = escrow.createIntent(receiver, address(token), amount, expiry);

        vm.prank(payer);
        escrow.lockFunds(intentId);

        vm.warp(expiry + 1);
        escrow.markFailed(intentId);

        vm.prank(payer);
        escrow.reclaimFunds(intentId);

        // Try to reclaim again
        vm.prank(payer);
        vm.expectRevert("IntentEscrow: intent not in FAILED state");
        escrow.reclaimFunds(intentId);
    }

    // ============================================================================
    // TEST: INTEGRATION SCENARIOS
    // ============================================================================

    function test_flowFulfilled_createLockFulfill() public {
        uint256 intentId = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );

        vm.prank(payer);
        escrow.lockFunds(intentId);

        escrow.fulfillIntent(intentId);

        (, address r, address t, uint256 amt, uint256 exp, IntentState state) = escrow
            .intents(intentId);
        assertEq(uint8(state), uint8(IntentState.FULFILLED));
        assertEq(token.balanceOf(receiver), amount);
    }

    function test_flowRefunded_createLockFailMarkReclaim() public {
        uint256 expiry = block.timestamp + 1 days;
        uint256 intentId = escrow.createIntent(receiver, address(token), amount, expiry);

        vm.prank(payer);
        escrow.lockFunds(intentId);

        vm.warp(expiry + 1);
        escrow.markFailed(intentId);

        vm.prank(payer);
        escrow.reclaimFunds(intentId);

        (, address r, address t, uint256 amt, uint256 exp, IntentState state) = escrow
            .intents(intentId);
        assertEq(uint8(state), uint8(IntentState.REFUNDED));
        assertEq(token.balanceOf(payer), 1000e18);
    }

    function test_multipleIntents() public {
        uint256 intent1 = escrow.createIntent(
            receiver,
            address(token),
            amount,
            block.timestamp + 1 days
        );
        uint256 intent2 = escrow.createIntent(
            receiver,
            address(token),
            amount * 2,
            block.timestamp + 2 days
        );

        assertEq(intent1, 1);
        assertEq(intent2, 2);
        assertEq(escrow.nextIntentId(), 3);

        vm.prank(payer);
        token.approve(address(escrow), type(uint256).max);

        vm.prank(payer);
        escrow.lockFunds(intent1);

        vm.prank(payer);
        escrow.lockFunds(intent2);

        escrow.fulfillIntent(intent1);
        escrow.fulfillIntent(intent2);

        assertEq(token.balanceOf(receiver), amount + amount * 2);
    }

    // ============================================================================
    // EVENTS (for reference)
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
}
