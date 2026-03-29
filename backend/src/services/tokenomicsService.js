const crypto = require('crypto');
const stellarService = require('./stellarService');

class TokenomicsService {
    constructor() {
        this.stakingPools = new Map();
        this.governanceProposals = new Map();
        this.apyBps = {
            '1m': 500, // 5%
            '3m': 1000, // 10%
            '6m': 1500, // 15%
            '1y': 3000 // 30%
        };
    }

    /**
     * Create a staking pool for a user
     * @param {string} stakerAddress 
     * @param {number} amount 
     * @param {string} lockDuration '1m', '3m', '6m', '1y'
     */
    async stake(stakerAddress, amount, lockDuration) {
        const apy = this.apyBps[lockDuration] || 200; // default 2%
        const stakeId = crypto.randomUUID();
        
        const stake = {
            id: stakeId,
            stakerAddress,
            amount,
            lockDuration,
            apy,
            startTime: Date.now(),
            status: 'active'
        };

        this.stakingPools.set(stakeId, stake);
        
        // On Stellar: lock tokens in escrow
        const tx = await stellarService.stakeTokensOnChain({
            staker: stakerAddress,
            amount,
            lockDuration,
            apy
        });
        
        return { stake, txHash: tx.txHash };
    }

    /**
     * Calculate yield
     */
    calculateYield(stake) {
        const elapsed = Date.now() - stake.startTime;
        const yearInMs = 31536000000;
        const yieldAmount = (stake.amount * stake.apy * elapsed) / (10000 * yearInMs);
        return yieldAmount;
    }

    /**
     * Create Governance Proposal
     */
    createProposal(creator, title, description) {
        const proposalId = crypto.randomUUID();
        const proposal = {
            id: proposalId,
            creator,
            title,
            description,
            votes_for: 0,
            votes_against: 0,
            status: 'open',
            createdAt: Date.now()
        };
        this.governanceProposals.set(proposalId, proposal);
        return proposalId;
    }

    /**
     * Quadratic Voting Logic
     * Cost = votes^2
     */
    async vote(voterAddress, proposalId, votesRequested, approve) {
        const cost = votesRequested ** 2;
        
        const voterBalance = await stellarService.getTokenBalance(voterAddress, 'GOV_TOKEN');
        if (voterBalance < cost) {
            throw new Error('Insufficient governance tokens for quadratic voting weight');
        }

        const proposal = this.governanceProposals.get(proposalId);
        if (!proposal) throw new Error('Proposal not found');

        if (approve) {
            proposal.votes_for += votesRequested;
        } else {
            proposal.votes_against += votesRequested;
        }

        // On Stellar: burn gov tokens for voting power
        const tx = await stellarService.burnGovTokens(voterAddress, cost);
        
        return { success: true, txHash: tx.txHash };
    }
}

module.exports = new TokenomicsService();
