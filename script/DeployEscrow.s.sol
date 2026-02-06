// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console2} from "forge-std/Script.sol";
import {IntentEscrow} from "../src/IntentEscrow.sol";

/**
 * @title DeployEscrow
 * @notice Deployment script for IntentEscrow contract
 * @dev Run with: forge script script/DeployEscrow.s.sol:DeployEscrow --rpc-url base --broadcast --verify
 */
contract DeployEscrow is Script {
    function run() external returns (IntentEscrow escrow) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("============================================");
        console2.log("   IntentEscrow Deployment - Base Mainnet");
        console2.log("============================================");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        escrow = new IntentEscrow();

        vm.stopBroadcast();

        console2.log("============================================");
        console2.log("   DEPLOYMENT SUCCESSFUL");
        console2.log("============================================");
        console2.log("IntentEscrow deployed at:", address(escrow));
        console2.log("");
        console2.log("Next steps:");
        console2.log("1. Verify on BaseScan:");
        console2.log("   forge verify-contract", address(escrow), "IntentEscrow --chain base");
        console2.log("");
        console2.log("2. Update frontend .env:");
        console2.log("   VITE_INTENT_ESCROW_ADDRESS=", address(escrow));
        console2.log("============================================");

        return escrow;
    }
}
