#![no_std]
use crate::utils::storage::{PackedTimestamps, PackedUserFlags, StorageUtils};
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

/// Achievement tier with weight
#[contracttype]
#[derive(Clone)]
pub enum AchievementTier {
    Bronze = 0,   // Course completion - weight 1
    Silver = 1,   // Multiple courses - weight 2
    Gold = 2,     // Advanced credentials - weight 3
    Platinum = 3, // Degree-level - weight 4
}

/// Optimized user profile with packed storage
#[contracttype]
#[derive(Clone)]
pub struct UserProfile {
    pub owner: Address,
    pub username: String,
    pub email_hash: String,  // Hash of email string
    pub bio_hash: String,    // Hash of bio string
    pub avatar_hash: String, // Hash of avatar URL
    pub timestamps: PackedTimestamps,
    pub achievement_count: u32,
    pub credential_count: u32,
    pub reputation: u64,
    pub flags: PackedUserFlags,
}

/// Privacy levels packed into flags
#[contracttype]
#[derive(Copy, Clone)]
pub enum PrivacyLevel {
    Public = 0,
    Private = 1,
    FriendsOnly = 2,
}

impl PrivacyLevel {
    pub fn to_u32(&self) -> u32 {
        *self as u32
    }

    pub fn from_u32(value: u32) -> Self {
        match value & 0x03 {
            0 => PrivacyLevel::Public,
            1 => PrivacyLevel::Private,
            2 => PrivacyLevel::FriendsOnly,
            _ => PrivacyLevel::Public,
        }
    }
}

/// Optimized storage keys with better organization
#[contracttype]
#[derive(Clone)]
pub enum ProfileKey {
    User(Address),
    UserEmail(Address),        // Separate email storage
    UserBio(Address),          // Separate bio storage
    UserAvatar(Address),       // Separate avatar storage
    UserAchievements(Address), // Achievement ID list
    UserCredentials(Address),  // Credential ID list
    Achievement(u64),
    Username(String),
    AchievementByUser(Address, u64),
    AchievementCount,
    CredentialCount,
}

/// Optimized achievement with packed verification status
#[contracttype]
#[derive(Clone)]
pub struct Achievement {
    pub id: u64,
    pub user: Address,
    pub title: String,
    pub description: String,
    pub timestamp: u64,     // Packed earned_at and verification status
    pub badge_hash: String, // Hash of badge URL
    pub tier: u32,          // 0-3 mapping to AchievementTier
    pub weight: u32,        // Computed weight value based on tier
}

#[contract]
pub struct UserProfileContract;

#[contractimpl]
impl UserProfileContract {
    /// Initialize the contract
    pub fn initialize(_env: Env) {
        // Contract initialization logic can be added here if needed
    }

