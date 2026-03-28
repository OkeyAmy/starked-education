// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SmartWallet
 * @notice ERC-4337 compliant smart contract wallet with modular features
 */
contract SmartWallet is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    IEntryPoint private immutable _entryPoint;
    address public owner;

    // Module addresses
    address public socialRecoveryModule;
    address public multiSigModule;
    address public sessionKeyModule;

    event WalletInitialized(address indexed owner, address indexed entryPoint);
    event TransactionExecuted(address indexed to, uint256 value, bytes data);
    event BatchExecuted(uint256 count);
    event ModuleUpdated(string moduleName, address moduleAddress);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        require(
            msg.sender == owner || msg.sender == address(_entryPoint),
            "Not owner or entry point"
        );
        _;
    }

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    /**
     * @notice Initialize the wallet
     */
    function initialize(address anOwner) public initializer {
        require(anOwner != address(0), "Invalid owner");
        owner = anOwner;
        emit WalletInitialized(anOwner, address(_entryPoint));
    }

    /**
     * @notice Get the entry point
     */
    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    /**
     * @notice Validate user operation signature
     */
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address signer = hash.recover(userOp.signature);
        
        if (signer != owner) {
            return SIG_VALIDATION_FAILED;
        }
        return 0;
    }

    /**
     * @notice Execute a transaction
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external onlyOwnerOrEntryPoint {
        _call(to, value, data);
        emit TransactionExecuted(to, value, data);
    }

    /**
     * @notice Execute batch transactions
     */
    function executeBatch(
        address[] calldata to,
        uint256[] calldata value,
        bytes[] calldata data
    ) external onlyOwnerOrEntryPoint {
        require(
            to.length == value.length && to.length == data.length,
            "Length mismatch"
        );

        for (uint256 i = 0; i < to.length; i++) {
            _call(to[i], value[i], data[i]);
        }

        emit BatchExecuted(to.length);
    }

    /**
     * @notice Internal call function
     */
    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * @notice Set social recovery module
     */
    function setSocialRecoveryModule(address module) external onlyOwner {
        socialRecoveryModule = module;
        emit ModuleUpdated("SocialRecovery", module);
    }

    /**
     * @notice Set multi-sig module
     */
    function setMultiSigModule(address module) external onlyOwner {
        multiSigModule = module;
        emit ModuleUpdated("MultiSig", module);
    }

    /**
     * @notice Set session key module
     */
    function setSessionKeyModule(address module) external onlyOwner {
        sessionKeyModule = module;
        emit ModuleUpdated("SessionKey", module);
    }

    /**
     * @notice Transfer ownership (used by recovery module)
     */
    function transferOwnership(address newOwner) external {
        require(
            msg.sender == socialRecoveryModule || msg.sender == owner,
            "Not authorized"
        );
        require(newOwner != address(0), "Invalid new owner");
        
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @notice Authorize upgrade
     */
    function _authorizeUpgrade(address newImplementation) internal view override onlyOwner {}

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
