"use client"

import { useEffect, useRef, useState } from "react"
import { Play, RotateCcw, Trash2, Undo, Move, Pencil, Type, Check, Plus, Flag } from "lucide-react"

// Types for tactical board state serialization
export interface TacticalItem {
  id: string
  label: string
  role: string
  x: number // relative x (0.0 to 1.0)
  y: number // relative y (0.0 to 1.0)
  color: "blue" | "red" | "orange" | "white"
  type: "player" | "opponent" | "ball" | "cone"
}

export interface TacticalDrawing {
  id: string
  type: "freehand" | "arrow" | "dotted"
  color: string
  lineWidth: number
  points: { x: number; y: number }[] // array of relative coords
}

export interface TacticalBoardData {
  items: TacticalItem[]
  drawings: TacticalDrawing[]
  notes: string
  formation?: string
  showOpponents?: boolean
}

interface TacticalBoardProps {
  initialData?: string | null
  readOnly?: boolean
  onSave?: (dataString: string) => void
}

// Predefined relative coords for 11 players
// Predefined relative coords for 11 players (Left to Right attacking)
const FORMATION_PRESETS: Record<string, { x: number; y: number }[]> = {
  "4-4-2": [
    { x: 0.08, y: 0.50 }, // GK
    { x: 0.22, y: 0.80 }, // RB
    { x: 0.20, y: 0.60 }, // RCB
    { x: 0.20, y: 0.40 }, // LCB
    { x: 0.22, y: 0.20 }, // LB
    { x: 0.44, y: 0.80 }, // RM
    { x: 0.42, y: 0.60 }, // RCM
    { x: 0.42, y: 0.40 }, // LCM
    { x: 0.44, y: 0.20 }, // LM
    { x: 0.66, y: 0.58 }, // RS
    { x: 0.66, y: 0.42 }, // LS
  ],
  "4-3-3": [
    { x: 0.08, y: 0.50 }, // GK
    { x: 0.22, y: 0.80 }, // RB
    { x: 0.20, y: 0.60 }, // RCB
    { x: 0.20, y: 0.40 }, // LCB
    { x: 0.22, y: 0.20 }, // LB
    { x: 0.44, y: 0.68 }, // RCM
    { x: 0.38, y: 0.50 }, // DM
    { x: 0.44, y: 0.32 }, // LCM
    { x: 0.66, y: 0.78 }, // RW
    { x: 0.70, y: 0.50 }, // ST
    { x: 0.66, y: 0.22 }, // LW
  ],
  "3-5-2": [
    { x: 0.08, y: 0.50 }, // GK
    { x: 0.20, y: 0.70 }, // RCB
    { x: 0.18, y: 0.50 }, // CB
    { x: 0.20, y: 0.30 }, // LCB
    { x: 0.42, y: 0.85 }, // RWB
    { x: 0.42, y: 0.64 }, // RCM
    { x: 0.36, y: 0.50 }, // DM
    { x: 0.42, y: 0.36 }, // LCM
    { x: 0.42, y: 0.15 }, // LWB
    { x: 0.66, y: 0.58 }, // RS
    { x: 0.66, y: 0.42 }, // LS
  ],
  "4-2-3-1": [
    { x: 0.08, y: 0.50 }, // GK
    { x: 0.22, y: 0.80 }, // RB
    { x: 0.20, y: 0.60 }, // RCB
    { x: 0.20, y: 0.40 }, // LCB
    { x: 0.22, y: 0.20 }, // LB
    { x: 0.36, y: 0.62 }, // RDM
    { x: 0.36, y: 0.38 }, // LDM
    { x: 0.52, y: 0.78 }, // RAM
    { x: 0.54, y: 0.50 }, // AM
    { x: 0.52, y: 0.22 }, // LAM
    { x: 0.70, y: 0.50 }, // ST
  ],
  "5-3-2": [
    { x: 0.08, y: 0.50 }, // GK
    { x: 0.22, y: 0.85 }, // RWB
    { x: 0.20, y: 0.66 }, // RCB
    { x: 0.18, y: 0.50 }, // CB
    { x: 0.20, y: 0.34 }, // LCB
    { x: 0.22, y: 0.15 }, // LWB
    { x: 0.42, y: 0.68 }, // RCM
    { x: 0.40, y: 0.50 }, // CM
    { x: 0.42, y: 0.32 }, // LCM
    { x: 0.66, y: 0.58 }, // RS
    { x: 0.66, y: 0.42 }, // LS
  ]
}

const PLAYER_ROLES = ["BR", "OB", "PO", "NA"]

