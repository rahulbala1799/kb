'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export default function RegisterPage() {
  const router = useRouter()
  const gameCode = 'ANNS30TH' // Fixed game code
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [registered, setRegistered] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if already registered for this game by verifying with the server
    const checkRegistration = async () => {
      const storedPlayerId = localStorage.getItem('playerId')
      const storedPlayerName = localStorage.getItem('playerName')

      if (storedPlayerId && storedPlayerName) {
        try {
          // Verify player still exists in the current game
          const response = await fetch('/api/game', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getGameState', playerId: storedPlayerId })
          })
          const data = await response.json()
          
          if (data.success) {
            const playerExists = data.players?.some((p: { id: string }) => p.id === storedPlayerId)
            
            if (playerExists) {
              // Player still exists in current game, redirect to play
              setPlayerId(storedPlayerId)
              setPlayerName(storedPlayerName)
              setRegistered(true)
              router.push(`/play/${gameCode}`)
              return
            }
          }
        } catch (error) {
          console.error('Error checking registration:', error)
        }
        
        // If we reach here, player doesn't exist in current game (game was reset)
        // Clear localStorage and allow re-registration
        localStorage.removeItem('playerId')
        localStorage.removeItem('playerName')
        localStorage.removeItem('gameCode')
      }
    }

    checkRegistration()
  }, [router])

  const handleRegister = async () => {
    if (!playerName.trim() || loading) return

    setLoading(true)
    const newPlayerId = uuidv4()

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registerPlayer',
          playerId: newPlayerId,
          playerName: playerName.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        localStorage.setItem('playerId', newPlayerId)
        localStorage.setItem('playerName', playerName.trim())
        localStorage.setItem('gameCode', gameCode)
        setPlayerId(newPlayerId)
        setRegistered(true)
        router.push(`/play/${gameCode}`) // Redirect to play page
      } else {
        alert(`Registration failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('An error occurred during registration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-6">🎉 Join Ann&apos;s Birthday Party! 🎉</h1>
        <p className="text-white/80 mb-4">Game Code: <span className="font-bold text-yellow-300">{gameCode}</span></p>

        {!registered ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl 
                       text-white placeholder-white/70 focus:border-white focus:outline-none"
              maxLength={50}
            />
            <button
              onClick={handleRegister}
              disabled={!playerName.trim() || loading}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-bold text-lg
                       hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-300"
            >
              {loading ? 'Registering...' : '🎊 Register & Play! 🎊'}
            </button>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-white font-semibold text-xl mb-2">Registered as {playerName}!</p>
            <p className="text-white/80 text-sm">Your Player ID: {playerId.slice(-6)}</p>
            <p className="text-white/60 text-sm mt-4">Redirecting to game...</p>
          </div>
        )}
      </div>
    </div>
  )
}
