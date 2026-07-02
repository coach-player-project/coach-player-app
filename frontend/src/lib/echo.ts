import Echo from "laravel-echo"
import Pusher from "pusher-js"
import { getApiBaseUrl } from "./api"

// Ensure Pusher is globally available
if (typeof window !== "undefined") {
  ;(window as any).Pusher = Pusher
}

export const getEcho = (): Echo<any> | null => {
  if (typeof window === "undefined") return null

  const appKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY || "coach_key"
  const host = process.env.NEXT_PUBLIC_REVERB_HOST || "localhost"
  const port = process.env.NEXT_PUBLIC_REVERB_PORT || "8080"
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME || "http"
  const apiBaseUrl = getApiBaseUrl()

  if (!(window as any).laravelEcho) {
    (window as any).laravelEcho = new Echo({
      broadcaster: "reverb",
      key: appKey,
      wsHost: host,
      wsPort: parseInt(port),
      wssPort: parseInt(port),
      forceTLS: scheme === "https",
      enabledTransports: ["ws", "wss"],
      authorizer: (channel: any, options: any) => {
        return {
          authorize: (socketId: string, callback: Function) => {
            const token = localStorage.getItem("auth_token")
            fetch(`${apiBaseUrl}/api/broadcasting/auth`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })
              .then((res) => {
                if (!res.ok) {
                  throw new Error(`Broadcasting auth failed: ${res.status}`)
                }
                return res.json()
              })
              .then((data) => callback(false, data))
              .catch((err) => callback(true, err))
          },
        }
      },
    })
  }

  return (window as any).laravelEcho
}
