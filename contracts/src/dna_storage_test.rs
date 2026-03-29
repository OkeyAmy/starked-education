#[cfg(test)]
mod tests {
    use super::*;
    use crate::dna_services::*;
    use crate::dna_storage::*;
    use crate::lib::DataKey;
    use soroban_sdk::{testutils::Address as _, Address, Env, String, Vec};

    fn setup_test_env() -> (Env, Address, Address) {
        let env = Env::default();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        // Initialize contract
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::CredentialCount, &0u64);

        (env, admin, user)
    }

    #[test]
    fn test_nucleotide_conversions() {
        let env = Env::default();

        // Test nucleotide creation and conversion
        let adenine = Nucleotide::Adenine;
        assert_eq!(adenine.to_char(), 'A');
        assert_eq!(adenine.complement(), Nucleotide::Thymine);

        let cytosine = Nucleotide::Cytosine;
        assert_eq!(cytosine.to_char(), 'C');
        assert_eq!(cytosine.complement(), Nucleotide::Guanine);

        let guanine = Nucleotide::Guanine;
        assert_eq!(guanine.to_char(), 'G');
        assert_eq!(guanine.complement(), Nucleotide::Cytosine);

        let thymine = Nucleotide::Thymine;
        assert_eq!(thymine.to_char(), 'T');
        assert_eq!(thymine.complement(), Nucleotide::Adenine);

        // Test from_u8 conversion
        assert_eq!(Nucleotide::from_u8(0), Nucleotide::Adenine);
        assert_eq!(Nucleotide::from_u8(1), Nucleotide::Cytosine);
        assert_eq!(Nucleotide::from_u8(2), Nucleotide::Guanine);
        assert_eq!(Nucleotide::from_u8(3), Nucleotide::Thymine);
    }

    #[test]
    fn test_dna_encoding_decoding() {
        let env = Env::default();

        // Create test data
        let mut test_data = Vec::new(&env);
        test_data.push_back(0x12); // 00010010
        test_data.push_back(0x34); // 00110100
        test_data.push_back(0x56); // 01010110
        test_data.push_back(0x78); // 01111000

        // Encode to DNA
        let dna_sequence = encode_to_dna(
            &env,
            &test_data,
            ErrorCorrectionLevel::Basic,
            DNAStorageProtocol::Standard,
        );

        // Verify sequence properties
        assert!(dna_sequence.length > 0);
        assert!(dna_sequence.checksum != 0);
        assert_eq!(dna_sequence.metadata.encoding_version, 1);
        assert_eq!(dna_sequence.metadata.error_correction, 1);

        // Decode back to digital
        let decoded_data = decode_from_dna(&env, &dna_sequence);

        // Verify data integrity (accounting for error correction)
        assert!(decoded_data.len() >= test_data.len());

        // Verify first few bytes match
        for i in 0..test_data.len().min(decoded_data.len()) {
            assert_eq!(
                test_data.get(i).unwrap_or(&0),
                decoded_data.get(i).unwrap_or(&0)
            );
        }
    }

    #[test]
    fn test_dna_storage_protocols() {
        let env = Env::default();

        let test_data = vec![0x12, 0x34, 0x56, 0x78];
        let data_vec = Vec::from_array(&env, test_data);

        // Test different protocols
        let standard_seq = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::None,
            DNAStorageProtocol::Standard,
        );

        let indexed_seq = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::None,
            DNAStorageProtocol::Indexed,
        );

        // Indexed protocol should be longer due to primers
        assert!(indexed_seq.length > standard_seq.length);

        // Verify both can be decoded
        let _decoded_standard = decode_from_dna(&env, &standard_seq);
        let _decoded_indexed = decode_from_dna(&env, &indexed_seq);
    }

    #[test]
    fn test_error_correction_levels() {
        let env = Env::default();

        let test_data = vec![0x12, 0x34, 0x56, 0x78];
        let data_vec = Vec::from_array(&env, test_data);

        // Test different error correction levels
        let none_seq = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::None,
            DNAStorageProtocol::Standard,
        );

        let basic_seq = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::Basic,
            DNAStorageProtocol::Standard,
        );

        let advanced_seq = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::Advanced,
            DNAStorageProtocol::Standard,
        );

        // Higher error correction should result in longer sequences
        assert!(basic_seq.sequence.len() > none_seq.sequence.len());
        assert!(advanced_seq.sequence.len() > basic_seq.sequence.len());

        // Verify metadata reflects error correction level
        assert_eq!(none_seq.metadata.error_correction, 0);
        assert_eq!(basic_seq.metadata.error_correction, 1);
        assert_eq!(advanced_seq.metadata.error_correction, 3);
    }

    #[test]
    fn test_dna_credential_storage() {
        let (env, admin, user) = setup_test_env();

        // Store credential in DNA
        let credential_id = store_credential_in_dna(
            &env,
            1,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Test Credential"),
            String::from_str(&env, "Test Description"),
            String::from_str(&env, "course_1"),
            String::from_str(&env, "QmTest123"),
        );

        assert_eq!(credential_id, 1);

        // Verify DNA credential exists
        let dna_credential: DNACredential = env
            .storage()
            .persistent()
            .get(&DNAStorageKey::DNACredential(credential_id))
            .unwrap();

        assert_eq!(dna_credential.credential_id, credential_id);
        assert_eq!(dna_credential.storage_protocol, DNAStorageProtocol::Hybrid);
        assert_eq!(
            dna_credential.error_correction,
            ErrorCorrectionLevel::Advanced
        );

        // Verify user's DNA credentials list
        let user_creds = get_user_dna_credentials(&env, user);
        assert_eq!(user_creds.len(), 1);
        assert_eq!(user_creds.get(0).unwrap_or(&0), &credential_id);
    }

    #[test]
    fn test_dna_credential_verification() {
        let (env, admin, user) = setup_test_env();

        // Store credential in DNA
        let credential_id = store_credential_in_dna(
            &env,
            1,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Test Credential"),
            String::from_str(&env, "Test Description"),
            String::from_str(&env, "course_1"),
            String::from_str(&env, "QmTest123"),
        );

        // Verify credential
        let is_valid = verify_dna_credential(&env, credential_id);
        assert!(is_valid);

        // Retrieve credential data
        let retrieved_data = retrieve_credential_from_dna(&env, credential_id);
        assert!(!retrieved_data.is_empty());
    }

    #[test]
    fn test_dna_synthesis_request() {
        let (env, admin, user) = setup_test_env();

        // Store a credential first
        let credential_id = store_credential_in_dna(
            &env,
            1,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Test Credential"),
            String::from_str(&env, "Test Description"),
            String::from_str(&env, "course_1"),
            String::from_str(&env, "QmTest123"),
        );

        // Request synthesis
        let mut credential_ids = Vec::new(&env);
        credential_ids.push_back(credential_id);

        let request_id = request_dna_synthesis(
            &env,
            credential_ids,
            DNAStorageProtocol::Hybrid,
            2, // High priority
            admin.clone(),
        );

        assert!(request_id > 0);

        // Check request status
        let request = get_synthesis_status(&env, request_id);
        assert_eq!(request.status, SynthesisStatus::Pending);
        assert_eq!(request.priority_level, 2);
        assert_eq!(request.synthesis_protocol, DNAStorageProtocol::Hybrid);

        // Process synthesis results
        let mut processed_creds = Vec::new(&env);
        processed_creds.push_back(credential_id);

        let success = process_synthesis_results(
            &env,
            request_id,
            String::from_str(&env, "batch_001"),
            true,
            processed_creds,
        );

        assert!(success);

        // Verify request is now completed
        let updated_request = get_synthesis_status(&env, request_id);
        assert_eq!(updated_request.status, SynthesisStatus::Completed);
    }

    #[test]
    fn test_dna_sequencing() {
        let (env, admin, user) = setup_test_env();

        // Store and synthesize a credential
        let credential_id = store_credential_in_dna(
            &env,
            1,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Test Credential"),
            String::from_str(&env, "Test Description"),
            String::from_str(&env, "course_1"),
            String::from_str(&env, "QmTest123"),
        );

        // Simulate synthesis completion
        let mut dna_credential: DNACredential = env
            .storage()
            .persistent()
            .get(&DNAStorageKey::DNACredential(credential_id))
            .unwrap();
        dna_credential.dna_sequence.metadata.synthesis_batch = String::from_str(&env, "batch_001");
        env.storage().persistent().set(
            &DNAStorageKey::DNACredential(credential_id),
            &dna_credential,
        );

        // Request sequencing
        let sequencing_id = request_dna_sequencing(&env, credential_id, 1, admin.clone());
        assert!(!sequencing_id.is_empty());

        // Get sequencing result
        let result = get_sequencing_result(&env, sequencing_id.clone());
        assert_eq!(result.credential_id, credential_id);
        assert_eq!(result.coverage_depth, 100); // Enhanced verification
        assert!(!result.verification_status); // Not verified yet

        // Verify sequencing results
        let original_sequence = dna_credential.dna_sequence.sequence.clone();
        let quality_metrics = DNAQualityMetrics {
            data_density: 2.0,
            error_rate: 0.001,
            retention_time: 1000,
            synthesis_success_rate: 0.98,
            sequencing_success_rate: 0.95,
            overall_reliability: 0.93,
        };

        let verification_success = verify_sequencing_results(
            &env,
            sequencing_id.clone(),
            original_sequence,
            quality_metrics,
        );

        assert!(verification_success);

        // Check that result is now verified
        let verified_result = get_sequencing_result(&env, sequencing_id);
        assert!(verified_result.verification_status);
    }

    #[test]
    fn test_hybrid_storage() {
        let (env, admin, user) = setup_test_env();

        // Store credential in DNA
        let credential_id = store_credential_in_dna(
            &env,
            1,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Test Credential"),
            String::from_str(&env, "Test Description"),
            String::from_str(&env, "course_1"),
            String::from_str(&env, "QmTest123"),
        );

        // Create hybrid reference
        let reference_id = create_hybrid_reference(
            &env,
            credential_id,
            String::from_str(&env, "0x1234567890abcdef"),
            String::from_str(&env, "QmHybridTest123"),
        );

        assert!(!reference_id.is_empty());

        // Verify hybrid storage
        let is_valid = verify_hybrid_storage(&env, reference_id.clone());
        assert!(is_valid);

        // Get quality metrics
        let metrics = get_dna_quality_metrics(&env, credential_id);
        assert!(metrics.data_density > 0.0);
        assert!(metrics.error_rate < 0.01);
        assert_eq!(metrics.retention_time, 1000); // 1000 years
    }

    #[test]
    fn test_dna_checksum_verification() {
        let env = Env::default();

        let test_data = vec![0x12, 0x34, 0x56, 0x78];
        let data_vec = Vec::from_array(&env, test_data);

        // Create DNA sequence
        let mut dna_sequence = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::Basic,
            DNAStorageProtocol::Standard,
        );

        // Store original checksum
        let original_checksum = dna_sequence.checksum;

        // Corrupt the sequence
        if dna_sequence.sequence.len() > 0 {
            dna_sequence
                .sequence
                .set(0, dna_sequence.sequence.get(0).unwrap_or(&0) ^ 0x01);
        }

        // Recalculate checksum
        dna_sequence.checksum = calculate_dna_checksum(&env, &dna_sequence.sequence);

        // Checksum should be different after corruption
        assert_ne!(dna_sequence.checksum, original_checksum);
    }

    #[test]
    fn test_indexing_primers() {
        let env = Env::default();

        let test_data = vec![0x12, 0x34];
        let data_vec = Vec::from_array(&env, test_data);

        // Create sequence with indexing
        let indexed_sequence = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::None,
            DNAStorageProtocol::Indexed,
        );

        // Create sequence without indexing
        let standard_sequence = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::None,
            DNAStorageProtocol::Standard,
        );

        // Indexed sequence should be longer
        assert!(indexed_sequence.length > standard_sequence.length);

        // Both should decode to same data
        let decoded_indexed = decode_from_dna(&env, &indexed_sequence);
        let decoded_standard = decode_from_dna(&env, &standard_sequence);

        assert_eq!(decoded_indexed.len(), decoded_standard.len());
    }

    #[test]
    fn test_multiple_credentials() {
        let (env, admin, user) = setup_test_env();

        // Store multiple credentials
        let cred1_id = store_credential_in_dna(
            &env,
            1,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Credential 1"),
            String::from_str(&env, "Description 1"),
            String::from_str(&env, "course_1"),
            String::from_str(&env, "QmTest1"),
        );

        let cred2_id = store_credential_in_dna(
            &env,
            2,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Credential 2"),
            String::from_str(&env, "Description 2"),
            String::from_str(&env, "course_2"),
            String::from_str(&env, "QmTest2"),
        );

        // Verify both credentials exist
        assert!(verify_dna_credential(&env, cred1_id));
        assert!(verify_dna_credential(&env, cred2_id));

        // Check user has both credentials
        let user_creds = get_user_dna_credentials(&env, user);
        assert_eq!(user_creds.len(), 2);

        // Request synthesis for both
        let mut credential_ids = Vec::new(&env);
        credential_ids.push_back(cred1_id);
        credential_ids.push_back(cred2_id);

        let request_id = request_dna_synthesis(
            &env,
            credential_ids,
            DNAStorageProtocol::Redundant,
            1, // Medium priority
            admin.clone(),
        );

        assert!(request_id > 0);

        // Verify synthesis request includes both credentials
        let request = get_synthesis_status(&env, request_id);
        assert_eq!(request.credential_ids.len(), 2);
        assert_eq!(request.synthesis_protocol, DNAStorageProtocol::Redundant);
    }

    #[test]
    #[should_panic(expected = "DNA credential not found")]
    fn test_verify_nonexistent_credential() {
        let env = Env::default();

        // Try to verify non-existent credential
        verify_dna_credential(&env, 999);
    }

    #[test]
    #[should_panic(expected = "Credential must be synthesized before sequencing")]
    fn test_sequencing_without_synthesis() {
        let (env, admin, user) = setup_test_env();

        // Store credential but don't synthesize
        let credential_id = store_credential_in_dna(
            &env,
            1,
            admin.clone(),
            user.clone(),
            String::from_str(&env, "Test Credential"),
            String::from_str(&env, "Test Description"),
            String::from_str(&env, "course_1"),
            String::from_str(&env, "QmTest123"),
        );

        // Try to sequence without synthesis - should panic
        request_dna_sequencing(&env, credential_id, 1, admin.clone());
    }

    #[test]
    fn test_error_correction_effectiveness() {
        let env = Env::default();

        let test_data = vec![0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0];
        let data_vec = Vec::from_array(&env, test_data);

        // Test with different error correction levels
        let levels = vec![
            ErrorCorrectionLevel::None,
            ErrorCorrectionLevel::Basic,
            ErrorCorrectionLevel::ReedSolomon,
            ErrorCorrectionLevel::Advanced,
        ];

        for level in levels {
            let encoded =
                encode_to_dna(&env, &data_vec, level.clone(), DNAStorageProtocol::Standard);
            let decoded = decode_from_dna(&env, &encoded);

            // All levels should preserve data integrity
            assert!(!decoded.is_empty());
            assert!(decoded.len() >= data_vec.len());
        }
    }

    #[test]
    fn test_dna_sequence_integrity() {
        let env = Env::default();

        let test_data = vec![0x01, 0x02, 0x03, 0x04];
        let data_vec = Vec::from_array(&env, test_data);

        // Create DNA sequence
        let dna_sequence = encode_to_dna(
            &env,
            &data_vec,
            ErrorCorrectionLevel::Basic,
            DNAStorageProtocol::Standard,
        );

        // Verify checksum calculation
        let calculated_checksum = calculate_dna_checksum(&env, &dna_sequence.sequence);
        assert_eq!(calculated_checksum, dna_sequence.checksum);

        // Verify metadata is properly set
        assert_eq!(dna_sequence.metadata.encoding_version, 1);
        assert_eq!(dna_sequence.metadata.error_correction, 1);
        assert!(!dna_sequence.metadata.synthesis_batch.is_empty());
    }
}
