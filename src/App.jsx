import React, { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

// Winning combinations for a 3x3 board
const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
]

function calculateWinner(squares) {
  for (let i = 0; i < WINNING_COMBOS.length; i++) {
    const [a, b, c] = WINNING_COMBOS[i]
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] }
    }
  }

  if (squares.every(cell => cell !== null)) {
    return { winner: 'Draw', line: [] }
  }

  return null
}

// Minimax algorithm for unbeatable AI
function minimax(squares, depth, isMaximizing) {
  const result = calculateWinner(squares)
  if (result) {
    if (result.winner === 'O') return 10 - depth
    if (result.winner === 'X') return depth - 10
    if (result.winner === 'Draw') return 0
  }

  if (isMaximizing) {
    let bestScore = -Infinity
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O'
        const score = minimax(squares, depth + 1, false)
        squares[i] = null
        bestScore = Math.max(score, bestScore)
      }
    }
    return bestScore
  } else {
    let bestScore = Infinity
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'X'
        const score = minimax(squares, depth + 1, true)
        squares[i] = null
        bestScore = Math.min(score, bestScore)
      }
    }
    return bestScore
  }
}

function getBestMove(squares, difficulty) {
  const emptyIndices = squares
    .map((val, idx) => (val === null ? idx : null))
    .filter(val => val !== null)

  if (emptyIndices.length === 0) return null

  // Easy mode: purely random move
  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * emptyIndices.length)
    return emptyIndices[randomIndex]
  }

  // Hard mode: Minimax
  let bestScore = -Infinity
  let bestMove = emptyIndices[0]

  for (let i of emptyIndices) {
    squares[i] = 'O'
    const score = minimax(squares, 0, false)
    squares[i] = null
    if (score > bestScore) {
      bestScore = score
      bestMove = i
    }
  }

  return bestMove
}

