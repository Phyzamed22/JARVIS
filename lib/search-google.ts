import { spawn } from "child_process"
import path from "path"

/**
 * Opens Google Chrome and performs a search using the given query.
 * Uses Python with PyAutoGUI for automation instead of robotjs.
 * @param query The search query to perform
 */
export async function searchGoogle(query: string): Promise<void> {
  console.log(`[Jarvis] Searching Google for: "${query}"`)

  return new Promise((resolve, reject) => {
    // Run the Python script for Google search
    const pythonProcess = spawn('python', [
      path.join(process.cwd(), 'lib', 'automation_runner.py'),
      'search_google',
      query
    ])

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python] ${data.toString().trim()}`)
    })

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Error] ${data.toString().trim()}`)
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('[Jarvis] Google search completed successfully')
        resolve()
      } else {
        const error = new Error(`Python process exited with code ${code}`)
        console.error('[Jarvis] Failed to execute search:', error)
        reject(error)
      }
    })
  })
}

/**
 * Opens a web application at the specified URL.
 * @param url The URL of the web application to open
 */
export async function openWebApp(url: string): Promise<void> {
  console.log(`[Jarvis] Opening web app: ${url}`)

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(process.cwd(), 'lib', 'automation_runner.py'),
      'open_web_app',
      url
    ])

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python] ${data.toString().trim()}`)
    })

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Error] ${data.toString().trim()}`)
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[Jarvis] Web app opened successfully: ${url}`)
        resolve()
      } else {
        const error = new Error(`Python process exited with code ${code}`)
        console.error('[Jarvis] Failed to open web app:', error)
        reject(error)
      }
    })
  })
}

/**
 * Opens a desktop application by name.
 * @param appName The name of the application to open
 */
export async function openDesktopApp(appName: string): Promise<void> {
  console.log(`[Jarvis] Launching desktop app: ${appName}`)

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      path.join(process.cwd(), 'lib', 'automation_runner.py'),
      'open_desktop_app',
      appName
    ])

    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python] ${data.toString().trim()}`)
    })

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Error] ${data.toString().trim()}`)
    })

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`[Jarvis] Desktop app launched successfully: ${appName}`)
        resolve()
      } else {
        const error = new Error(`Python process exited with code ${code}`)
        console.error('[Jarvis] Failed to launch desktop app:', error)
        reject(error)
      }
    })
  })
}