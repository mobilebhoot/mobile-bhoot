// Database models for Full Filesystem Scan using SQLite storage
// Since Expo doesn't include Room DB, we'll use expo-sqlite with similar patterns

export const createFilesystemScanTables = `
  -- Main scan sessions table
  CREATE TABLE IF NOT EXISTS scan_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    status TEXT NOT NULL DEFAULT 'running', -- running, completed, paused, failed
    total_files INTEGER DEFAULT 0,
    scanned_files INTEGER DEFAULT 0,
    threats_found INTEGER DEFAULT 0,
    last_checkpoint TEXT, -- JSON string of last scan position
    scan_type TEXT NOT NULL DEFAULT 'full', -- full, quick, targeted
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  -- File scan results table
  CREATE TABLE IF NOT EXISTS file_scan_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    sha256_hash TEXT,
    scan_time INTEGER NOT NULL,
    threat_level TEXT NOT NULL DEFAULT 'clean', -- clean, suspicious, malicious, quarantined
    threats_detected TEXT, -- JSON array of detected threats
    reputation_score INTEGER DEFAULT 0, -- 0-100 reputation score
    yara_matches TEXT, -- JSON array of YARA rule matches
    metadata TEXT, -- JSON object for additional file metadata
    action_taken TEXT, -- none, quarantine, delete, report
    is_archive BOOLEAN DEFAULT 0,
    archive_contents TEXT, -- JSON array if it's an archive
    FOREIGN KEY (session_id) REFERENCES scan_sessions (session_id)
  );

  -- Scan checkpoints for incremental resume
  CREATE TABLE IF NOT EXISTS scan_checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    checkpoint_type TEXT NOT NULL, -- mediastore, saf, directory
    last_uri TEXT, -- Last processed URI/path
    last_id INTEGER, -- Last MediaStore ID processed
    files_processed INTEGER DEFAULT 0,
    checkpoint_data TEXT, -- JSON with additional checkpoint info
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (session_id) REFERENCES scan_sessions (session_id)
  );

  -- YARA-style signature rules
  CREATE TABLE IF NOT EXISTS signature_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT UNIQUE NOT NULL,
    rule_category TEXT NOT NULL, -- malware, adware, pua, suspicious
    rule_severity TEXT NOT NULL, -- low, medium, high, critical
    file_patterns TEXT, -- JSON array of file name patterns
    hex_signatures TEXT, -- JSON array of hex signature patterns
    string_patterns TEXT, -- JSON array of string patterns
    file_size_min INTEGER,
    file_size_max INTEGER,
    file_types TEXT, -- JSON array of applicable file types
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  -- File reputation cache
  CREATE TABLE IF NOT EXISTS file_reputation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sha256_hash TEXT UNIQUE NOT NULL,
    reputation_score INTEGER NOT NULL, -- 0-100
    reputation_source TEXT NOT NULL, -- virustotal, hybrid, local
    threat_names TEXT, -- JSON array of threat names from various engines
    first_seen INTEGER NOT NULL,
    last_updated INTEGER NOT NULL,
    scan_count INTEGER DEFAULT 1,
    expires_at INTEGER, -- Cache expiration timestamp
    metadata TEXT -- JSON with additional reputation data
  );

  -- Quarantine storage for suspicious files
  CREATE TABLE IF NOT EXISTS quarantine_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_path TEXT NOT NULL,
    quarantine_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    quarantine_reason TEXT NOT NULL,
    threat_level TEXT NOT NULL,
    detected_threats TEXT, -- JSON array
    quarantined_at INTEGER NOT NULL,
    can_restore BOOLEAN DEFAULT 1,
    session_id TEXT,
    FOREIGN KEY (session_id) REFERENCES scan_sessions (session_id)
  );

  -- Scan statistics and performance metrics
  CREATE TABLE IF NOT EXISTS scan_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value TEXT NOT NULL, -- JSON value (number, string, object)
    recorded_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (session_id) REFERENCES scan_sessions (session_id)
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_file_scan_results_session ON file_scan_results (session_id);
  CREATE INDEX IF NOT EXISTS idx_file_scan_results_hash ON file_scan_results (sha256_hash);
  CREATE INDEX IF NOT EXISTS idx_file_scan_results_threat ON file_scan_results (threat_level);
  CREATE INDEX IF NOT EXISTS idx_scan_checkpoints_session ON scan_checkpoints (session_id);
  CREATE INDEX IF NOT EXISTS idx_file_reputation_hash ON file_reputation (sha256_hash);
  CREATE INDEX IF NOT EXISTS idx_quarantine_hash ON quarantine_files (sha256_hash);
`;

