// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title SessionKeyModule
 * @notice Implements session key management for dApp interactions
 */
contract SessionKeyModule {
    using ECDSA for bytes32;

    struct SessionKey {
        address[] allowedContracts;
        bytes4[] allowedMethods;
        uint256 spendingLimit;
        uint256 spentAmount;
        uint256 validUntil;
        bool revoked;
        uint256 createdAt;
    }

    // wallet => sessionKey => SessionKey
    mapping(address => mapping(address => SessionKey)) public sessionKeys;
    
    // wallet => active session keys
    mapping(address => address[]) public activeSessionKeys;
    
    // wallet => sessionKey => transaction count
    mapping(address => mapping(address => uint256)) public transactionCounts;

    event SessionKeyCreated(
        address indexed wallet,
        address indexed sessionKey,
        uint256 spendingLimit,
        uint256 validUntil
    );
    event SessionKeyRevoked(
        address indexed wallet,
        address indexed sessionKey
    );
    event SessionKeyExecuted(
        address indexed wallet,
        address indexed sessionKey,
        address indexed target,
        uint256 value
    );
    event SessionKeyUpdated(
        address indexed wallet,
        address indexed sessionKey
    );
    event SessionKeyExtended(
        address indexed wallet,
        address indexed sessionKey,
        uint256 newValidUntil
    );

    /**
     * @notice Create a new session key
     */
    function createSessionKey(
        address wallet,
        address sessionKey,
        address[] calldata allowedContracts,
        bytes4[] calldata allowedMethods,
        uint256 spendingLimit,
        uint256 validUntil
    ) external {
        require(sessionKey != address(0), "Invalid session key");
        require(validUntil > block.timestamp, "Invalid expiry");
        require(
            sessionKeys[wallet][sessionKey].createdAt == 0,
            "Session key already exists"
        );

        SessionKey storage key = sessionKeys[wallet][sessionKey];
        key.allowedContracts = allowedContracts;
        key.allowedMethods = allowedMethods;
        key.spendingLimit = spendingLimit;
        key.validUntil = validUntil;
        key.createdAt = block.timestamp;

        activeSessionKeys[wallet].push(sessionKey);

        emit SessionKeyCreated(wallet, sessionKey, spendingLimit, validUntil);
    }

    /**
     * @notice Revoke a session key
     */
    function revokeSessionKey(address wallet, address sessionKey) external {
        SessionKey storage key = sessionKeys[wallet][sessionKey];
        require(key.createdAt > 0, "Session key not found");
        require(!key.revoked, "Already revoked");

        key.revoked = true;

        // Remove from active keys
        _removeActiveSessionKey(wallet, sessionKey);

        emit SessionKeyRevoked(wallet, sessionKey);
    }

    /**
     * @notice Execute transaction with session key
     */
    function executeWithSessionKey(
        address wallet,
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signature
    ) external {
        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(wallet, to, value, data)
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address sessionKey = ethSignedMessageHash.recover(signature);

        // Validate session key
        SessionKey storage key = sessionKeys[wallet][sessionKey];
        require(key.createdAt > 0, "Session key not found");
        require(!key.revoked, "Session key revoked");
        require(block.timestamp <= key.validUntil, "Session key expired");

        // Check spending limit
        require(
            key.spentAmount + value <= key.spendingLimit,
            "Spending limit exceeded"
        );

        // Check allowed contracts
        if (key.allowedContracts.length > 0) {
            bool contractAllowed = false;
            for (uint256 i = 0; i < key.allowedContracts.length; i++) {
                if (key.allowedContracts[i] == to) {
                    contractAllowed = true;
                    break;
                }
            }
            require(contractAllowed, "Contract not allowed");
        }

        // Check allowed methods
        if (key.allowedMethods.length > 0 && data.length >= 4) {
            bytes4 methodSelector = bytes4(data[:4]);
            bool methodAllowed = false;
            for (uint256 i = 0; i < key.allowedMethods.length; i++) {
                if (key.allowedMethods[i] == methodSelector) {
                    methodAllowed = true;
                    break;
                }
            }
            require(methodAllowed, "Method not allowed");
        }

        // Update spent amount
        key.spentAmount += value;
        transactionCounts[wallet][sessionKey]++;

        // Execute transaction through wallet
        (bool success, ) = wallet.call(
            abi.encodeWithSignature(
                "execute(address,uint256,bytes)",
                to,
                value,
                data
            )
        );
        require(success, "Transaction execution failed");

        emit SessionKeyExecuted(wallet, sessionKey, to, value);
    }

    /**
     * @notice Update session key permissions
     */
    function updateSessionKey(
        address wallet,
        address sessionKey,
        address[] calldata allowedContracts,
        bytes4[] calldata allowedMethods,
        uint256 spendingLimit
    ) external {
        SessionKey storage key = sessionKeys[wallet][sessionKey];
        require(key.createdAt > 0, "Session key not found");
        require(!key.revoked, "Session key revoked");

        key.allowedContracts = allowedContracts;
        key.allowedMethods = allowedMethods;
        key.spendingLimit = spendingLimit;

        emit SessionKeyUpdated(wallet, sessionKey);
    }

    /**
     * @notice Extend session key validity
     */
    function extendSessionKey(
        address wallet,
        address sessionKey,
        uint256 newValidUntil
    ) external {
        SessionKey storage key = sessionKeys[wallet][sessionKey];
        require(key.createdAt > 0, "Session key not found");
        require(!key.revoked, "Session key revoked");
        require(newValidUntil > key.validUntil, "Must extend validity");

        key.validUntil = newValidUntil;

        emit SessionKeyExtended(wallet, sessionKey, newValidUntil);
    }

    /**
     * @notice Get active session keys
     */
    function getActiveSessionKeys(address wallet) external view returns (address[] memory) {
        address[] memory active = activeSessionKeys[wallet];
        uint256 count = 0;

        // Count non-revoked, non-expired keys
        for (uint256 i = 0; i < active.length; i++) {
            SessionKey storage key = sessionKeys[wallet][active[i]];
            if (!key.revoked && block.timestamp <= key.validUntil) {
                count++;
            }
        }

        // Build result array
        address[] memory result = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < active.length; i++) {
            SessionKey storage key = sessionKeys[wallet][active[i]];
            if (!key.revoked && block.timestamp <= key.validUntil) {
                result[index] = active[i];
                index++;
            }
        }

        return result;
    }

    /**
     * @notice Get session key transaction count
     */
    function getSessionKeyTransactionCount(
        address wallet,
        address sessionKey
    ) external view returns (uint256) {
        return transactionCounts[wallet][sessionKey];
    }

    /**
     * @notice Check if session key is valid
     */
    function isSessionKeyValid(
        address wallet,
        address sessionKey
    ) external view returns (bool) {
        SessionKey storage key = sessionKeys[wallet][sessionKey];
        return key.createdAt > 0 &&
               !key.revoked &&
               block.timestamp <= key.validUntil;
    }

    /**
     * @notice Get remaining spending limit
     */
    function getRemainingLimit(
        address wallet,
        address sessionKey
    ) external view returns (uint256) {
        SessionKey storage key = sessionKeys[wallet][sessionKey];
        if (key.spentAmount >= key.spendingLimit) {
            return 0;
        }
        return key.spendingLimit - key.spentAmount;
    }

    /**
     * @notice Remove active session key
     */
    function _removeActiveSessionKey(address wallet, address sessionKey) internal {
        address[] storage active = activeSessionKeys[wallet];
        
        for (uint256 i = 0; i < active.length; i++) {
            if (active[i] == sessionKey) {
                active[i] = active[active.length - 1];
                active.pop();
                break;
            }
        }
    }
}