    /// Create or update a user profile with optimized storage
    pub fn create_or_update_profile(
        env: Env,
        owner: Address,
        username: String,
        email: Option<String>,
        bio: Option<String>,
        avatar_url: Option<String>,
        privacy_level: PrivacyLevel,
    ) -> UserProfile {
        owner.require_auth();

        // Check if username is already taken by another user
        if let Some(existing_owner) = env
            .storage()
            .instance()
            .get::<_, Address>(&ProfileKey::Username(username.clone()))
        {
            if existing_owner != owner {
                panic!("Username already taken");
            }
        }

        let now = env.ledger().timestamp();
        let timestamps = PackedTimestamps::new(now, now);
        let flags = PackedUserFlags::new(privacy_level.to_u32(), false, true);

        let profile = if let Some(mut existing_profile) = env
            .storage()
            .instance()
            .get::<_, UserProfile>(&ProfileKey::User(owner.clone()))
        {
            // Update existing profile
            existing_profile.username = username.clone();
            existing_profile.timestamps =
                PackedTimestamps::new(existing_profile.timestamps.created_at(), now);
            existing_profile.flags = PackedUserFlags::new(
                privacy_level.to_u32(),
                existing_profile.flags.is_verified(),
                existing_profile.flags.is_active(),
            );

            // Store optional data separately
            if let Some(email) = email {
                let email_hash = Self::generate_string_hash(&env, &email);
                existing_profile.email_hash = email_hash;
                env.storage()
                    .instance()
                    .set(&ProfileKey::UserEmail(owner.clone()), &email);
            }
            if let Some(bio) = bio.clone() {
                let bio_hash = Self::generate_string_hash(&env, &bio);
                existing_profile.bio_hash = bio_hash;
                env.storage()
                    .instance()
                    .set(&ProfileKey::UserBio(owner.clone()), &bio);
            }
            if let Some(avatar) = avatar_url.clone() {
                let avatar_hash = Self::generate_string_hash(&env, &avatar);
                existing_profile.avatar_hash = avatar_hash;
                env.storage()
                    .instance()
                    .set(&ProfileKey::UserAvatar(owner.clone()), &avatar);
            }

            existing_profile
        } else {
            // Create new profile
            let email_ref = email.as_ref();
            let bio_ref = bio.as_ref();
            let avatar_ref = avatar_url.as_ref();
            let email_hash = Self::generate_string_hash(
                &env,
                &email_ref
                    .map(|s| s.clone())
                    .unwrap_or_else(|| String::from_str(&env, "")),
            );
            let bio_hash = Self::generate_string_hash(
                &env,
                &bio_ref
                    .map(|s| s.clone())
                    .unwrap_or_else(|| String::from_str(&env, "")),
            );
            let avatar_hash = Self::generate_string_hash(
                &env,
                &avatar_ref
                    .map(|s| s.clone())
                    .unwrap_or_else(|| String::from_str(&env, "")),
            );

            let new_profile = UserProfile {
                owner: owner.clone(),
                username: username.clone(),
                email_hash,
                bio_hash,
                avatar_hash,
                timestamps,
                achievement_count: 0,
                credential_count: 0,
                reputation: 0,
                flags,
            };

            // Store optional data separately if provided
            if let Some(email) = email {
                env.storage()
                    .instance()
                    .set(&ProfileKey::UserEmail(owner.clone()), &email);
            }
            if let Some(bio) = bio {
                env.storage()
                    .instance()
                    .set(&ProfileKey::UserBio(owner.clone()), &bio);
            }
            if let Some(avatar) = avatar_url {
                env.storage()
                    .instance()
                    .set(&ProfileKey::UserAvatar(owner.clone()), &avatar);
            }

            new_profile
        };

        // Store the profile
        env.storage()
            .instance()
            .set(&ProfileKey::User(owner.clone()), &profile);
        // Store username mapping for uniqueness check
        env.storage()
            .instance()
            .set(&ProfileKey::Username(username), &owner);

        // Emit event for profile update
        env.events().publish(
            (symbol_short!("profile"), symbol_short!("updated")),
            (&owner,),
        );

        profile
    }

    /// Get user profile by address
    pub fn get_profile(env: Env, user: Address) -> Option<UserProfile> {
        env.storage().instance().get(&ProfileKey::User(user))
    }

    /// Get user profile by username
    pub fn get_profile_by_username(env: Env, username: String) -> Option<UserProfile> {
        if let Some(owner) = env
            .storage()
            .instance()
            .get::<_, Address>(&ProfileKey::Username(username))
        {
            env.storage().instance().get(&ProfileKey::User(owner))
        } else {
            None
        }
    }

    /// Map an achievement tier to its numeric weight value
    pub fn get_achievement_tier_weight(tier: u32) -> u32 {
        match tier {
            0 => 1, // Bronze
            1 => 2, // Silver
            2 => 3, // Gold
            3 => 4, // Platinum
            _ => 1, // Default to Bronze
        }
    }

    /// Get the total weight of all verified achievements for a user
    pub fn get_user_achievement_weight(env: Env, user: Address) -> u32 {
        let mut total_weight: u32 = 0;
        let user_achievements: Vec<u64> = env
            .storage()
            .instance()
            .get(&ProfileKey::UserAchievements(user))
            .unwrap_or_else(|| Vec::new(&env));

        for achievement_id in user_achievements.iter() {
            if let Some(achievement) = env
                .storage()
                .instance()
                .get::<_, Achievement>(&ProfileKey::Achievement(achievement_id))
            {
                if (achievement.timestamp & 1u64) != 0 {
                    total_weight += achievement.weight;
                }
            }
        }
        total_weight
    }

    /// Get the multiplier contribution in basis points for a user's verified achievements.
    /// Each verified achievement contributes (weight + 1) * 500 bps:
    ///   Bronze (weight 1): +1000 bps (0.1x)
    ///   Silver (weight 2): +1500 bps (0.15x)
    ///   Gold   (weight 3): +2000 bps (0.2x)
    ///   Platinum (weight 4): +2500 bps (0.25x)
    pub fn get_achievement_mult_bps(env: Env, user: Address) -> u32 {
        let mut total_bps: u32 = 0;
        let user_achievements: Vec<u64> = env
            .storage()
            .instance()
            .get(&ProfileKey::UserAchievements(user))
            .unwrap_or_else(|| Vec::new(&env));

        for achievement_id in user_achievements.iter() {
            if let Some(achievement) = env
                .storage()
                .instance()
                .get::<_, Achievement>(&ProfileKey::Achievement(achievement_id))
            {
                if (achievement.timestamp & 1u64) != 0 {
                    total_bps += (achievement.weight + 1) * 500;
                }
            }
        }
        total_bps
    }

