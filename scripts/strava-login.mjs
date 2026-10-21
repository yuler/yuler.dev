/**
 * Save the Strava login already in the default browser.
 *
 * Usage: pnpm strava:login
 *
 * Opens Strava in the current default browser. You log in there if needed.
 * Only Strava cookies are written to tmp/strava/auth-state.json (gitignored).
 */

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { authFile, tmpDir, TRAINING_URL } from './strava-common.mjs'

const CHROME_HEADER_HASH_LENGTH = 32

const READ_COOKIES = String.raw`
import base64, json, os, sqlite3

def chrome_password():
    try:
        import gi
        gi.require_version("Secret", "1")
        from gi.repository import Secret

        service = Secret.Service.get_sync(Secret.ServiceFlags.LOAD_COLLECTIONS)
        labels = {"Chrome Safe Storage", "Chromium Safe Storage", "Brave Safe Storage", "Microsoft Edge Safe Storage"}
        for col in service.get_collections() or []:
            col.load_items_sync()
            for item in col.get_items() or []:
                if item.get_label() in labels:
                    item.load_secret_sync()
                    secret = item.get_secret()
                    raw = secret.get() if secret else None
                    if raw:
                        return bytes(raw)
    except Exception:
        pass
    # Default fallback used by Chromium on Linux when Secret Service is unavailable
    return b"peanuts"

def profiles():
    candidate_bases = [
        "~/.config/google-chrome",
        "~/.config/chromium",
        "~/.config/BraveSoftware/Brave-Browser",
        "~/.config/microsoft-edge",
    ]
    found = []
    for candidate in candidate_bases:
        base = os.path.expanduser(candidate)
        if not os.path.isdir(base):
            continue
        for name in os.listdir(base):
            db = os.path.join(base, name, "Cookies")
            if os.path.isfile(db):
                found.append(db)
    return found

cookies = []
for db in profiles():
    try:
        con = sqlite3.connect("file:%s?mode=ro" % db, uri=True)
        rows = con.execute(
            """
            select host_key, name, encrypted_value, path, expires_utc, is_secure, is_httponly, samesite, has_expires
            from cookies
            where host_key like '%strava.com'
            """
        )
        for host, name, blob, cookie_path, expires_utc, secure, http_only, site, has_expires in rows:
            if not blob:
                continue
            cookies.append({
                "name": name,
                "encrypted": base64.b64encode(blob).decode("ascii"),
                "domain": host,
                "path": cookie_path or "/",
                "expires": -1 if not has_expires else int(expires_utc / 1_000_000 - 11644473600),
                "httpOnly": bool(http_only),
                "secure": bool(secure),
                "sameSite": site,
            })
        con.close()
    except Exception:
        continue

print(json.dumps({
    "password": base64.b64encode(chrome_password()).decode("ascii"),
    "cookies": cookies,
}))
`

function waitForEnter(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close()
      resolve()
    })
  })
}

function openInDefaultBrowser(url) {
  return new Promise((resolve, reject) => {
    const child = spawn('xdg-open', [url], { stdio: 'ignore', detached: true })
    child.on('error', reject)
    child.unref()
    child.on('spawn', resolve)
  })
}

/**
 * Decrypts a Chromium-encrypted cookie on Linux.
 * Format: 'v10' or 'v11' prefix + AES-128-CBC encrypted payload (IV = 16 spaces).
 * Payload may start with a 32-byte hash header in newer Chrome versions.
 */
function decryptCookie(blob, key) {
  const prefix = blob.subarray(0, 3).toString('utf8')
  if (prefix !== 'v10' && prefix !== 'v11')
    return null

  const decipher = crypto.createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, 0x20))
  decipher.setAutoPadding(false)
  const decryptedWithPadding = Buffer.concat([decipher.update(blob.subarray(3)), decipher.final()])

  const paddingBytes = decryptedWithPadding[decryptedWithPadding.length - 1]
  if (paddingBytes < 1 || paddingBytes > 16 || !decryptedWithPadding.subarray(-paddingBytes).every(byte => byte === paddingBytes))
    return null

  const decryptedPayload = decryptedWithPadding.subarray(0, decryptedWithPadding.length - paddingBytes)
  // Strip 32-byte signature/hash header if present
  const cookieValueBuffer = decryptedPayload.length > CHROME_HEADER_HASH_LENGTH
    ? decryptedPayload.subarray(CHROME_HEADER_HASH_LENGTH)
    : decryptedPayload

  const cookieValue = cookieValueBuffer.toString('utf8')
  if (Buffer.from(cookieValue, 'utf8').length !== cookieValueBuffer.length)
    return null

  return cookieValue
}

function sameSite(value, secure) {
  const name = { 0: 'None', 1: 'Lax', 2: 'Strict' }[value] ?? 'Lax'
  if (name === 'None' && !secure)
    return 'Lax'
  return name
}

export function readStravaCookies() {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', ['-c', READ_COOKIES], { stdio: ['ignore', 'pipe', 'pipe'] })
    const stdout = []
    const stderr = []
    child.stdout.on('data', chunk => stdout.push(chunk))
    child.stderr.on('data', chunk => stderr.push(chunk))
    child.on('error', (err) => {
      reject(new Error(`Failed to execute python3: ${err.message}. Ensure python3 is installed.`))
    })
    child.on('close', (code) => {
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString('utf8').trim()
        reject(new Error(detail || 'Could not read the Strava login from the default browser. Ensure Python 3 with libsecret (python3-gi) is installed.'))
        return
      }
      const payload = JSON.parse(Buffer.concat(stdout).toString('utf8'))
      const key = crypto.pbkdf2Sync(Buffer.from(payload.password, 'base64'), 'saltysalt', 1, 16, 'sha1')
      const cookies = []
      for (const cookie of payload.cookies) {
        const value = decryptCookie(Buffer.from(cookie.encrypted, 'base64'), key)
        if (!value)
          continue
        cookies.push({
          name: cookie.name,
          value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expires,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: sameSite(cookie.sameSite, cookie.secure),
        })
      }
      resolve(cookies)
    })
  })
}

async function loginAndSaveSession() {
  fs.mkdirSync(tmpDir, { recursive: true })
  await openInDefaultBrowser(TRAINING_URL)
  console.log('Opened Strava in the default browser. Log in there if you are not already, then come back here.')
  await waitForEnter('\nPress Enter once Strava is visible... ')
  const cookies = await readStravaCookies()
  const session = cookies.find(cookie => cookie.name === '_strava4_session')
  if (!session) {
    throw new Error('No Strava login in the default browser. Log in on that page, then run pnpm strava:login again.')
  }
  fs.writeFileSync(authFile, `${JSON.stringify({ cookies, origins: [] }, null, 2)}\n`)
  console.log(`Saved session to ${authFile}`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  loginAndSaveSession().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