// Database helper functions
export const ScanDatabaseHelper = {
  // Create a new scan session
  createScanSession: (db, sessionData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO scan_sessions (session_id, start_time, status, scan_type) 
           VALUES (?, ?, ?, ?)`,
          [sessionData.sessionId, sessionData.startTime, sessionData.status, sessionData.scanType],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Update scan session progress
  updateScanSession: (db, sessionId, updates) => {
    return new Promise((resolve, reject) => {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(Date.now(), sessionId);

      db.transaction(tx => {
        tx.executeSql(
          `UPDATE scan_sessions SET ${fields}, updated_at = ? WHERE session_id = ?`,
          values,
          (_, result) => resolve(result.rowsAffected),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Save scan checkpoint
  saveCheckpoint: (db, checkpointData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO scan_checkpoints 
           (session_id, checkpoint_type, last_uri, last_id, files_processed, checkpoint_data) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            checkpointData.sessionId,
            checkpointData.checkpointType,
            checkpointData.lastUri,
            checkpointData.lastId,
            checkpointData.filesProcessed,
            JSON.stringify(checkpointData.data || {})
          ],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get last checkpoint for session
  getLastCheckpoint: (db, sessionId, checkpointType) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM scan_checkpoints 
           WHERE session_id = ? AND checkpoint_type = ? 
           ORDER BY created_at DESC LIMIT 1`,
          [sessionId, checkpointType],
          (_, result) => {
            const checkpoint = result.rows.length > 0 ? result.rows.item(0) : null;
            if (checkpoint && checkpoint.checkpoint_data) {
              checkpoint.data = JSON.parse(checkpoint.checkpoint_data);
            }
            resolve(checkpoint);
          },
          (_, error) => reject(error)
        );
      });
    });
  },

  // Save file scan result
  saveFileScanResult: (db, fileResult) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO file_scan_results 
           (session_id, file_path, file_name, file_size, file_type, mime_type, sha256_hash, 
            scan_time, threat_level, threats_detected, reputation_score, yara_matches, 
            metadata, action_taken, is_archive, archive_contents) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fileResult.sessionId,
            fileResult.filePath,
            fileResult.fileName,
            fileResult.fileSize,
            fileResult.fileType,
            fileResult.mimeType,
            fileResult.sha256Hash,
            fileResult.scanTime,
            fileResult.threatLevel,
            JSON.stringify(fileResult.threatsDetected || []),
            fileResult.reputationScore,
            JSON.stringify(fileResult.yaraMatches || []),
            JSON.stringify(fileResult.metadata || {}),
            fileResult.actionTaken,
            fileResult.isArchive ? 1 : 0,
            JSON.stringify(fileResult.archiveContents || [])
          ],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get file reputation from cache
  getFileReputation: (db, sha256Hash) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM file_reputation 
           WHERE sha256_hash = ? AND (expires_at IS NULL OR expires_at > ?)`,
          [sha256Hash, Date.now()],
          (_, result) => {
            const reputation = result.rows.length > 0 ? result.rows.item(0) : null;
            if (reputation && reputation.threat_names) {
              reputation.threatNames = JSON.parse(reputation.threat_names);
            }
            if (reputation && reputation.metadata) {
              reputation.reputationMetadata = JSON.parse(reputation.metadata);
            }
            resolve(reputation);
          },
          (_, error) => reject(error)
        );
      });
    });
  },

  // Save file reputation to cache
  saveFileReputation: (db, reputationData) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO file_reputation 
           (sha256_hash, reputation_score, reputation_source, threat_names, 
            first_seen, last_updated, scan_count, expires_at, metadata) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            reputationData.sha256Hash,
            reputationData.reputationScore,
            reputationData.reputationSource,
            JSON.stringify(reputationData.threatNames || []),
            reputationData.firstSeen,
            reputationData.lastUpdated,
            reputationData.scanCount,
            reputationData.expiresAt,
            JSON.stringify(reputationData.metadata || {})
          ],
          (_, result) => resolve(result.insertId),
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get scan statistics
  getScanStatistics: (db, sessionId) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT 
             COUNT(*) as total_files,
             COUNT(CASE WHEN threat_level != 'clean' THEN 1 END) as threats_found,
             COUNT(CASE WHEN threat_level = 'malicious' THEN 1 END) as malicious_files,
             COUNT(CASE WHEN threat_level = 'suspicious' THEN 1 END) as suspicious_files,
             AVG(reputation_score) as avg_reputation,
             SUM(file_size) as total_size_scanned
           FROM file_scan_results 
           WHERE session_id = ?`,
          [sessionId],
          (_, result) => {
            resolve(result.rows.item(0));
          },
          (_, error) => reject(error)
        );
      });
    });
  },

  // Get YARA signature rules
  getActiveSignatureRules: (db) => {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM signature_rules WHERE is_active = 1 ORDER BY rule_severity DESC`,
          [],
          (_, result) => {
            const rules = [];
            for (let i = 0; i < result.rows.length; i++) {
              const rule = result.rows.item(i);
              rule.filePatterns = JSON.parse(rule.file_patterns || '[]');
              rule.hexSignatures = JSON.parse(rule.hex_signatures || '[]');
              rule.stringPatterns = JSON.parse(rule.string_patterns || '[]');
              rule.fileTypes = JSON.parse(rule.file_types || '[]');
              rules.push(rule);
            }
            resolve(rules);
          },
          (_, error) => reject(error)
        );
      });
    });
  }
};

export default {
  createFilesystemScanTables,
  ScanDatabaseHelper
};