export default function App() {
  const [board, setBoard] = useState(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [mode, setMode] = useState('pve') // 'pvp' | 'pve'
  const [difficulty, setDifficulty] = useState('hard') // 'easy' | 'hard'
  const [soundEnabled, setSoundEnabled] = useState(true)

  const [scores, setScores] = useState(() => {
    try {
      const saved = localStorage.getItem('ttt_scores')
      return saved ? JSON.parse(saved) : { x: 0, o: 0, ties: 0 }
    } catch {
      return { x: 0, o: 0, ties: 0 }
    }
  })

  const audioCtxRef = useRef(null)

  // Web Audio sound synthesizer
  const playSound = useCallback((type) => {
    if (!soundEnabled) return
    try {
      if (!audioCtxRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }

      if (type === 'click') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(480, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.08)
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.25)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(ctx.currentTime + idx * 0.1)
          osc.stop(ctx.currentTime + idx * 0.1 + 0.25)
        })
      } else if (type === 'draw') {
        const notes = [400, 320, 260]
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12)
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.12)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.18)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(ctx.currentTime + idx * 0.12)
          osc.stop(ctx.currentTime + idx * 0.12 + 0.18)
        })
      }
    } catch {
      // Audio not supported or blocked
    }
  }, [soundEnabled])

  const gameResult = calculateWinner(board)
  const isAiThinking = mode === 'pve' && !xIsNext && !gameResult

  // Save scores to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ttt_scores', JSON.stringify(scores))
    } catch {
      // ignore localStorage errors
    }
  }, [scores])

  // Handle score increments when game concludes
  const hasHandledGameEndRef = useRef(false)
  useEffect(() => {
    if (gameResult && !hasHandledGameEndRef.current) {
      hasHandledGameEndRef.current = true
      if (gameResult.winner === 'X') {
        setScores(prev => ({ ...prev, x: prev.x + 1 }))
        playSound('win')
      } else if (gameResult.winner === 'O') {
        setScores(prev => ({ ...prev, o: prev.o + 1 }))
        playSound('win')
      } else if (gameResult.winner === 'Draw') {
        setScores(prev => ({ ...prev, ties: prev.ties + 1 }))
        playSound('draw')
      }
    } else if (!gameResult) {
      hasHandledGameEndRef.current = false
    }
  }, [gameResult, playSound])

  // AI Turn handler
  useEffect(() => {
    if (mode === 'pve' && !xIsNext && !gameResult) {
      const timer = setTimeout(() => {
        const aiMove = getBestMove([...board], difficulty)
        if (aiMove !== null) {
          setBoard(prev => {
            const next = [...prev]
            next[aiMove] = 'O'
            return next
          })
          setXIsNext(true)
          playSound('click')
        }
      }, 400)

      return () => clearTimeout(timer)
    }
  }, [mode, xIsNext, gameResult, board, difficulty, playSound])

  const handleCellClick = (index) => {
    if (board[index] || gameResult || (mode === 'pve' && !xIsNext) || isAiThinking) {
      return
    }

    const nextBoard = [...board]
    nextBoard[index] = xIsNext ? 'X' : 'O'
    setBoard(nextBoard)
    setXIsNext(!xIsNext)
    playSound('click')
  }

  const handleResetRound = () => {
    setBoard(Array(9).fill(null))
    setXIsNext(true)
    hasHandledGameEndRef.current = false
  }

  const handleResetScores = () => {
    handleResetRound()
    setScores({ x: 0, o: 0, ties: 0 })
  }

  const handleModeChange = (newMode) => {
    if (newMode !== mode) {
      setMode(newMode)
      handleResetRound()
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="game-header">
        <div className="title-group">
          <h1 className="game-title">Tic-Tac-Toe</h1>
          <span className="game-subtitle">Modern React Edition</span>
        </div>
        <div className="header-controls">
          <button 
            className="icon-btn" 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* Mode Selector */}
      <nav className="mode-selector" aria-label="Game Mode">
        <button
          className={`mode-tab ${mode === 'pve' ? 'active' : ''}`}
          onClick={() => handleModeChange('pve')}
        >
          🤖 vs Computer
        </button>
        <button
          className={`mode-tab ${mode === 'pvp' ? 'active' : ''}`}
          onClick={() => handleModeChange('pvp')}
        >
          👥 Two Players
        </button>
      </nav>

      {/* AI Difficulty Bar (Only in PvE) */}
      {mode === 'pve' && (
        <div className="difficulty-bar">
          <span>AI Difficulty:</span>
          <button
            className={`difficulty-pill ${difficulty === 'easy' ? 'active' : ''}`}
            onClick={() => setDifficulty('easy')}
          >
            Casual (Easy)
          </button>
          <button
            className={`difficulty-pill ${difficulty === 'hard' ? 'active' : ''}`}
            onClick={() => setDifficulty('hard')}
          >
            Master (Hard)
          </button>
        </div>
      )}

      {/* Scoreboard */}
      <div className="scoreboard">
        <div className="score-card player-x">
          <span className="score-label">{mode === 'pve' ? 'Player (X)' : 'Player X'}</span>
          <span className="score-value">{scores.x}</span>
        </div>
        <div className="score-card ties">
          <span className="score-label">Draws</span>
          <span className="score-value">{scores.ties}</span>
        </div>
        <div className="score-card player-o">
          <span className="score-label">{mode === 'pve' ? 'Computer (O)' : 'Player O'}</span>
          <span className="score-value">{scores.o}</span>
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicator">
          {gameResult ? (
            <span>Game Over</span>
          ) : isAiThinking ? (
            <span>Thinking... 🤖</span>
          ) : (
            <>
              <span className={`turn-badge ${xIsNext ? 'x' : 'o'}`}>
                {xIsNext ? 'X' : 'O'}
              </span>
              <span className="turn-text">
                {mode === 'pve'
                  ? (xIsNext ? 'Your Turn' : "Computer's Turn")
                  : (xIsNext ? "Player X's Turn" : "Player O's Turn")}
              </span>
            </>
          )}
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {board.filter(Boolean).length} / 9 moves
        </span>
      </div>

      {/* Result Announcement Banner */}
      {gameResult && (
        <div className="banner-overlay">
          <div className="banner-content">
            <span className="banner-icon">
              {gameResult.winner === 'Draw' ? '🤝' : '🏆'}
            </span>
            <div className="banner-text-group">
              {gameResult.winner === 'Draw' ? (
                <span className="banner-text draw">It's a Draw!</span>
              ) : (
                <span className={`banner-text ${gameResult.winner === 'X' ? 'winner-x' : 'winner-o'}`}>
                  {mode === 'pve'
                    ? (gameResult.winner === 'X' ? 'You Won! 🎉' : 'Computer Won! 🤖')
                    : `Player ${gameResult.winner} Won! 🎉`}
                </span>
              )}
            </div>
          </div>
          <button className="btn-primary" style={{ padding: '8px 16px', flex: 'none' }} onClick={handleResetRound}>
            Next Round
          </button>
        </div>
      )}

      {/* 3x3 Game Board */}
      <div className="board-container">
        <div className="board-grid">
          {board.map((cell, index) => {
            const isWinningCell = gameResult?.line?.includes(index)
            return (
              <button
                key={index}
                className={`cell ${cell ? (cell === 'X' ? 'cell-x' : 'cell-o') : ''} ${
                  isWinningCell ? 'winning-cell' : ''
                }`}
                onClick={() => handleCellClick(index)}
                disabled={Boolean(cell) || Boolean(gameResult) || isAiThinking}
                aria-label={`Square ${index + 1}, ${cell || 'Empty'}`}
              >
                {cell}
              </button>
            )
          })}
        </div>
      </div>

      {/* Game Action Controls */}
      <div className="controls-group">
        <button className="btn-primary" onClick={handleResetRound}>
          🔄 Play Again
        </button>
        <button className="btn-secondary" onClick={handleResetScores}>
          Reset All
        </button>
      </div>
    </div>
  )
}
