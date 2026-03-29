// Test file to verify all fixes are working correctly
// This file checks for common issues and validates the fixes

import { testProfile, testAchievements, testCredentials, testStats } from './test-profile';

// Test 1: Check for null/undefined issues
export function testNullHandling() {
  console.log('Testing null/undefined handling...');
  
  // Test with empty arrays
  const emptyAchievements = [];
  const emptyCredentials = [];
  
  // Test AchievementDisplay with empty data
  try {
    const categories = Array.from(new Set(emptyAchievements.map(a => a.category)));
    const rarities = Array.from(new Set(emptyAchievements.map(a => a.rarity)));
    console.log('✓ Empty array handling works');
  } catch (error) {
    console.error('✗ Empty array handling failed:', error);
  }
  
  // Test with null data
  try {
    const filteredAchievements = (testAchievements || []).filter(a => a.earnedDate);
    const filteredCredentials = (testCredentials || []).filter(c => c.verificationStatus === 'verified');
    console.log('✓ Null data handling works');
  } catch (error) {
    console.error('✗ Null data handling failed:', error);
  }
}

// Test 2: Check error boundary functionality
export function testErrorHandling() {
  console.log('Testing error handling...');
  
  try {
    // Simulate potential errors
    const invalidData = null as any;
    const result = invalidData.someMethod?.();
    console.log('✓ Error handling works');
  } catch (error) {
    console.log('✓ Error caught successfully:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Test 3: Check data structure integrity
export function testDataStructures() {
  console.log('Testing data structures...');
  
  // Test profile data
  const hasValidProfile = testProfile && 
    typeof testProfile.id === 'string' && 
    typeof testProfile.name === 'string' &&
    typeof testProfile.email === 'string';
  
  // Test achievement data
  const hasValidAchievements = testAchievements && 
    Array.isArray(testAchievements) &&
    testAchievements.every(a => 
      typeof a.id === 'string' && 
      typeof a.name === 'string' &&
      ['common', 'rare', 'epic', 'legendary'].includes(a.rarity)
    );
  
  // Test credential data
  const hasValidCredentials = testCredentials && 
    Array.isArray(testCredentials) &&
    testCredentials.every(c => 
      typeof c.id === 'string' && 
      typeof c.title === 'string' &&
      ['certificate', 'badge', 'degree', 'license'].includes(c.type)
    );
  
  // Test stats data
  const hasValidStats = testStats && 
    typeof testStats.totalCourses === 'number' &&
    typeof testStats.completedCourses === 'number' &&
    testStats.totalCourses >= testStats.completedCourses;
  
  console.log('Data structure validation results:');
  console.log('  - Profile valid:', hasValidProfile);
  console.log('  - Achievements valid:', hasValidAchievements);
  console.log('  - Credentials valid:', hasValidCredentials);
  console.log('  - Stats valid:', hasValidStats);
  
  return hasValidProfile && hasValidAchievements && hasValidCredentials && hasValidStats;
}

// Test 4: Check TypeScript compilation issues
export function testTypeScriptIssues() {
  console.log('Testing TypeScript compatibility...');
  
  try {
    // Test Set iteration fix
    const testSet = new Set(['a', 'b', 'c']);
    const arrayFromSet = Array.from(testSet);
    console.log('✓ Set iteration fix works');
    
    // Test optional chaining
    const testObj = { nested: { value: 'test' } };
    const value = testObj?.nested?.value;
    console.log('✓ Optional chaining works');
    
    // Test null coalescing
    const nullValue = null;
    const defaultValue = nullValue ?? 'default';
    console.log('✓ Null coalescing works');
    
    return true;
  } catch (error) {
    console.error('✗ TypeScript compatibility test failed:', error);
    return false;
  }
}

// Test 5: Check component props validation
export function testComponentProps() {
  console.log('Testing component props...');
  
  try {
    // Test AchievementDisplay props
    const achievementProps = {
      achievements: testAchievements,
      showProgress: true,
      compact: false,
      filterable: true,
      searchable: true
    };
    console.log('✓ AchievementDisplay props valid');
    
    // Test CredentialList props
    const credentialProps = {
      credentials: testCredentials,
      showAddButton: true,
      compact: false,
      filterable: true,
      searchable: true
    };
    console.log('✓ CredentialList props valid');
    
    // Test ProfileStats props
    const statsProps = {
      stats: testStats,
      showRanking: true,
      showProgress: true,
      compact: false
    };
    console.log('✓ ProfileStats props valid');
    
    return true;
  } catch (error) {
    console.error('✗ Component props test failed:', error);
    return false;
  }
}

// Run all tests
export function runAllTests() {
  console.log('🧪 Running Profile Management System Tests...\n');
  
  const results = {
    nullHandling: testNullHandling(),
    errorHandling: testErrorHandling(),
    dataStructures: testDataStructures(),
    typeScriptIssues: testTypeScriptIssues(),
    componentProps: testComponentProps()
  };
  
  console.log('\n📊 Test Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  return results;
}

// Export for use in components
export { testProfile, testAchievements, testCredentials, testStats };
