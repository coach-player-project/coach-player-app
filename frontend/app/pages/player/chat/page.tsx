"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { apiFetch, getCurrentUser } from "@/lib/api"
import { 
  Send, 
  Search, 
  MessageSquare, 
  Users, 
  ArrowLeft, 
  Loader2, 
  User as UserIcon,
  Check,
  CheckCheck
} from "lucide-react"

interface Contact {
  id: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  role?: string
  description?: string
  avatar_url?: string
  logo_url?: string
  type: 'direct' | 'group'
  unread_count?: number
}

interface MessageData {
  id: string
  sender_id: string
  receiver_id: string | null
  team_id: string | null
  content: string
  is_read: boolean
  sent_at: string
  sender?: {
    id: string
    first_name: string
    last_name: string
    role: string
    avatar_url: string | null
    team_role?: string
  }
}

export default function PlayerChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [contacts, setContacts] = useState<{ channels: Contact[]; directs: Contact[] }>({ channels: [], directs: [] })
  const [activeChat, setActiveChat] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingTimer = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }, 100)
  }, [])

  // Load current user
  useEffect(() => {
    getCurrentUser().then(user => {
      setCurrentUser(user)
    })
  }, [])

  // Load contacts
  const loadContacts = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingContacts(true)
      const data = await apiFetch("/messages/contacts") as { channels: Contact[]; directs: Contact[] }
      setContacts(data)
    } catch (err) {
      console.error("Error loading contacts:", err)
      if (!isSilent) setError("Nie udało się załadować kontaktów.")
    } finally {
      if (!isSilent) setLoadingContacts(false)
    }
  }, [])

  // Fetch messages for active chat
  const loadMessages = useCallback(async (chat: Contact, isSilent = false) => {
    if (!chat) return
    try {
      if (!isSilent) setLoadingMessages(true)
      const queryParam = chat.type === "group" ? `team_id=${chat.id}` : `receiver_id=${chat.id}`
      const data = await apiFetch(`/messages?${queryParam}`) as MessageData[]
      
      setMessages(data)
      
      // If we marked direct messages as read, clear unread count locally
      if (chat.type === "direct" && chat.unread_count && chat.unread_count > 0) {
        setContacts(prev => ({
          ...prev,
          directs: prev.directs.map(d => d.id === chat.id ? { ...d, unread_count: 0 } : d)
        }))
        if (activeChat?.id === chat.id) {
          setActiveChat(prev => prev ? { ...prev, unread_count: 0 } : null)
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err)
      if (!isSilent) setError("Nie udało się pobrać wiadomości.")
    } finally {
      if (!isSilent) setLoadingMessages(false)
    }
  }, [activeChat])

  // Initial contacts load
  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Scroll to bottom when active chat changes
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat, false).then(() => {
        scrollToBottom("auto")
      })
    } else {
      setMessages([])
    }
  }, [activeChat, scrollToBottom])

  // Setup 5-second polling
  useEffect(() => {
    // Clear existing timer
    if (pollingTimer.current) {
      clearInterval(pollingTimer.current)
    }

    pollingTimer.current = setInterval(() => {
      loadContacts(true)
      if (activeChat) {
        loadMessages(activeChat, true)
      }
    }, 5000)

    return () => {
      if (pollingTimer.current) {
        clearInterval(pollingTimer.current)
      }
    }
  }, [activeChat, loadContacts, loadMessages])

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newMessage.trim() || !activeChat || sendingMessage) return

    const messageText = newMessage.trim()
    setNewMessage("") // Clear immediately for snappy UI
    setSendingMessage(true)

    try {
      const payload: any = { content: messageText }
      if (activeChat.type === "group") {
        payload.team_id = activeChat.id
      } else {
        payload.receiver_id = activeChat.id
      }

      const sentMsg = await apiFetch("/messages", {
        method: "POST",
        body: JSON.stringify(payload)
      }) as MessageData

      setMessages(prev => [...prev, sentMsg])
      scrollToBottom("smooth")
      
      // Update contacts list to put this contact/channel at the top
      loadContacts(true)
    } catch (err) {
      console.error("Error sending message:", err)
      setError("Nie udało się wysłać wiadomości.")
      setNewMessage(messageText) // Restore message text on error
    } finally {
      setSendingMessage(false)
    }
  }

  // Handle enter key to submit (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Filter contacts by search query
  const filteredChannels = contacts.channels.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDirects = contacts.directs.filter(d => 
    `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Format date helper
  const getMessageDateGroup = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (date.toDateString() === today.toDateString()) {
        return "Dzisiaj"
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Wczoraj"
      } else {
        return date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })
      }
    } catch (e) {
      return ""
    }
  }

  const getMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      return `${hours}:${minutes}`
    } catch (e) {
      return ""
    }
  }

  // Group messages by date
  const groupedMessages: { [date: string]: MessageData[] } = {}
  messages.forEach(msg => {
    const group = getMessageDateGroup(msg.sent_at)
    if (!groupedMessages[group]) {
      groupedMessages[group] = []
    }
    groupedMessages[group].push(msg)
  })

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-950/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-10 w-10 text-blue-400 shrink-0" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">Kontakt z trenerem</h1>
              <p className="text-blue-200 text-sm md:text-base">Rozmawiaj ze swoimi trenerami oraz uczestnicz w czatach grupowych swoich drużyn.</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-800 rounded-xl border border-rose-100 p-4 flex justify-between items-center">
          <p className="font-medium text-sm">{error}</p>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-xs uppercase px-2 py-1">Zamknij</button>
        </div>
      )}

      {/* Main chat layout wrapper */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex h-[620px] relative">
        
        {/* Contact list / Sidebar */}
        <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col shrink-0 ${
          activeChat ? "hidden md:flex" : "flex"
        }`}>
          {/* Search bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Szukaj czatu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded-xl pl-9 pr-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* List scroll area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loadingContacts ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs text-gray-500">Wyszukiwanie trenerów i kanałów...</span>
              </div>
            ) : (
              <>
                {/* Channels (Group Chats) */}
                <div className="p-3">
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Kanały grupowe
                  </h3>
                  {filteredChannels.length === 0 ? (
                    <p className="text-xs text-gray-400 italic px-3 py-1">Brak kanałów grupowych</p>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredChannels.map(channel => (
                        <button
                          key={channel.id}
                          onClick={() => setActiveChat(channel)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${
                            activeChat?.id === channel.id
                              ? "bg-blue-50 text-blue-700 font-semibold"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                            {channel.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{channel.name}</p>
                            <p className="text-xs text-gray-400 truncate font-normal">{channel.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Chats with Coaches */}
                <div className="p-3">
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Trenerzy
                  </h3>
                  {filteredDirects.length === 0 ? (
                    <p className="text-xs text-gray-400 italic px-3 py-1">Brak przypisanych trenerów</p>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredDirects.map(direct => {
                        const initials = `${direct.first_name?.[0] || ""}${direct.last_name?.[0] || ""}`.toUpperCase()
                        return (
                          <button
                            key={direct.id}
                            onClick={() => setActiveChat(direct)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 relative ${
                              activeChat?.id === direct.id
                                ? "bg-blue-50 text-blue-700 font-semibold"
                                : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold shrink-0">
                              {initials || <UserIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <p className="text-sm font-medium truncate">{direct.first_name} {direct.last_name}</p>
                                {direct.unread_count && direct.unread_count > 0 ? (
                                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center shadow-sm shrink-0">
                                    {direct.unread_count}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-gray-400 truncate font-normal">{direct.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chat Thread Panel */}
        <div className={`flex-1 flex flex-col bg-gray-50/40 relative ${
          !activeChat ? "hidden md:flex items-center justify-center" : "flex"
        }`}>
          {activeChat ? (
            <>
              {/* Active Chat Header */}
              <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between shadow-sm/5 z-10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button for mobile */}
                  <button 
                    onClick={() => setActiveChat(null)} 
                    className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {activeChat.type === "group" ? (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                      {activeChat.name?.slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold shrink-0">
                      {`${activeChat.first_name?.[0] || ""}${activeChat.last_name?.[0] || ""}`.toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900 text-sm md:text-base leading-tight truncate">
                      {activeChat.type === "group" ? activeChat.name : `${activeChat.first_name} ${activeChat.last_name}`}
                    </h2>
                    <p className="text-xs text-gray-400 truncate">
                      {activeChat.type === "group" ? "Kanał grupowy" : activeChat.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 flex flex-col">
                {loadingMessages ? (
                  <div className="flex-1 flex flex-col justify-center items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-500">Pobieranie wiadomości...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-gray-400">
                    <MessageSquare className="w-12 h-12 stroke-[1.5] mb-2 text-gray-300 animate-bounce/10" />
                    <p className="text-sm font-medium">Brak wiadomości</p>
                    <p className="text-xs">Napisz coś, aby rozpocząć konwersację!</p>
                  </div>
                ) : (
                  <>
                    {/* Render grouped messages */}
                    {Object.keys(groupedMessages).map(dateGroup => (
                      <div key={dateGroup} className="space-y-4">
                        {/* Date Divider */}
                        <div className="flex justify-center">
                          <span className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-xs">
                            {dateGroup}
                          </span>
                        </div>

                        {/* Messages in this date group */}
                        {groupedMessages[dateGroup].map(msg => {
                          const isMine = currentUser && msg.sender_id === currentUser.id
                          const senderName = msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : "Użytkownik"
                          
                          return (
                            <div 
                              key={msg.id} 
                              className={`flex flex-col max-w-[80%] md:max-w-[70%] ${
                                isMine ? "ml-auto items-end" : "mr-auto items-start"
                              }`}
                            >
                              {/* Sender Name in Group Chat */}
                              {!isMine && activeChat.type === "group" && (
                                <span className="text-[11px] font-medium text-gray-500 mb-1 ml-1 flex items-center gap-1">
                                  {senderName}
                                  {msg.sender?.team_role && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${
                                      msg.sender.role === "coach" 
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : msg.sender.role === "admin"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-blue-50 text-blue-700 border-blue-200"
                                    }`}>
                                      {msg.sender.team_role}
                                    </span>
                                  )}
                                </span>
                              )}

                              {/* Message bubble */}
                              <div className={`p-3 rounded-2xl shadow-xs leading-relaxed text-sm ${
                                isMine 
                                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-xs" 
                                  : "bg-white border border-gray-100 text-gray-800 rounded-bl-xs"
                              }`}>
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              </div>

                              {/* Message footer (time + read receipt for mine) */}
                              <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 mx-1 font-normal">
                                {getMessageTime(msg.sent_at)}
                                {isMine && activeChat.type === "direct" && (
                                  msg.is_read ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-gray-300" />
                                  )
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Composer */}
              <div className="bg-white border-t border-gray-100 p-4 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2.5 items-end">
                  <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2 border border-transparent focus-within:border-blue-500/20 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all flex items-center min-h-[44px]">
                    <textarea
                      placeholder="Napisz wiadomość..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      className="flex-1 bg-transparent border-0 focus:ring-0 p-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none max-h-24 min-h-[20px] leading-relaxed align-middle"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0 cursor-pointer"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            // No active conversation state
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 text-blue-600 shadow-sm">
                <MessageSquare className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Twoje Centrum Konwersacji</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Wybierz kanał grupowy lub swojego trenera w panelu bocznym, aby rozpocząć konwersację.
              </p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  )
}
