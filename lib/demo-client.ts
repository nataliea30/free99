export const getSessionToken = () => {
  if (typeof window === "undefined") {
    return null
  }
  return window.localStorage.getItem("demoSessionToken")
}

export const setSessionToken = (token: string) => {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem("demoSessionToken", token)
}

export const clearSessionToken = () => {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.removeItem("demoSessionToken")
}

export const authHeaders = (): Record<string, string> => {
  const token = getSessionToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const readJsonSafe = async <T>(response: Response): Promise<T | null> => {
  const raw = await response.text()
  if (!raw.trim()) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
