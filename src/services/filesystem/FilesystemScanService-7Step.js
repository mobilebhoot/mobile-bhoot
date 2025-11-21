// Add this method to FilesystemScanService.js after the existing scan methods

/**
 * Execute the exact 7-step comprehensive filesystem scan
 * This is the main entry point for the complete security scan flow
 */
async startSevenStepScan(options = {}) {
  if (!this.isInitialized) {
    throw new Error('FilesystemScanService not initialized');
  }

  console.log('🛡️ Starting 7-Step Comprehensive Security Scan...');
  console.log('📋 Scan Flow:');
  console.log('   1. Enumerate files (MediaStore + SAF)');
  console.log('   2. Type/size validation');
  console.log('   3. Archive unpacking (if applicable)'); 
  console.log('   4. Hash computation (SHA-256)');
  console.log('   5. YARA/signature match');
  console.log('   6. Reputation lookup');
  console.log('   7. Action and logging');

  try {
    const result = await this.sevenStepScanFlow.executeSevenStepScan(options);
    
    // Update global statistics
    this.stats.totalScans++;
    this.stats.totalFilesScanned += result.stats.filesEnumerated;
    this.stats.totalThreatsFound += result.stats.threatsFound;
    this.stats.lastScanTime = Date.now();
    await this.saveStatistics();

    // Store scan in history
    this.scanHistory.unshift({
      ...result,
      scanType: '7-step-comprehensive',
      timestamp: Date.now()
    });
    
    if (this.scanHistory.length > 10) {
      this.scanHistory = this.scanHistory.slice(0, 10);
    }

    console.log('✅ 7-Step Comprehensive Security Scan Complete!');
    return result;

  } catch (error) {
    console.error('❌ 7-Step Security Scan Failed:', error);
    throw error;
  }
}

/**
 * Get real-time scan progress for the 7-step flow
 */
getSevenStepScanProgress() {
  return this.sevenStepScanFlow.getStatistics();
}

/**
 * Stop the current 7-step scan
 */
async stopSevenStepScan() {
  if (this.sevenStepScanFlow && this.sevenStepScanFlow.currentScan) {
    console.log('⏹️ Stopping 7-step security scan...');
    
    // Mark as cancelled in database if available
    if (this.db && this.sevenStepScanFlow.currentScan.sessionId) {
      try {
        await this.db.runAsync(
          'UPDATE scan_sessions SET status = ?, end_time = ? WHERE session_id = ?',
          ['cancelled', Date.now(), this.sevenStepScanFlow.currentScan.sessionId]
        );
      } catch (error) {
        console.warn('Failed to update scan status:', error.message);
      }
    }
    
    this.sevenStepScanFlow.currentScan.status = 'cancelled';
    return { stopped: true, sessionId: this.sevenStepScanFlow.currentScan.sessionId };
  }
  
  return { stopped: false, reason: 'No active scan' };
}