export function TacticalBoard({ initialData, readOnly = false, onSave }: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // Dimensions
  const canvasWidth = 800
  const canvasHeight = 500
  const playerRadius = 16

  // Mode & Drawing states
  const [toolMode, setToolMode] = useState<"move" | "freehand" | "arrow" | "dotted" | "cone">("move")
  const [penColor, setPenColor] = useState<string>("#ffffff")
  const [formation, setFormation] = useState<string>("4-4-2")
  const [notes, setNotes] = useState<string>("")
  
  // Board elements
  const [items, setItems] = useState<TacticalItem[]>([])
  const [drawings, setDrawings] = useState<TacticalDrawing[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeDrawing, setActiveDrawing] = useState<TacticalDrawing | null>(null)
  const [showOpponents, setShowOpponents] = useState<boolean>(true)
  
  // Drag state
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null)
  
  // Load initial configuration
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData) as TacticalBoardData
        if (parsed.items && parsed.items.length > 0) {
          setItems(parsed.items)
        } else {
          loadDefaultPitch(parsed.formation || formation)
        }
        if (parsed.drawings) setDrawings(parsed.drawings)
        if (parsed.notes) setNotes(parsed.notes)
        if (parsed.formation) setFormation(parsed.formation)
        if (parsed.showOpponents !== undefined) setShowOpponents(parsed.showOpponents)
        else setShowOpponents(true)
      } catch (err) {
        console.error("Error loading tactical data:", err)
        loadDefaultPitch()
      }
    } else {
      loadDefaultPitch()
    }
  }, [initialData])

  // Save changes
  const handleSave = () => {
    if (onSave) {
      const data: TacticalBoardData = {
        items,
        drawings,
        notes,
        formation,
        showOpponents
      }
      onSave(JSON.stringify(data))
    }
  }

  const handleAddCone = () => {
    const newCone: TacticalItem = {
      id: `cone-${Date.now()}`,
      label: "P",
      role: "C",
      x: 0.5,
      y: 0.5,
      color: "orange",
      type: "cone"
    }
    setItems((prev) => [...prev, newCone])
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    const { x, y } = getRelativeCoords(e)

    let foundIndex = -1
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      if (item.type !== "cone") continue

      const px = item.x * canvasWidth
      const py = item.y * canvasHeight
      const clickX = x * canvasWidth
      const clickY = y * canvasHeight
      const dist = Math.sqrt((px - clickX) ** 2 + (py - clickY) ** 2)

      if (dist <= 14) {
        foundIndex = i
        break
      }
    }

    if (foundIndex !== -1) {
      setItems((prev) => prev.filter((_, idx) => idx !== foundIndex))
    }
  }

  // Load default positions
  const loadDefaultPitch = (selectedForm = formation) => {
    const defaultItems: TacticalItem[] = []

    // 1. Home Players (Blue)
    const positions = FORMATION_PRESETS[selectedForm] || FORMATION_PRESETS["4-4-2"]
    positions.forEach((pos, index) => {
      const playerNum = index + 1
      let role = "PO"
      if (index === 0) role = "BR"
      else if (index <= 4) role = "OB"
      else if (index <= 8) role = "PO"
      else role = "NA"

      defaultItems.push({
        id: `h-${playerNum}`,
        label: `${playerNum}`,
        role,
        x: pos.x,
        y: pos.y,
        color: "blue",
        type: "player"
      })
    })

    // 2. Opponents (Red) - Defending block on the right (Mirrored selected formation)
    const opponentPositions = FORMATION_PRESETS[selectedForm] || FORMATION_PRESETS["4-4-2"]
    opponentPositions.forEach((pos, index) => {
      const playerNum = index + 1
      let role = "PO"
      if (index === 0) role = "BR"
      else if (index <= 4) role = "OB"
      else if (index <= 8) role = "PO"
      else role = "NA"

      defaultItems.push({
        id: `o-${playerNum}`,
        label: `O${playerNum}`,
        role,
        x: 1 - pos.x,
        y: pos.y,
        color: "red",
        type: "opponent"
      })
    })

    // 3. Ball
    defaultItems.push({
      id: "ball",
      label: "B",
      role: "P",
      x: 0.5,
      y: 0.5,
      color: "white",
      type: "ball"
    })

    // 4. Cones (Orange disc cones)
    defaultItems.push(
      { id: "cone-1", label: "P", role: "C", x: 0.15, y: 0.88, color: "orange", type: "cone" },
      { id: "cone-2", label: "P", role: "C", x: 0.85, y: 0.88, color: "orange", type: "cone" }
    )

    setItems(defaultItems)
    setDrawings([])
  }

  const handleFormationChange = (formName: string) => {
    setFormation(formName)
    loadDefaultPitch(formName)
  }

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear Canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // 1. Draw Field Turf
    ctx.fillStyle = "#1e3f20"
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 2. Draw pitch lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"
    ctx.lineWidth = 3

    // Boundary Lines
    ctx.strokeRect(20, 20, canvasWidth - 40, canvasHeight - 40)

    // Halfway Line
    ctx.beginPath()
    ctx.moveTo(canvasWidth / 2, 20)
    ctx.lineTo(canvasWidth / 2, canvasHeight - 20)
    ctx.stroke()

    // Center Circle
    ctx.beginPath()
    ctx.arc(canvasWidth / 2, canvasHeight / 2, 60, 0, Math.PI * 2)
    ctx.stroke()

    // Center Spot
    ctx.beginPath()
    ctx.arc(canvasWidth / 2, canvasHeight / 2, 4, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.fill()

    // Penalty Area Left
    ctx.strokeRect(20, canvasHeight / 2 - 120, 100, 240)
    ctx.strokeRect(20, canvasHeight / 2 - 50, 40, 100)
    ctx.beginPath()
    ctx.arc(80, canvasHeight / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    // Penalty Area Right
    ctx.strokeRect(canvasWidth - 120, canvasHeight / 2 - 120, 100, 240)
    ctx.strokeRect(canvasWidth - 60, canvasHeight / 2 - 50, 40, 100)
    ctx.beginPath()
    ctx.arc(canvasWidth - 80, canvasHeight / 2, 3, 0, Math.PI * 2)
    ctx.fill()

    // Corner Arcs
    const cornerArcs = [
      { cx: 20, cy: 20, sa: 0, ea: Math.PI / 2 },
      { cx: canvasWidth - 20, cy: 20, sa: Math.PI / 2, ea: Math.PI },
      { cx: 20, cy: canvasHeight - 20, sa: -Math.PI / 2, ea: 0 },
      { cx: canvasWidth - 20, cy: canvasHeight - 20, sa: Math.PI, ea: -Math.PI / 2 },
    ]
    cornerArcs.forEach(({ cx, cy, sa, ea }) => {
      ctx.beginPath()
      ctx.arc(cx, cy, 10, sa, ea)
      ctx.stroke()
    })

    // Goals (Outer Outline)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
    ctx.lineWidth = 4
    ctx.strokeRect(10, canvasHeight / 2 - 40, 10, 80)
    ctx.strokeRect(canvasWidth - 20, canvasHeight / 2 - 40, 10, 80)

    // 3. Render Drawings
    const renderPath = (drawing: TacticalDrawing) => {
      if (drawing.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = drawing.color
      ctx.lineWidth = drawing.lineWidth

      if (drawing.type === "dotted") {
        ctx.setLineDash([8, 6])
      } else {
        ctx.setLineDash([])
      }

      const startX = drawing.points[0].x * canvasWidth
      const startY = drawing.points[0].y * canvasHeight
      ctx.moveTo(startX, startY)

      if (drawing.type === "arrow" && drawing.points.length === 2) {
        // Draw straight line arrow
        const endX = drawing.points[1].x * canvasWidth
        const endY = drawing.points[1].y * canvasHeight
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Arrow head
        const angle = Math.atan2(endY - startY, endX - startX)
        ctx.beginPath()
        ctx.fillStyle = drawing.color
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - 12 * Math.cos(angle - Math.PI / 6),
          endY - 12 * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          endX - 12 * Math.cos(angle + Math.PI / 6),
          endY - 12 * Math.sin(angle + Math.PI / 6)
        )
        ctx.fill()
      } else {
        // Draw standard freehand
        for (let i = 1; i < drawing.points.length; i++) {
          ctx.lineTo(drawing.points[i].x * canvasWidth, drawing.points[i].y * canvasHeight)
        }
        ctx.stroke()
      }
    }

    drawings.forEach(renderPath)
    if (activeDrawing) {
      renderPath(activeDrawing)
    }

    // Reset dash pattern
    ctx.setLineDash([])

    // 4. Render Items (Players, Ball, Cones)
    items.forEach((item) => {
      if (item.type === "opponent" && !showOpponents) return; // skip hidden oponents

      const px = item.x * canvasWidth
      const py = item.y * canvasHeight

      if (item.type === "ball") {
        // Render ball
        ctx.beginPath()
        ctx.arc(px, py, 9, 0, Math.PI * 2)
        ctx.fillStyle = "#ffffff"
        ctx.fill()
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 1.5
        ctx.stroke()
        // Ball details
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)"
        ctx.stroke()
      } else if (item.type === "cone") {
        // Render orange flat training disc cone
        ctx.beginPath()
        ctx.arc(px, py, 11, 0, Math.PI * 2)
        ctx.fillStyle = "#ff6f00"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        // Draw inner circle hole of disc cone
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fillStyle = "#1e3f20" // matches turf background color
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.stroke()
      } else {
        // Render Player Circle
        ctx.beginPath()
        ctx.arc(px, py, playerRadius, 0, Math.PI * 2)
        
        if (item.color === "blue") {
          ctx.fillStyle = "#1e40af" // primary royal blue
          ctx.strokeStyle = "#3b82f6"
        } else {
          ctx.fillStyle = "#991b1b" // crimson red
          ctx.strokeStyle = "#f87171"
        }
        ctx.lineWidth = 2
        ctx.fill()
        ctx.stroke()

        // Player Label
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 11px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(item.label, px, py - 1)
      }
    })
  }, [items, drawings, activeDrawing, showOpponents])

  // Coordinate Conversion Helper
  const getRelativeCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    let clientX = 0
    let clientY = 0

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 }
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    // Scale coordinates correctly matching local dimensions
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    return { x, y }
  }

  // Handle Drag & Draw Mouse Down
  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    const { x, y } = getRelativeCoords(e)

    if (toolMode === "cone") {
      const newCone: TacticalItem = {
        id: `cone-${Date.now()}`,
        label: "P",
        role: "C",
        x,
        y,
        color: "orange",
        type: "cone"
      }
      setItems((prev) => [...prev, newCone])
      return
    }

    if (toolMode === "move") {
      // Find item clicked (from top to bottom)
      let foundIndex = -1
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]
        if (item.type === "opponent" && !showOpponents) continue // skip hidden oponents

        const px = item.x * canvasWidth
        const py = item.y * canvasHeight
        const clickX = x * canvasWidth
        const clickY = y * canvasHeight
        const dist = Math.sqrt((px - clickX) ** 2 + (py - clickY) ** 2)

        const hitRadius = item.type === "ball" ? 12 : item.type === "cone" ? 14 : playerRadius + 4
        if (dist <= hitRadius) {
          foundIndex = i
          break
        }
      }

      if (foundIndex !== -1) {
        setDraggedItemIndex(foundIndex)
      }
    } else {
      // Drawing mode
      setIsDrawing(true)
      const newDrawing: TacticalDrawing = {
        id: `draw-${Date.now()}`,
        type: toolMode === "freehand" ? "freehand" : toolMode === "arrow" ? "arrow" : "dotted",
        color: penColor,
        lineWidth: 3,
        points: [{ x, y }]
      }
      setActiveDrawing(newDrawing)
    }
  }

  // Handle Drag & Draw Mouse Move
  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return
    const { x, y } = getRelativeCoords(e)

    if (toolMode === "move" && draggedItemIndex !== null) {
      // Boundaries check
      const clampedX = Math.max(0.02, Math.min(0.98, x))
      const clampedY = Math.max(0.03, Math.min(0.97, y))

      setItems((prev) =>
        prev.map((item, idx) => (idx === draggedItemIndex ? { ...item, x: clampedX, y: clampedY } : item))
      )
    } else if (isDrawing && activeDrawing) {
      if (activeDrawing.type === "arrow" || activeDrawing.type === "dotted") {
        // Dotted/Arrow only stores start and end points
        setActiveDrawing((prev) => {
          if (!prev) return null
          return {
            ...prev,
            points: [prev.points[0], { x, y }]
          }
        })
      } else {
        // Freehand drawings track every movement
        setActiveDrawing((prev) => {
          if (!prev) return null
          return {
            ...prev,
            points: [...prev.points, { x, y }]
          }
        })
      }
    }
  }

  // Handle Drag & Draw Mouse Up
  const handleEnd = () => {
    setDraggedItemIndex(null)

    if (isDrawing && activeDrawing) {
      if (activeDrawing.points.length >= 2) {
        setDrawings((prev) => [...prev, activeDrawing])
      }
      setIsDrawing(false)
      setActiveDrawing(null)
    }
  }

  const handleUndo = () => {
    setDrawings((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setDrawings([])
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Board Controls Panel */}
      {!readOnly && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Tool Modes */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setToolMode("move")}
                className={`px-3 py-2 flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  toolMode === "move" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                title="Przesuwaj zawodników"
              >
                <Move className="h-4 w-4" />
                <span>Ruch</span>
              </button>
              <button
                type="button"
                onClick={() => setToolMode("freehand")}
                className={`px-3 py-2 flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  toolMode === "freehand" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                title="Rysowanie odręczne"
              >
                <Pencil className="h-4 w-4" />
                <span>Rysuj</span>
              </button>
              <button
                type="button"
                onClick={() => setToolMode("arrow")}
                className={`px-3 py-2 flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  toolMode === "arrow" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                title="Rysuj strzałkę podania"
              >
                <Play className="h-4 w-4" />
                <span>Podanie</span>
              </button>
              <button
                type="button"
                onClick={() => setToolMode("dotted")}
                className={`px-3 py-2 flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  toolMode === "dotted" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                title="Rysuj bieg zawodnika"
              >
                <Play className="h-4 w-4 rotate-90" />
                <span>Bieg</span>
              </button>
              <button
                type="button"
                onClick={() => setToolMode("cone")}
                className={`px-3 py-2 flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                  toolMode === "cone" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                title="Ustaw pachołek kliknięciem"
              >
                <Flag className={`h-4 w-4 ${toolMode === "cone" ? "text-orange-300" : "text-orange-500"}`} />
                <span>Pachołek</span>
              </button>
            </div>

            {/* Colors */}
            {toolMode !== "move" && toolMode !== "cone" && (
              <div className="flex gap-2 p-1 bg-gray-50 rounded-lg border border-gray-200 shrink-0">
                {["#ffffff", "#ff4444", "#ffeb3b", "#000000"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPenColor(c)}
                    className="w-6 h-6 rounded-full border border-gray-300 relative transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {penColor === c && (
                      <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${c === "#ffffff" || c === "#ffeb3b" ? "text-gray-900" : "text-white"}`}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Formations list */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ustawienie:</span>
              <select
                value={formation}
                onChange={(e) => handleFormationChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(FORMATION_PRESETS).map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Opponents Toggle */}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOpponents}
                onChange={(e) => setShowOpponents(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Przeciwnicy</span>
            </label>



            {/* Reset / Actions */}
            <button
              type="button"
              onClick={() => loadDefaultPitch()}
              className="p-2 text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg transition-colors"
              title="Resetuj pozycje"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={drawings.length === 0}
              className="p-2 text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cofnij rysunek"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={drawings.length === 0}
              className="p-2 text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Wyczyść rysunki"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor & Notes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Canvas Board (Cols 1-3) */}
        <div className="lg:col-span-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full h-auto aspect-[8/5] rounded-xl cursor-crosshair touch-none select-none"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
        </div>

        {/* Tactical Notes Sidebar (Col 4) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/40 h-full flex flex-col gap-4 min-h-[300px]">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Type className="h-5 w-5 text-gray-700" />
            <h3 className="font-bold text-gray-900">Notatki taktyczne</h3>
          </div>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={readOnly}
            placeholder={readOnly ? "Brak notatek do tej taktyki." : "Wpisz instrukcje taktyczne dla zespołu..."}
            className="flex-1 w-full p-3 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[120px] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />

          {/* Legend / Key */}
          <div className="border-t border-gray-100 pt-4 space-y-2 text-xs text-gray-500">
            <span className="font-bold uppercase tracking-wider text-gray-400 text-[10px] block">Legenda oznaczeń</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1e40af] border border-[#3b82f6] flex items-center justify-center text-[9px] text-white font-bold shrink-0">1</span>
                <span>Twój zespół</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#991b1b] border border-[#f87171] flex items-center justify-center text-[9px] text-white font-bold shrink-0">O1</span>
                <span>Oponent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white border border-gray-400 flex items-center justify-center text-[9px] text-gray-800 font-bold shrink-0">B</span>
                <span>Piłka</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#ff6f00] border border-white flex items-center justify-center text-[9px] text-white font-bold relative shrink-0">
                  <span className="absolute w-1.5 h-1.5 bg-[#1e3f20] rounded-full border border-white"></span>
                </span>
                <span>Pachołek</span>
              </div>
            </div>
            
            {!readOnly && (
              <div className="text-[10px] text-gray-400 text-center italic mt-2 pt-2 border-t border-gray-50">
                💡 Dwukrotne kliknięcie na pachołek usuwa go z tablicy.
              </div>
            )}
          </div>

          {!readOnly && onSave && (
            <button
              type="button"
              onClick={handleSave}
              className="w-full mt-2 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center justify-center gap-2 font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/20"
            >
              <Check className="h-4 w-4" />
              <span>Zapisz tablicę</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
