// iOS Device Check module (placeholder for Android focus)

export const performDeviceCheck = async () => {
  // iOS-specific, minimal implementation for Android focus
  return {
    timestamp: new Date().toISOString(),
    deviceCheck: 'NOT_APPLICABLE',
    verdict: 'SKIP',
  };
};

export const getAttestationInfo = () => {
  return {
    name: 'iOS Device Check',
    description: 'iOS-specific device attestation (not used on Android)',
    version: '1.0.0',
    supportedPlatforms: ['ios'],
    lastUpdated: '2024-01-15',
  };
}; 