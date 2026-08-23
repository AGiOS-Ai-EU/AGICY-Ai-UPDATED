# UPDATED code signing (beta.3+)

This document describes how AGICY prepares signed Windows and notarized macOS builds for the UPDATED desktop app.

## Why sign?

Unsigned Electron apps trigger:

- **Windows SmartScreen** — "Windows protected your PC" until reputation builds
- **macOS Gatekeeper** — "cannot be opened because the developer cannot be verified"

Code signing (and Apple notarization) reduces friction for beta testers and customers.

## Certificates

### Windows (Authenticode)

1. Purchase an **EV code signing certificate** from a Microsoft-trusted CA (DigiCert, Sectigo, SSL.com, etc.).
2. Complete organization validation for **AGICY.Ai** (or the legal entity on the certificate).
3. Export the certificate as `.pfx` for CI (password-protected).
4. Store in GitHub Actions secrets:
   - `WINDOWS_CERT_BASE64` — base64-encoded `.pfx`
   - `WINDOWS_CERT_PASSWORD` — export password

CI maps these to `CSC_LINK`, `WIN_CSC_LINK`, and `CSC_KEY_PASSWORD` for [electron-builder](https://www.electron.build/code-signing).

### macOS (Developer ID + notarization)

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) with the AGICY team.
2. Create a **Developer ID Application** certificate in Xcode or the developer portal.
3. Export as `.p12` for CI.
4. Create an [app-specific password](https://appleid.apple.com) for notarization upload.
5. Store secrets:
   - `APPLE_CERT_BASE64` — base64-encoded `.p12`
   - `APPLE_CERT_PASSWORD` — export password
   - `APPLE_ID` — Apple ID email used for notarization
   - `APPLE_APP_SPECIFIC_PASSWORD`
   - `APPLE_TEAM_ID` — 10-character team id

`apps/electron/electron-builder.yml` sets `mac.notarize: true` when these env vars are present in CI.

## Local unsigned builds

Developers can still build without certificates:

```bash
cd apps/electron
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:win
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm run build:mac
```

## CI workflow

`.github/workflows/beta-release.yml`:

- Detects whether signing secrets exist
- Imports certificates into the runner temp directory
- Runs `pnpm run build:win` / `build:mac` with signing env vars
- Falls back to unsigned artifacts when secrets are missing

## SmartScreen reputation

Even with a valid Authenticode signature, **new certificates** may still show SmartScreen until download volume and reputation accumulate. EV certificates typically gain reputation faster than standard OV certs.

## Rotation

- Rotate `DEVICE_TOKEN_ENCRYPTION_KEY` on agicy-platform separately from code-signing certs.
- When renewing certs, update GitHub secrets before the old cert expires; rebuild and publish a new beta release.
