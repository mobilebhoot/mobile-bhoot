# Mobile Malware Scanner — Feature & Implementation Specification

## Summary

This document defines the **feature set**, **architecture**, and **implementation plan** for an Android app that scans on-device and incoming files (from Bluetooth, WhatsApp, browsers, etc.). It details functional requirements, Android storage policies, architectural components, scanning pipeline, cloud integrations (VirusTotal, Shodan, URL classifiers), privacy design, and a phased roadmap.

> **Important Platform Notes**
>
> - **Scoped Storage Enforcement:** Android restricts unrestricted file access. The `MANAGE_EXTERNAL_STORAGE` permission is reserved for core apps (antivirus/file managers) and must include policy justification and UX transparency.
> - **VirusTotal API:** The public API is rate-limited and not production-grade. Implement caching, rate limiting, and use a private/premium API key or backend proxy for production.

---

## 1. Goals and Non-Goals

### Goals

- Full-device on-demand scanning (user-triggered) across accessible storage (Downloads, Media, Documents).
- Real-time scanning of new files from Bluetooth, browsers, and messaging apps.
- Deep-scan capability: recursively unpack archives (.zip/.tar/.7z) and scan contents.
- APK and executable inspection (hash, signature, permissions, heuristic scoring).
- Lightweight operation: low memory footprint, incremental scans, and background scheduling.
- User remediation: quarantine, delete, or upload suspicious files for cloud analysis.
- Cloud enrichment: VirusTotal, Shodan, and URLhaus integration.

### Non-Goals

- On-device malware sandboxing or dynamic execution.
- Maintaining full antivirus databases locally (use hybrid local + cloud model).

---

## 2. Feature Breakdown

### 2.1 Full Filesystem Scan

- Scans all accessible files via MediaStore and SAF.
- Scoped storage compliance: use targeted permissions or justified all-files access.
- Incremental resume via Room DB cursor checkpoints.

**Scan Flow:**

1. Enumerate files.
2. Type/size validation.
3. Archive unpacking (if applicable).
4. Hash computation (SHA-256).
5. YARA/signature match.
6. Reputation lookup.
7. Action and logging.

### 2.2 Real-Time File Scanning

- Use `FileObserver` and `ContentObserver` for media and directory changes.
- Use `BroadcastReceiver` for `ACTION_DOWNLOAD_COMPLETE` events.
- Queue scan tasks via `WorkManager`.

### 2.3 Archive Handling

- Supports `.zip`, `.tar`, `.7z`, `.tgz` formats.
- Sandbox extraction, recursive scan, and composite hash calculation.
- Option to repackage quarantined items as encrypted evidence containers.

### 2.4 APK Scanning

- Treat APKs as ZIPs; extract manifest and DEX data.
- For installed apps: verify signatures, hashes, and permissions.
- Detect suspicious permissions, exported components, or embedded libs.

### 2.5 Executable Detection

- Identify via file magic bytes, not extensions.
- Detect ELF, PE, shell scripts, binaries, or embedded APKs.
- Combine with URL reputation analysis.

### 2.6 Hashing & Reputation

- Compute SHA-256 (primary), optionally MD5/SHA-1.
- Cache lookups locally with TTL and exponential backoff.
- Delegate VirusTotal/Shodan calls to backend proxy for key protection.

### 2.7 Heuristics and Signatures

- Lightweight YARA integration for trojans and obfuscation patterns.
- Static rules for suspicious strings, URLs, permissions, or native code presence.
- Optional TensorFlow Lite classifier for local inference.

### 2.8 Quarantine & Remediation

- Encrypted quarantine folder (AES-GCM) with audit logging (path, hash, action, timestamp).
- User actions: delete, quarantine, upload, or ignore.

### 2.9 Privacy & Consent

- Cloud lookups require user consent.
- Uploads limited to file hashes unless explicitly enabled.
- Clear privacy controls and minimal telemetry.

### 2.10 UX & Notifications

- Severity-based alerts and detection logs.
- Scan history with remediation actions.
- Auto-defer scanning on low battery or memory thresholds.

---

## 3. High-Level Architecture

```mermaid
flowchart LR
  subgraph Device
    UI[Mobile UI / Scan Controls]
    Watchers[FileObservers / MediaStore Observers / Receivers]
    Worker[WorkManager Job Queue]
    Engine[Scan Engine (Kotlin ↔ NDK)]
    CacheDB[Room DB: Cache + Audit]
    Quarantine[Encrypted Storage]
  end

  subgraph Cloud
    Proxy[API Proxy / Cache / Rate Limiter]
    VT[VirusTotal / Reputation API]
    SH[Shodan / URLhaus]
    Sandbox[Optional Cloud Sandbox]
  end

  Watchers -->|File event| Worker
  UI -->|Start/Stop| Worker
  Worker --> Engine
  Engine --> CacheDB
  Engine --> Quarantine
  Engine -->|Hash + Metadata| Proxy
  Proxy --> VT
  Proxy --> SH
  SH --> Sandbox
  Sandbox --> Proxy
  Proxy --> Engine
```

---

## 4. Implementation Details

### 4.1 Watchers

