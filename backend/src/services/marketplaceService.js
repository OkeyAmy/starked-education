const { EventEmitter } = require('events');
const crypto = require('crypto');
const stellarService = require('./stellarService');

class MarketplaceService extends EventEmitter {
    constructor() {
        super();
        this.listings = new Map();
        this.basePrice = 100; // in XLM or USDC (unit)
        this.slope = 0.5; // for bonding curve
    }

    /**
     * Calculate bonding curve price
     * Price = basePrice + (slope * itemsCreated^2)
     * @param {number} supply 
     */
    calculatePrice(supply) {
        return this.basePrice + (this.slope * (supply ** 2));
    }

    /**
     * Match a buyer with a seller for a credential
     */
    async matchTrade(buyerAddress, listingId) {
        const listing = this.listings.get(listingId);
        if (!listing || !listing.active) {
            throw new Error('Listing not found or inactive');
        }

        const price = this.calculatePrice(listing.supply || 1);
        
        // Initiate escrow on Stellar
        const escrowStatus = await stellarService.initiateEscrow({
            buyer: buyerAddress,
            seller: listing.sellerAddress,
            credentialId: listing.credentialId,
            price,
            royaltyBps: listing.royaltyBps
        });

        if (escrowStatus.success) {
            listing.active = false;
            this.emit('trade_matched', { buyerAddress, listingId, price });
            return { matched: true, txHash: escrowStatus.txHash };
        }

        return { matched: false, error: 'Escrow failed' };
    }

    /**
     * Reputation-based matching
     * Filters listings by seller reputation
     */
    async getHighQualityListings(minReputation) {
        const results = [];
        for (const [id, listing] of this.listings) {
            const sellerProfile = await stellarService.getUserProfile(listing.sellerAddress);
            if (sellerProfile.reputation >= minReputation) {
                results.push({ id, ...listing, sellerReputation: sellerProfile.reputation });
            }
        }
        return results;
    }

    /**
     * Create a new listing
     */
    createListing(sellerAddress, credentialId, royaltyBps) {
        const listingId = crypto.randomUUID();
        const listing = {
            id: listingId,
            sellerAddress,
            credentialId,
            royaltyBps,
            active: true,
            supply: this.listings.size + 1
        };
        this.listings.set(listingId, listing);
        return listingId;
    }
}

module.exports = new MarketplaceService();
