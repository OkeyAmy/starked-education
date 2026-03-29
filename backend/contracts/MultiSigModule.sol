// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSigModule
 * @notice Implements multi-signature operations for smart wallets
 */
contract MultiSigModule {
    struct MultiSigConfig {
        address[] signers;
        uint256 threshold;
    }

    struct Transaction {
        address wallet;
        address to;
        uint256 value;
        bytes data;
        uint256 approvalCount;
        uint256 threshold;
        bool executed;
        uint256 proposedAt;
        mapping(address => bool) approvals;
    }

    // wallet => MultiSigConfig
    mapping(address => MultiSigConfig) public multiSigConfigs;
    
    // transactionId => Transaction
    mapping(bytes32 => Transaction) public transactions;
    
    // wallet => signer => isSigner
    mapping(address => mapping(address => bool)) public isSigner;
    
    // wallet => pending transaction IDs
    mapping(address => bytes32[]) public pendingTransactions;

    event MultiSigConfigured(
        address indexed wallet,
        address[] signers,
        uint256 threshold
    );
    event TransactionProposed(
        bytes32 indexed transactionId,
        address indexed wallet,
        address indexed proposer,
        address to,
        uint256 value
    );
    event TransactionApproved(
        bytes32 indexed transactionId,
        address indexed signer
    );
    event TransactionExecuted(
        bytes32 indexed transactionId,
        address indexed wallet
    );
    event ApprovalRevoked(
        bytes32 indexed transactionId,
        address indexed signer
    );
    event SignerAdded(address indexed wallet, address indexed signer);
    event SignerRemoved(address indexed wallet, address indexed signer);

    /**
     * @notice Setup multi-sig for a wallet
     */
    function setupMultiSig(
        address wallet,
        address[] calldata signers,
        uint256 threshold
    ) external {
        require(signers.length >= threshold, "Invalid threshold");
        require(threshold > 0, "Threshold must be > 0");

        MultiSigConfig storage config = multiSigConfigs[wallet];
        
        // Clear existing signers
        for (uint256 i = 0; i < config.signers.length; i++) {
            isSigner[wallet][config.signers[i]] = false;
        }
        delete config.signers;

        config.threshold = threshold;

        // Add new signers
        for (uint256 i = 0; i < signers.length; i++) {
            require(signers[i] != address(0), "Invalid signer");
            require(!isSigner[wallet][signers[i]], "Duplicate signer");
            
            config.signers.push(signers[i]);
            isSigner[wallet][signers[i]] = true;
        }

        emit MultiSigConfigured(wallet, signers, threshold);
    }

    /**
     * @notice Propose a transaction
     */
    function proposeTransaction(
        address wallet,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bytes32) {
        require(isSigner[wallet][msg.sender], "Not a signer");

        bytes32 transactionId = keccak256(
            abi.encodePacked(wallet, to, value, data, block.timestamp)
        );

        Transaction storage txn = transactions[transactionId];
        require(txn.wallet == address(0), "Transaction already exists");

        MultiSigConfig storage config = multiSigConfigs[wallet];
        require(config.threshold > 0, "Multi-sig not configured");

        txn.wallet = wallet;
        txn.to = to;
        txn.value = value;
        txn.data = data;
        txn.threshold = config.threshold;
        txn.proposedAt = block.timestamp;
        txn.approvalCount = 1;
        txn.approvals[msg.sender] = true;

        pendingTransactions[wallet].push(transactionId);

        emit TransactionProposed(transactionId, wallet, msg.sender, to, value);
        emit TransactionApproved(transactionId, msg.sender);

        return transactionId;
    }

    /**
     * @notice Approve a transaction
     */
    function approveTransaction(
        bytes32 transactionId,
        bytes calldata signature
    ) external {
        Transaction storage txn = transactions[transactionId];
        require(txn.wallet != address(0), "Transaction not found");
        require(!txn.executed, "Already executed");
        require(isSigner[txn.wallet][msg.sender], "Not a signer");
        require(!txn.approvals[msg.sender], "Already approved");

        txn.approvals[msg.sender] = true;
        txn.approvalCount++;

        emit TransactionApproved(transactionId, msg.sender);
    }

    /**
     * @notice Execute transaction after threshold is met
     */
    function executeTransaction(
        bytes32 transactionId,
        address wallet
    ) external {
        Transaction storage txn = transactions[transactionId];
        require(txn.wallet == wallet, "Invalid wallet");
        require(!txn.executed, "Already executed");
        require(
            txn.approvalCount >= txn.threshold,
            "Threshold not met"
        );

        txn.executed = true;

        // Remove from pending transactions
        _removePendingTransaction(wallet, transactionId);

        // Execute transaction through wallet
        (bool success, ) = wallet.call(
            abi.encodeWithSignature(
                "execute(address,uint256,bytes)",
                txn.to,
                txn.value,
                txn.data
            )
        );
        require(success, "Transaction execution failed");

        emit TransactionExecuted(transactionId, wallet);
    }

    /**
     * @notice Revoke approval
     */
    function revokeApproval(bytes32 transactionId) external {
        Transaction storage txn = transactions[transactionId];
        require(txn.wallet != address(0), "Transaction not found");
        require(!txn.executed, "Already executed");
        require(txn.approvals[msg.sender], "Not approved");

        txn.approvals[msg.sender] = false;
        txn.approvalCount--;

        emit ApprovalRevoked(transactionId, msg.sender);
    }

    /**
     * @notice Add a signer
     */
    function addSigner(address wallet, address signer) external {
        require(signer != address(0), "Invalid signer");
        require(!isSigner[wallet][signer], "Already a signer");

        MultiSigConfig storage config = multiSigConfigs[wallet];
        config.signers.push(signer);
        isSigner[wallet][signer] = true;

        emit SignerAdded(wallet, signer);
    }

    /**
     * @notice Remove a signer
     */
    function removeSigner(address wallet, address signer) external {
        require(isSigner[wallet][signer], "Not a signer");

        MultiSigConfig storage config = multiSigConfigs[wallet];
        
        // Find and remove signer
        for (uint256 i = 0; i < config.signers.length; i++) {
            if (config.signers[i] == signer) {
                config.signers[i] = config.signers[config.signers.length - 1];
                config.signers.pop();
                break;
            }
        }

        isSigner[wallet][signer] = false;

        require(
            config.signers.length >= config.threshold,
            "Would break threshold"
        );

        emit SignerRemoved(wallet, signer);
    }

    /**
     * @notice Update signature threshold
     */
    function updateThreshold(address wallet, uint256 newThreshold) external {
        MultiSigConfig storage config = multiSigConfigs[wallet];
        require(newThreshold > 0, "Invalid threshold");
        require(
            newThreshold <= config.signers.length,
            "Threshold too high"
        );

        config.threshold = newThreshold;
    }

    /**
     * @notice Get signers for a wallet
     */
    function getSigners(address wallet) external view returns (address[] memory) {
        return multiSigConfigs[wallet].signers;
    }

    /**
     * @notice Get threshold
     */
    function getThreshold(address wallet) external view returns (uint256) {
        return multiSigConfigs[wallet].threshold;
    }

    /**
     * @notice Get pending transactions
     */
    function getPendingTransactions(address wallet) external view returns (bytes32[] memory) {
        return pendingTransactions[wallet];
    }

    /**
     * @notice Remove pending transaction
     */
    function _removePendingTransaction(address wallet, bytes32 transactionId) internal {
        bytes32[] storage pending = pendingTransactions[wallet];
        
        for (uint256 i = 0; i < pending.length; i++) {
            if (pending[i] == transactionId) {
                pending[i] = pending[pending.length - 1];
                pending.pop();
                break;
            }
        }
    }

    /**
     * @notice Get transaction count for signer
     */
    function getTransactionCount(address wallet, address signer) external view returns (uint256) {
        uint256 count = 0;
        bytes32[] storage pending = pendingTransactions[wallet];
        
        for (uint256 i = 0; i < pending.length; i++) {
            if (transactions[pending[i]].approvals[signer]) {
                count++;
            }
        }
        
        return count;
    }
}