- Combine `ContentObserver` (for media) and `FileObserver` (for folders).
- SAF folder picker for apps like WhatsApp/Telegram.
- Process via `WorkManager` to ensure reliability.

### 4.2 Scanning Engine

- Stream-based (64KB buffer) to prevent memory overload.
- Use native NDK modules for heavy tasks (YARA, decompression, hashing).
- Skip >100MB local scans; route to cloud analysis.

### 4.3 Cloud Proxy

- Never expose API keys in-app.
- Backend manages auth, rate-limiting, caching, enrichment, and queuing.

### 4.4 Quarantine

- Use Android Keystore-backed AES key.
- Encrypted evidence storage with export option (user consent required).

### 4.5 Battery & Memory

- Use `WorkManager` constraints (charging + Wi-Fi preferred).
- Limit concurrency and handle backpressure gracefully.

---

## 5. Permissions & Compliance

| Permission                                 | Purpose                                          |
| ------------------------------------------ | ------------------------------------------------ |
| `READ_MEDIA_*`                             | Scoped media access (Android 13+)                |
| `WRITE_EXTERNAL_STORAGE`                   | Legacy access (minimize use)                     |
| `FOREGROUND_SERVICE`, `POST_NOTIFICATIONS` | Scan services and alerts                         |
| `MANAGE_EXTERNAL_STORAGE`                  | Full access (Play policy justification required) |

### Privacy Requirements

- Explicit consent before cloud usage.
- Toggle telemetry and cloud options in settings.
- Provide a transparent in-app privacy page.

---

## 6. Threat Model

| Threat                     | Mitigation                          |
| -------------------------- | ----------------------------------- |
| Malware in nested archives | Recursive unpack + YARA             |
| Encrypted payloads         | Heuristic + permission analysis     |
| Rooted devices / tampering | Integrity and context checks        |
| API key leaks              | Proxy-only communication            |
| Data exposure              | Keystore encryption + consent model |

---

## 7. Detection Model

| Signal            | Weight     | Source                  |
| ----------------- | ---------- | ----------------------- |
| Local signature   | High       | YARA or known hash      |
| Heuristic rules   | Medium     | Strings, permissions    |
| Cloud reputation  | High       | VirusTotal lookup       |
| Domain enrichment | Medium     | URLhaus/Shodan          |
| Device posture    | Contextual | Rooted/jailbroken check |

---

## 8. Testing and QA

- **Unit Tests:** Hashing, archive parsing, YARA pattern validation.
- **Integration:** Observer reliability across Android versions.
- **Performance:** CPU, RAM, and power profiling.
- **Security:** Native memory safety and error handling.
- **Fuzzing:** Archive parser resilience to malformed inputs.

---

## 9. Example Kotlin Flow

```kotlin
fun onFileEvent(uri: Uri) {
    WorkManager.enqueue(ScanWorker.buildWork(uri))
}

class ScanWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val fileUri = Uri.parse(inputData.getString("fileUri") ?: return Result.failure())
        contentResolver.openInputStream(fileUri)?.use { stream ->
            val sha256 = computeSHA256(stream)
            val cached = localCache.get(sha256)
            if (cached != null) return handleResult(cached)
            val result = scanFile(fileUri)
            localCache.put(sha256, result)
            if (result.severity >= Severity.HIGH) quarantineFile(fileUri)
            notifyUser(result)
        }
        return Result.success()
    }
}
```

---

## 10. Backend Recommendations

- Build an authenticated **API Proxy** that:
  - Caches results and batches lookups.
  - Manages per-device limits.
  - Supports async enrichment and sandboxing.
- Maintain a small **signature DB** (local + delta updates).

---

## 11. Roadmap

| Phase | Duration    | Deliverables                                        |
| ----- | ----------- | --------------------------------------------------- |
| MVP   | 4–6 weeks   | File observers, YARA scan, quarantine, local cache  |
| v1    | 6–12 weeks  | APK scanning, backend integration, UX improvements  |
| v2    | 12–20 weeks | Native YARA, ML model, nested archives, MDM support |

---

## 12. Repository Layout

```
/docs/feature-mobile-scanner.md
/app/src/main/java/.../scan/
/app/src/main/cpp/
/backend/api/
/signatures/
/tests/integration/
/scripts/build-signatures.sh
```

---

## 13. References

- Android Scoped Storage documentation
- Google Play “All Files Access” Policy
- VirusTotal API documentation
- Android FileObserver / ContentObserver developer guides

---

## Appendix A: Developer Checklist

- [ ] Choose access model: Scoped + SAF vs All Files.
- [ ] Implement dual observer model.
- [ ] Integrate native YARA.
- [ ] Add streaming SHA-256 and cache.
- [ ] Backend proxy with caching and rate limits.
- [ ] Encrypt quarantine via Keystore.
- [ ] Add consent-based telemetry.
- [ ] Prepare Play Store submission policy text.

---

## Appendix B: Useful Links

- Android Scoped Storage Overview
- Play Policy: `MANAGE_EXTERNAL_STORAGE`
- VirusTotal Premium API Guide
- FileObserver and ContentObserver best practices
