const GOOGLE_STORAGE_KEYS = {
  user: 'google_user',
  authTime: 'google_auth_time',
  accessToken: 'google_access_token',
  accessTokenExpiry: 'google_access_token_expiry',
  lastBackup: 'google_last_backup',
  autoBackup: 'google_auto_backup'
} as const

interface GoogleUser {
  email: string
  name: string
  picture: string
}

interface GoogleAuthStatus {
  connected: boolean
  email?: string
  lastBackup?: string
  autoBackup?: boolean
}

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  state?: string
  error?: string
  error_description?: string
}

interface GoogleTokenError {
  type: string
  error: string
  error_description?: string
}

type GooglePrompt = 'none' | 'consent' | 'select_account'

class GoogleAuthError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
    this.name = 'GoogleAuthError'
  }
}

interface GoogleTokenClient {
  callback: (response: GoogleTokenResponse) => void
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GoogleTokenResponse) => void
    error_callback?: (error: GoogleTokenError) => void
    use_fedcm_for_prompt?: boolean
  }) => GoogleTokenClient
  revoke: (accessToken: string, done?: () => void) => void
}

interface GoogleAccounts {
  oauth2: GoogleOAuth2
}

interface GoogleIdentity {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

class GoogleAuthService {
  private google: GoogleIdentity | null = null
  private tokenClient: GoogleTokenClient | null = null
  private accessToken: string | null = null
  private accessTokenExpiry: number | null = null
  private isInitialized = false
  private scriptLoadingPromise: Promise<void> | null = null
  private pendingTokenRequest: {
    resolve: (response: GoogleTokenResponse) => void
    reject: (error: Error) => void
  } | null = null
  private readonly scope = 'openid email profile https://www.googleapis.com/auth/drive.file'

  private handleTokenResponse = (response: GoogleTokenResponse) => {
    if (response.error) {
      this.handleTokenError({ type: 'token_error', error: response.error, error_description: response.error_description })
      return
    }

    this.storeToken(response.access_token, response.expires_in)

    if (this.pendingTokenRequest) {
      this.pendingTokenRequest.resolve(response)
      this.pendingTokenRequest = null
    }
  }

  private handleTokenError = (error: GoogleTokenError) => {
    const code = error.error || error.type
    const message = error.error_description || code || 'Google token request failed'

    if (this.pendingTokenRequest) {
      this.pendingTokenRequest.reject(new GoogleAuthError(message, code))
      this.pendingTokenRequest = null
    } else {
       
      console.warn('Unhandled Google token error', error)
    }
  }

  private storeToken(accessToken: string, expiresInSeconds: number) {
    this.accessToken = accessToken
    const expiry = Date.now() + expiresInSeconds * 1000
    this.accessTokenExpiry = expiry
    localStorage.setItem(GOOGLE_STORAGE_KEYS.accessToken, accessToken)
    localStorage.setItem(GOOGLE_STORAGE_KEYS.accessTokenExpiry, expiry.toString())
    localStorage.setItem(GOOGLE_STORAGE_KEYS.authTime, Date.now().toString())
  }

  private restoreSessionFromStorage() {
    const storedToken = localStorage.getItem(GOOGLE_STORAGE_KEYS.accessToken)
    const storedExpiry = localStorage.getItem(GOOGLE_STORAGE_KEYS.accessTokenExpiry)

    if (storedToken && storedExpiry) {
      const expiry = parseInt(storedExpiry, 10)
      if (!Number.isNaN(expiry) && expiry > Date.now()) {
        this.accessToken = storedToken
        this.accessTokenExpiry = expiry
      } else {
        this.clearToken()
      }
    }
  }

  private clearToken(removeAuthTime = false) {
    this.accessToken = null
    this.accessTokenExpiry = null
    localStorage.removeItem(GOOGLE_STORAGE_KEYS.accessToken)
    localStorage.removeItem(GOOGLE_STORAGE_KEYS.accessTokenExpiry)
    if (removeAuthTime) {
      localStorage.removeItem(GOOGLE_STORAGE_KEYS.authTime)
    }
  }