    /// Add an achievement to a user with optimized storage
    pub fn add_achievement(
        env: Env,
        user: Address,
        title: String,
        description: String,
        badge_url: Option<String>,
        tier: u32,
    ) -> u64 {
        user.require_auth();

        let achievement_id = Self::get_next_achievement_id(&env);
        let timestamp = env.ledger().timestamp();

        // Pack timestamp and verification status
        let packed_timestamp = timestamp << 1; // Reserve bit 0 for verification status
        let badge_ref = badge_url.as_ref();
        let badge_hash = Self::generate_string_hash(
            &env,
            &badge_ref
                .map(|s| s.clone())
                .unwrap_or_else(|| String::from_str(&env, "")),
        );

        let weight = Self::get_achievement_tier_weight(tier);

        // Create achievement
        let achievement = Achievement {
            id: achievement_id,
            user: user.clone(),
            title,
            description,
            timestamp: packed_timestamp,
            badge_hash,
            tier,
            weight,
        };

        // Store the achievement
        env.storage()
            .instance()
            .set(&ProfileKey::Achievement(achievement_id), &achievement);
        env.storage().instance().set(
            &ProfileKey::AchievementByUser(user.clone(), achievement_id),
            &(),
        );

        // Store badge URL separately if provided
        if let Some(badge_url) = badge_url {
            env.storage()
                .instance()
                .set(&ProfileKey::UserAvatar(user.clone()), &badge_url); // Reuse storage key
        }

        // Update user achievement count
        if let Some(mut profile) = env
            .storage()
            .instance()
            .get::<_, UserProfile>(&ProfileKey::User(user.clone()))
        {
            profile.achievement_count += 1;
            profile.timestamps = PackedTimestamps::new(profile.timestamps.created_at(), timestamp);
            env.storage()
                .instance()
                .set(&ProfileKey::User(user.clone()), &profile);
        }

        // Also store the user's achievement list separately for easier access
        let mut user_achievements: Vec<u64> = env
            .storage()
            .instance()
            .get(&ProfileKey::UserAchievements(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));
        user_achievements.push_back(achievement_id);
        env.storage().instance().set(
            &ProfileKey::UserAchievements(user.clone()),
            &user_achievements,
        );

        // Emit event for achievement earned
        env.events().publish(
            (symbol_short!("ach"), symbol_short!("earn")),
            (user, achievement_id),
        );

        achievement_id
    }

    /// Get achievement by ID
    pub fn get_achievement(env: Env, achievement_id: u64) -> Option<Achievement> {
        env.storage()
            .instance()
            .get(&ProfileKey::Achievement(achievement_id))
    }

    /// Get all achievements for a user
    pub fn get_user_achievements(env: Env, user: Address) -> Vec<Achievement> {
        let mut achievements = Vec::new(&env);

        let user_achievements: Vec<u64> = env
            .storage()
            .instance()
            .get(&ProfileKey::UserAchievements(user))
            .unwrap_or_else(|| Vec::new(&env));

        for achievement_id in user_achievements.iter() {
            if let Some(achievement) = Self::get_achievement(env.clone(), achievement_id) {
                achievements.push_back(achievement);
            }
        }

        achievements
    }

    /// Verify an achievement using packed timestamp
    pub fn verify_achievement(env: Env, admin: Address, achievement_id: u64) -> bool {
        admin.require_auth();

        let mut achievement = env
            .storage()
            .instance()
            .get::<_, Achievement>(&ProfileKey::Achievement(achievement_id))
            .unwrap_or_else(|| panic!("Achievement not found"));

        // Set verification bit (bit 0)
        achievement.timestamp |= 1u64;
        env.storage()
            .instance()
            .set(&ProfileKey::Achievement(achievement_id), &achievement);

        // Emit event for verification
        env.events().publish(
            (symbol_short!("ach"), symbol_short!("ver")),
            (achievement_id,),
        );

        true
    }

    /// Check if profile is authentic by verifying it exists and has proper data
    pub fn verify_profile_authenticity(env: Env, user: Address) -> bool {
        if let Some(profile) = env
            .storage()
            .instance()
            .get::<_, UserProfile>(&ProfileKey::User(user))
        {
            // Perform basic checks for authenticity
            // Here we just check that the profile exists and has a username
            profile.username.len() > 0
        } else {
            false
        }
    }

