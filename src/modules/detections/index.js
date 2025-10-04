// Main detection module that coordinates all security detection functions

import { detectRoot } from './detectRoot';
import { detectJailbreak } from './detectJailbreak';
import { detectCertificateIssues } from './detectCertificateIssues';
import { detectInsecureWifi } from './detectInsecureWifi';

export const performSecurityScan = async () => {
  const scanResults = {
    timestamp: new Date().toISOString(),
    vulnerabilities: [],
    threats: [],
    deviceHealth: {},
    scanDuration: 0,
  };

  const startTime = Date.now();

  try {
    // Run all detection modules in parallel
    const [
      rootResults,
      jailbreakResults,
      certificateResults,
      wifiResults,
    ] = await Promise.all([
      detectRoot(),
      detectJailbreak(),
      detectCertificateIssues(),
      detectInsecureWifi(),
    ]);

    // Combine results
    scanResults.vulnerabilities = [
      ...rootResults.vulnerabilities,
      ...jailbreakResults.vulnerabilities,
      ...certificateResults.vulnerabilities,
      ...wifiResults.vulnerabilities,
    ];

    scanResults.threats = [
      ...rootResults.threats,
      ...jailbreakResults.threats,
      ...certificateResults.threats,
      ...wifiResults.threats,
    ];

    // Merge device health data
    scanResults.deviceHealth = {
      ...rootResults.deviceHealth,
      ...jailbreakResults.deviceHealth,
      ...certificateResults.deviceHealth,
      ...wifiResults.deviceHealth,
    };

    scanResults.scanDuration = Date.now() - startTime;

    return scanResults;
  } catch (error) {
    console.error('Security scan failed:', error);
    scanResults.scanDuration = Date.now() - startTime;
    scanResults.error = error.message;
    return scanResults;
  }
};

export const getDetectionModules = () => {
  return {
    root: detectRoot,
    jailbreak: detectJailbreak,
    certificate: detectCertificateIssues,
    wifi: detectInsecureWifi,
  };
};

export const runSpecificDetection = async (moduleName) => {
  const modules = getDetectionModules();
  
  if (!modules[moduleName]) {
    throw new Error(`Unknown detection module: ${moduleName}`);
  }

  return await modules[moduleName]();
};

export const getDetectionStatus = () => {
  return {
    rootDetection: 'active',
    jailbreakDetection: 'active',
    certificateDetection: 'active',
    wifiDetection: 'active',
    lastScan: new Date().toISOString(),
    scanCount: Math.floor(Math.random() * 100) + 1,
  };
}; 