  private async ensureScriptLoaded() {
    if (typeof window === 'undefined') {
      throw new Error('Google authentication is only available in the browser')
    }

    if (window.google?.accounts?.oauth2) {
      return
    }

    if (!this.scriptLoadingPromise) {
      this.scriptLoadingPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity]')

        if (existingScript) {
          existingScript.addEventListener('load', () => resolve())
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')))
        } else {
          const script = document.createElement('script')
          script.src = 'https://accounts.google.com/gsi/client'
          script.async = true
          script.defer = true
          script.setAttribute('data-google-identity', 'true')
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
          document.head.appendChild(script)
        }
      })
    }

    await this.scriptLoadingPromise

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services failed to initialize')
    }
  }

  private async init() {
    if (this.isInitialized) return

    await this.ensureScriptLoaded()

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      throw new Error('Google Client ID is not configured')
    }

    this.google = window.google || null
    if (!this.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services unavailable')
    }

    this.tokenClient = this.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: this.scope,
      callback: this.handleTokenResponse,
      error_callback: this.handleTokenError,
      use_fedcm_for_prompt: true
    })

    this.restoreSessionFromStorage()
    this.isInitialized = true
  }

  private async requestToken(prompt?: GooglePrompt): Promise<GoogleTokenResponse> {
    await this.init()

    const client = this.tokenClient

    if (!client) {
      throw new Error('Google token client not initialized')
    }

    if (this.pendingTokenRequest) {
      throw new Error('A Google token request is already in progress')
    }

    return new Promise((resolve, reject) => {
      this.pendingTokenRequest = { resolve, reject }

      try {
        client.callback = this.handleTokenResponse
        const requestConfig = prompt ? { prompt } : undefined
        client.requestAccessToken(requestConfig)
      } catch (error) {
        this.pendingTokenRequest = null
        reject(error instanceof Error ? error : new Error('Failed to request Google access token'))
      }
    })
  }

  private async fetchUserProfile(accessToken: string): Promise<GoogleUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Google user profile')
    }

    const data = await response.json()
    const userData: GoogleUser = {
      email: data.email,
      name: data.name ?? data.email,
      picture: data.picture ?? ''
    }

    localStorage.setItem(GOOGLE_STORAGE_KEYS.user, JSON.stringify(userData))
    localStorage.setItem(GOOGLE_STORAGE_KEYS.authTime, Date.now().toString())

    return userData
  }

  async signIn(): Promise<GoogleUser> {
    try {
      const tokenResponse = await this.requestToken('consent')
      return await this.fetchUserProfile(tokenResponse.access_token)
    } catch (error) {
      this.clearToken(true)
      localStorage.removeItem(GOOGLE_STORAGE_KEYS.user)
      throw new Error(this.formatGoogleError(error, 'Failed to sign in with Google'))
    }
  }

  async signOut() {
    await this.init()

    const token = this.accessToken || localStorage.getItem(GOOGLE_STORAGE_KEYS.accessToken)
    if (token && this.google?.accounts?.oauth2) {
      await new Promise<void>((resolve) => {
        this.google!.accounts.oauth2.revoke(token, () => resolve())
      })
    }

    this.clearToken(true)
    localStorage.removeItem(GOOGLE_STORAGE_KEYS.user)
    localStorage.removeItem(GOOGLE_STORAGE_KEYS.lastBackup)
    localStorage.removeItem(GOOGLE_STORAGE_KEYS.autoBackup)
  }

  private hasValidToken() {
    return !!this.accessTokenExpiry && !!this.accessToken && this.accessTokenExpiry > Date.now() + 60_000
  }

  async getAccessToken(): Promise<string> {
    await this.init()

    if (this.hasValidToken()) {
      return this.accessToken as string
    }

    try {
      const response = await this.requestToken()
      return response.access_token
    } catch (error) {
      if (this.shouldRetryWithConsent(error)) {
        const response = await this.requestToken('consent')
        await this.fetchUserProfile(response.access_token)
        return response.access_token
      }

      this.clearToken(true)
      localStorage.removeItem(GOOGLE_STORAGE_KEYS.user)
      throw new Error(this.formatGoogleError(error, 'Google authorization failed. Please reconnect Google Drive.'))
    }
  }

  isSignedIn(): boolean {
    if (this.hasValidToken()) {
      return true
    }

    const userData = localStorage.getItem(GOOGLE_STORAGE_KEYS.user)
    const authTime = localStorage.getItem(GOOGLE_STORAGE_KEYS.authTime)

    if (!userData || !authTime) return false

    const authDate = new Date(parseInt(authTime, 10))
    if (Number.isNaN(authDate.getTime())) return false

    const hoursDiff = (Date.now() - authDate.getTime()) / (1000 * 60 * 60)
    return hoursDiff < 24
  }

  getUser(): GoogleUser | null {
    const userData = localStorage.getItem(GOOGLE_STORAGE_KEYS.user)
    return userData ? JSON.parse(userData) : null
  }

  async getStatus(): Promise<GoogleAuthStatus> {
    const user = this.getUser()
    const lastBackup = localStorage.getItem(GOOGLE_STORAGE_KEYS.lastBackup)
    const autoBackup = localStorage.getItem(GOOGLE_STORAGE_KEYS.autoBackup) === 'true'

    return {
      connected: this.isSignedIn(),
      email: user?.email,
      lastBackup: lastBackup ? new Date(parseInt(lastBackup, 10)).toLocaleString() : undefined,
      autoBackup
    }
  }

  async updateAutoBackup(enabled: boolean) {
    localStorage.setItem(GOOGLE_STORAGE_KEYS.autoBackup, enabled.toString())

    if (enabled) {
      this.scheduleAutoBackup()
    }
  }

  private scheduleAutoBackup() {
    setInterval(() => {
      const lastBackup = localStorage.getItem(GOOGLE_STORAGE_KEYS.lastBackup)
      if (!lastBackup) return

      const lastBackupDate = new Date(parseInt(lastBackup, 10))
      const hoursDiff = (Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60)

      if (hoursDiff >= 24) {
        this.performAutoBackup()
      }
    }, 60 * 60 * 1000)
  }

  private async performAutoBackup() {
    try {
      const { googleDrive } = await import('./googleDrive')
      await googleDrive.backup()
    } catch (error) {
       
      console.error('Auto backup failed:', error)
    }
  }

  updateLastBackupTime() {
    localStorage.setItem(GOOGLE_STORAGE_KEYS.lastBackup, Date.now().toString())
  }

  private shouldRetryWithConsent(error: unknown): boolean {
    if (error instanceof GoogleAuthError) {
      return error.code === 'consent_required' || error.code === 'interaction_required'
    }
    return false
  }

  private formatGoogleError(error: unknown, fallback: string): string {
    if (error instanceof GoogleAuthError) {
      const codeHint = error.code ? ` (${error.code})` : ''
      return `${fallback}: ${error.message}${codeHint}`
    }

    if (error instanceof Error) {
      return `${fallback}: ${error.message}`
    }

    return fallback
  }
}

export const googleAuth = new GoogleAuthService()