    /// Get next achievement ID
    fn get_next_achievement_id(env: &Env) -> u64 {
        let current_id: u64 = env
            .storage()
            .instance()
            .get(&symbol_short!("nxt_ach"))
            .unwrap_or(0);

        let next_id = current_id + 1;
        env.storage()
            .instance()
            .set(&symbol_short!("nxt_ach"), &next_id);

        next_id
    }

    /// Update privacy level for a profile using packed flags
    pub fn update_privacy_level(env: Env, user: Address, privacy_level: PrivacyLevel) -> bool {
        user.require_auth();

        let mut profile = env
            .storage()
            .instance()
            .get::<_, UserProfile>(&ProfileKey::User(user.clone()))
            .unwrap_or_else(|| panic!("Profile not found"));

        let now = env.ledger().timestamp();
        profile.flags = PackedUserFlags::new(
            privacy_level.to_u32(),
            profile.flags.is_verified(),
            profile.flags.is_active(),
        );
        profile.timestamps = PackedTimestamps::new(profile.timestamps.created_at(), now);

        env.storage()
            .instance()
            .set(&ProfileKey::User(user), &profile);

        true
    }

    /// Get profile with privacy check using packed flags
    pub fn get_profile_with_privacy_check(
        env: Env,
        requester: Address,
        target_user: Address,
    ) -> Option<UserProfile> {
        if let Some(profile) = env
            .storage()
            .instance()
            .get::<_, UserProfile>(&ProfileKey::User(target_user.clone()))
        {
            let privacy_level = PrivacyLevel::from_u32(profile.flags.privacy_level());
            match privacy_level {
                PrivacyLevel::Public => Some(profile),
                PrivacyLevel::Private => {
                    if requester == target_user.clone() {
                        Some(profile)
                    } else {
                        None
                    }
                }
                PrivacyLevel::FriendsOnly => {
                    // In a real implementation, this would check friendship status
                    // For now, we'll allow access only to the profile owner
                    if requester == target_user.clone() {
                        Some(profile)
                    } else {
                        None
                    }
                }
            }
        } else {
            None
        }
    }

    /// Add a credential to user's profile with optimized storage
    pub fn add_credential(env: &Env, user: Address, credential_id: u64) {
        let mut profile = env
            .storage()
            .instance()
            .get::<_, UserProfile>(&ProfileKey::User(user.clone()))
            .unwrap_or_else(|| {
                // Create minimal profile if missing (fallback)
                let now = env.ledger().timestamp();
                UserProfile {
                    owner: user.clone(),
                    username: String::from_str(env, "unknown"),
                    email_hash: Self::generate_string_hash(env, &String::from_str(env, "")),
                    bio_hash: Self::generate_string_hash(env, &String::from_str(env, "")),
                    avatar_hash: Self::generate_string_hash(env, &String::from_str(env, "")),
                    timestamps: PackedTimestamps::new(now, now),
                    achievement_count: 0,
                    credential_count: 0,
                    reputation: 0,
                    flags: PackedUserFlags::new(PrivacyLevel::Public.to_u32(), false, true),
                }
            });

        // Update credential count
        profile.credential_count += 1;
        profile.timestamps =
            PackedTimestamps::new(profile.timestamps.created_at(), env.ledger().timestamp());
        env.storage()
            .instance()
            .set(&ProfileKey::User(user.clone()), &profile);

        // Also maintain separate user credentials list for fast lookup
        let mut user_creds: Vec<u64> = env
            .storage()
            .instance()
            .get(&ProfileKey::UserCredentials(user.clone()))
            .unwrap_or_else(|| Vec::new(env));
        if !user_creds.contains(&credential_id) {
            user_creds.push_back(credential_id);
            env.storage()
                .instance()
                .set(&ProfileKey::UserCredentials(user), &user_creds);
        }
    }

    /// Get all credential IDs for a user (fast path)
    pub fn get_user_credential_ids(env: &Env, user: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&ProfileKey::UserCredentials(user))
            .unwrap_or_else(|| Vec::new(env))
    }

    /// Generate hash for string data
    fn generate_string_hash(env: &Env, string: &String) -> String {
        let mut hash: u64 = 0;
        let n = string.len();
        for i in 0..n {
            hash = hash.wrapping_mul(31).wrapping_add(i as u64);
        }
        crate::utils::format::hash_to_hex_string(env, hash)
    }
}
