import { googleAuth } from './googleAuth'
import { backupService } from './backup'

interface DriveErrorResponse {
  error?: {
    code?: number
    message?: string
    status?: string
    errors?: Array<{
      reason?: string
      message?: string
    }>
  }
}

class GoogleDriveApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: string
  ) {
    super(message)
    this.name = 'GoogleDriveApiError'
  }
}

class GoogleDriveService {
  private readonly BACKUP_FILENAME = 'learning-diaries-backup.json'
  private readonly FOLDER_NAME = 'Learning Diaries Backups'

  async backup(): Promise<void> {
    const accessToken = await googleAuth.getAccessToken()
    const backupData = await backupService.exportData()

    // First, find or create the backup folder
    const folderId = await this.findOrCreateFolder(accessToken)

    // Check if backup file exists and update it, otherwise create new
    const existingFileId = await this.findBackupFile(accessToken, folderId)

    if (existingFileId) {
      await this.updateFile(accessToken, existingFileId, backupData)
    } else {
      await this.createFile(accessToken, folderId, backupData)
    }

    googleAuth.updateLastBackupTime()
  }

  async restore(): Promise<void> {
    const accessToken = await googleAuth.getAccessToken()
    const folderId = await this.findOrCreateFolder(accessToken)
    const fileId = await this.findBackupFile(accessToken, folderId)

    if (!fileId) {
      throw new Error('No backup file found')
    }

    const backupData = await this.downloadFile(accessToken, fileId)
    await backupService.importData(backupData)
  }

  private async findOrCreateFolder(accessToken: string): Promise<string> {
    // Search for existing folder
    const query = encodeURIComponent(
      `name = '${this.FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    )
    const searchData = await this.fetchJson(accessToken, `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, 'search for backup folder')

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }

    // Create new folder
    const createData = await this.fetchJson(
      accessToken,
      'https://www.googleapis.com/drive/v3/files?fields=id',
      'create backup folder',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: this.FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        })
      }
    )

    return createData.id
  }

  private async findBackupFile(accessToken: string, folderId: string): Promise<string | null> {
    const query = encodeURIComponent(
      `name = '${this.BACKUP_FILENAME}' and '${folderId}' in parents and trashed = false`
    )
    const searchData = await this.fetchJson(
      accessToken,
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      'search for existing backup file'
    )

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }

    return null
  }

  private async createFile(accessToken: string, folderId: string, content: string): Promise<void> {
    const metadata = {
      name: this.BACKUP_FILENAME,
      parents: [folderId]
    }

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([content], { type: 'application/json' }))

    await this.ensureOk(
      accessToken,
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      'create backup file',
      {
        method: 'POST',
        body: form
      }
    )
  }

  private async updateFile(accessToken: string, fileId: string, content: string): Promise<void> {
    await this.ensureOk(
      accessToken,
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      'update backup file',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: content
      }
    )
  }

  private async downloadFile(accessToken: string, fileId: string): Promise<string> {
    const response = await this.fetchResponse(
      accessToken,
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      'download backup file'
    )

    return await response.text()
  }

  private async fetchJson(
    accessToken: string,
    url: string,
    action: string,
    init?: RequestInit
  ) {
    const response = await this.fetchResponse(accessToken, url, action, init)
    return await response.json()
  }

  private async ensureOk(
    accessToken: string,
    url: string,
    action: string,
    init?: RequestInit
  ) {
    await this.fetchResponse(accessToken, url, action, init)
  }

  private async fetchResponse(
    accessToken: string,
    url: string,
    action: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${accessToken}`)

    const response = await fetch(url, {
      ...init,
      headers
    })

    if (response.ok) {
      return response
    }

    throw await this.createDriveError(response, action)
  }

  private async createDriveError(response: Response, action: string): Promise<GoogleDriveApiError> {
    let message = `${action} failed with status ${response.status}`
    let reason: string | undefined

    try {
      const data = (await response.json()) as DriveErrorResponse
      if (data?.error) {
        message = `${action} failed: ${data.error.message ?? message}`
        reason = data.error.status || data.error.errors?.[0]?.reason
      }
    } catch (error) {
       
      console.warn('Failed to parse Google Drive error response', error)
    }

    return new GoogleDriveApiError(message, response.status, reason)
  }
}

export const googleDrive = new GoogleDriveService()
