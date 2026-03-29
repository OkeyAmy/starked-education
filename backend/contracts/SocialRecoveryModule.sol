// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SocialRecoveryModule
 * @notice Implements social recovery mechanism for smart wallets
 */
contract SocialRecoveryModule {
    using ECDSA for bytes32;

    struct RecoveryConfig {
        address[] guardians;
        uint256 threshold;
        uint256 recoveryPeriod; // Time delay before recovery can be executed
    }

    struct RecoveryRequest {
        address wallet;
        address newOwner;
        uint256 approvalCount;
        uint256 threshold;
        uint256 initiatedAt;
        bool executed;
        bool cancelled;
        mapping(address => bool) approvals;
    }

    // wallet => RecoveryConfig
    mapping(address => RecoveryConfig) public recoveryConfigs;
    
    // recoveryId => RecoveryRequest
    mapping(bytes32 => RecoveryRequest) public recoveryRequests;
    
    // wallet => guardian => isGuardian
    mapping(address => mapping(address => bool)) public isGuardian;

    event RecoveryConfigured(
        address indexed wallet,
        address[] guardians,
        uint256 threshold,
        uint256 recoveryPeriod
    );
    event RecoveryInitiated(
        bytes32 indexed recoveryId,
        address indexed wallet,
        address indexed newOwner,
        address initiator
    );
    event RecoverySupported(
        bytes32 indexed recoveryId,
        address indexed guardian
    );
    event RecoveryExecuted(
        bytes32 indexed recoveryId,
        address indexed wallet,
        address indexed newOwner
    );
    event RecoveryCancelled(bytes32 indexed recoveryId);
    event GuardianAdded(address indexed wallet, address indexed guardian);
    event GuardianRemoved(address indexed wallet, address indexed guardian);

    /**
     * @notice Setup social recovery for a wallet
     */
    function setupRecovery(
        address wallet,
        address[] calldata guardians,
        uint256 threshold,
        uint256 recoveryPeriod
    ) external {
        require(guardians.length >= threshold, "Invalid threshold");
        require(threshold > 0, "Threshold must be > 0");

        RecoveryConfig storage config = recoveryConfigs[wallet];
        config.threshold = threshold;
        config.recoveryPeriod = recoveryPeriod;

        // Clear existing guardians
        for (uint256 i = 0; i < config.guardians.length; i++) {
            isGuardian[wallet][config.guardians[i]] = false;
        }
        delete config.guardians;

        // Add new guardians
        for (uint256 i = 0; i < guardians.length; i++) {
            require(guardians[i] != address(0), "Invalid guardian");
            require(!isGuardian[wallet][guardians[i]], "Duplicate guardian");
            
            config.guardians.push(guardians[i]);
            isGuardian[wallet][guardians[i]] = true;
        }

        emit RecoveryConfigured(wallet, guardians, threshold, recoveryPeriod);
    }

    /**
     * @notice Initiate recovery process
     */
    function initiateRecovery(
        address wallet,
        address newOwner,
        bytes calldata signature
    ) external returns (bytes32) {
        require(isGuardian[wallet][msg.sender], "Not a guardian");
        require(newOwner != address(0), "Invalid new owner");

        bytes32 recoveryId = keccak256(
            abi.encodePacked(wallet, newOwner, block.timestamp)
        );

        RecoveryRequest storage request = recoveryRequests[recoveryId];
        require(request.wallet == address(0), "Recovery already exists");

        RecoveryConfig storage config = recoveryConfigs[wallet];
        require(config.threshold > 0, "Recovery not configured");

        request.wallet = wallet;
        request.newOwner = newOwner;
        request.threshold = config.threshold;
        request.initiatedAt = block.timestamp;
        request.approvalCount = 1;
        request.approvals[msg.sender] = true;

        emit RecoveryInitiated(recoveryId, wallet, newOwner, msg.sender);
        emit RecoverySupported(recoveryId, msg.sender);

        return recoveryId;
    }

    /**
     * @notice Support a recovery request
     */
    function supportRecovery(
        bytes32 recoveryId,
        bytes calldata signature
    ) external {
        RecoveryRequest storage request = recoveryRequests[recoveryId];
        require(request.wallet != address(0), "Recovery not found");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Recovery cancelled");
        require(isGuardian[request.wallet][msg.sender], "Not a guardian");
        require(!request.approvals[msg.sender], "Already approved");

        request.approvals[msg.sender] = true;
        request.approvalCount++;

        emit RecoverySupported(recoveryId, msg.sender);
    }

    /**
     * @notice Execute recovery after threshold is met
     */
    function executeRecovery(bytes32 recoveryId, address wallet) external {
        RecoveryRequest storage request = recoveryRequests[recoveryId];
        require(request.wallet == wallet, "Invalid wallet");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Recovery cancelled");
        require(
            request.approvalCount >= request.threshold,
            "Threshold not met"
        );

        RecoveryConfig storage config = recoveryConfigs[wallet];
        require(
            block.timestamp >= request.initiatedAt + config.recoveryPeriod,
            "Recovery period not elapsed"
        );

        request.executed = true;

        // Call wallet to transfer ownership
        (bool success, ) = wallet.call(
            abi.encodeWithSignature(
                "transferOwnership(address)",
                request.newOwner
            )
        );
        require(success, "Ownership transfer failed");

        emit RecoveryExecuted(recoveryId, wallet, request.newOwner);
    }

    /**
     * @notice Cancel recovery request
     */
    function cancelRecovery(bytes32 recoveryId, address wallet) external {
        RecoveryRequest storage request = recoveryRequests[recoveryId];
        require(request.wallet == wallet, "Invalid wallet");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Already cancelled");

        request.cancelled = true;
        emit RecoveryCancelled(recoveryId);
    }

    /**
     * @notice Add a guardian
     */
    function addGuardian(address wallet, address guardian) external {
        require(guardian != address(0), "Invalid guardian");
        require(!isGuardian[wallet][guardian], "Already a guardian");

        RecoveryConfig storage config = recoveryConfigs[wallet];
        config.guardians.push(guardian);
        isGuardian[wallet][guardian] = true;

        emit GuardianAdded(wallet, guardian);
    }

    /**
     * @notice Remove a guardian
     */
    function removeGuardian(address wallet, address guardian) external {
        require(isGuardian[wallet][guardian], "Not a guardian");

        RecoveryConfig storage config = recoveryConfigs[wallet];
        
        // Find and remove guardian
        for (uint256 i = 0; i < config.guardians.length; i++) {
            if (config.guardians[i] == guardian) {
                config.guardians[i] = config.guardians[config.guardians.length - 1];
                config.guardians.pop();
                break;
            }
        }

        isGuardian[wallet][guardian] = false;

        require(
            config.guardians.length >= config.threshold,
            "Would break threshold"
        );

        emit GuardianRemoved(wallet, guardian);
    }

    /**
     * @notice Update recovery threshold
     */
    function updateThreshold(address wallet, uint256 newThreshold) external {
        RecoveryConfig storage config = recoveryConfigs[wallet];
        require(newThreshold > 0, "Invalid threshold");
        require(
            newThreshold <= config.guardians.length,
            "Threshold too high"
        );

        config.threshold = newThreshold;
    }

    /**
     * @notice Get guardians for a wallet
     */
    function getGuardians(address wallet) external view returns (address[] memory) {
        return recoveryConfigs[wallet].guardians;
    }

    /**
     * @notice Get recovery threshold
     */
    function getThreshold(address wallet) external view returns (uint256) {
        return recoveryConfigs[wallet].threshold;
    }

    /**
     * @notice Get recovery period
     */
    function getRecoveryPeriod(address wallet) external view returns (uint256) {
        return recoveryConfigs[wallet].recoveryPeriod;
    }
}
