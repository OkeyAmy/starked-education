/**
 * Smart Wallet Deployment Script
 * Deploys all smart contract wallet components
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('🚀 Starting Smart Wallet deployment...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH\n');

  // Deploy Entry Point (if not already deployed)
  console.log('📝 Deploying Entry Point...');
  const EntryPoint = await ethers.getContractFactory('EntryPoint');
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.waitForDeployment();
  const entryPointAddress = await entryPoint.getAddress();
  console.log('✅ Entry Point deployed to:', entryPointAddress, '\n');

  // Deploy Smart Wallet Implementation
  console.log('📝 Deploying Smart Wallet Implementation...');
  const SmartWallet = await ethers.getContractFactory('SmartWallet');
  const smartWalletImpl = await SmartWallet.deploy(entryPointAddress);
  await smartWalletImpl.waitForDeployment();
  const smartWalletImplAddress = await smartWalletImpl.getAddress();
  console.log('✅ Smart Wallet Implementation deployed to:', smartWalletImplAddress, '\n');

  // Deploy Wallet Factory
  console.log('📝 Deploying Wallet Factory...');
  const WalletFactory = await ethers.getContractFactory('SmartWalletFactory');
  const walletFactory = await WalletFactory.deploy(entryPointAddress, smartWalletImplAddress);
  await walletFactory.waitForDeployment();
  const walletFactoryAddress = await walletFactory.getAddress();
  console.log('✅ Wallet Factory deployed to:', walletFactoryAddress, '\n');

  // Deploy Social Recovery Module
  console.log('📝 Deploying Social Recovery Module...');
  const SocialRecoveryModule = await ethers.getContractFactory('SocialRecoveryModule');
  const recoveryModule = await SocialRecoveryModule.deploy();
  await recoveryModule.waitForDeployment();
  const recoveryModuleAddress = await recoveryModule.getAddress();
  console.log('✅ Social Recovery Module deployed to:', recoveryModuleAddress, '\n');

  // Deploy Multi-Sig Module
  console.log('📝 Deploying Multi-Sig Module...');
  const MultiSigModule = await ethers.getContractFactory('MultiSigModule');
  const multiSigModule = await MultiSigModule.deploy();
  await multiSigModule.waitForDeployment();
  const multiSigModuleAddress = await multiSigModule.getAddress();
  console.log('✅ Multi-Sig Module deployed to:', multiSigModuleAddress, '\n');

  // Deploy Session Key Module
  console.log('📝 Deploying Session Key Module...');
  const SessionKeyModule = await ethers.getContractFactory('SessionKeyModule');
  const sessionKeyModule = await SessionKeyModule.deploy();
  await sessionKeyModule.waitForDeployment();
  const sessionKeyModuleAddress = await sessionKeyModule.getAddress();
  console.log('✅ Session Key Module deployed to:', sessionKeyModuleAddress, '\n');

  // Deploy Credential Registry
  console.log('📝 Deploying Credential Registry...');
  const CredentialRegistry = await ethers.getContractFactory('CredentialRegistry');
  const credentialRegistry = await CredentialRegistry.deploy();
  await credentialRegistry.waitForDeployment();
  const credentialRegistryAddress = await credentialRegistry.getAddress();
  console.log('✅ Credential Registry deployed to:', credentialRegistryAddress, '\n');

  // Deploy Paymaster (optional)
  console.log('📝 Deploying Paymaster...');
  const Paymaster = await ethers.getContractFactory('VerifyingPaymaster');
  const paymaster = await Paymaster.deploy(entryPointAddress, deployer.address);
  await paymaster.waitForDeployment();
  const paymasterAddress = await paymaster.getAddress();
  console.log('✅ Paymaster deployed to:', paymasterAddress, '\n');

  // Fund paymaster
  console.log('💰 Funding Paymaster...');
  const fundAmount = ethers.parseEther('1.0');
  await entryPoint.depositTo(paymasterAddress, { value: fundAmount });
  console.log('✅ Paymaster funded with', ethers.formatEther(fundAmount), 'ETH\n');

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 Deployment Complete!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 Contract Addresses:');
  console.log('─────────────────────────────────────────────────────');
  console.log('Entry Point:           ', entryPointAddress);
  console.log('Wallet Implementation: ', smartWalletImplAddress);
  console.log('Wallet Factory:        ', walletFactoryAddress);
  console.log('Recovery Module:       ', recoveryModuleAddress);
  console.log('Multi-Sig Module:      ', multiSigModuleAddress);
  console.log('Session Key Module:    ', sessionKeyModuleAddress);
  console.log('Credential Registry:   ', credentialRegistryAddress);
  console.log('Paymaster:             ', paymasterAddress);
  console.log('─────────────────────────────────────────────────────\n');

  console.log('📝 Environment Variables:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`ENTRY_POINT_ADDRESS=${entryPointAddress}`);
  console.log(`WALLET_FACTORY_ADDRESS=${walletFactoryAddress}`);
  console.log(`RECOVERY_MODULE_ADDRESS=${recoveryModuleAddress}`);
  console.log(`MULTISIG_MODULE_ADDRESS=${multiSigModuleAddress}`);
  console.log(`SESSION_KEY_MODULE_ADDRESS=${sessionKeyModuleAddress}`);
  console.log(`CREDENTIAL_REGISTRY_ADDRESS=${credentialRegistryAddress}`);
  console.log(`PAYMASTER_ADDRESS=${paymasterAddress}`);
  console.log('─────────────────────────────────────────────────────\n');

  console.log('✅ Add these addresses to your .env file');
  console.log('✅ Verify contracts on Etherscan if deploying to mainnet/testnet');
  console.log('✅ Update frontend configuration with new addresses\n');

  // Verification commands
  console.log('🔍 Verification Commands:');
  console.log('─────────────────────────────────────────────────────');
  console.log(`npx hardhat verify --network <network> ${entryPointAddress}`);
  console.log(`npx hardhat verify --network <network> ${smartWalletImplAddress} ${entryPointAddress}`);
  console.log(`npx hardhat verify --network <network> ${walletFactoryAddress} ${entryPointAddress} ${smartWalletImplAddress}`);
  console.log(`npx hardhat verify --network <network> ${recoveryModuleAddress}`);
  console.log(`npx hardhat verify --network <network> ${multiSigModuleAddress}`);
  console.log(`npx hardhat verify --network <network> ${sessionKeyModuleAddress}`);
  console.log(`npx hardhat verify --network <network> ${credentialRegistryAddress}`);
  console.log(`npx hardhat verify --network <network> ${paymasterAddress} ${entryPointAddress} ${deployer.address}`);
  console.log('─────────────────────────────────────────────────────\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
