'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Question {
  id: number
  question: string
}

interface GameState {
  phase: 'waiting' | 'question' | 'answering' | 'ranking' | 'results' | 'final'
  currentQuestion?: Question
  currentQuestionIndex: number
  totalQuestions: number
  timeRemaining: number
}

export default function PlayPage() {
  const params = useParams()
  const router = useRouter()
  const gameCode = params.gameCode as string
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    currentQuestionIndex: 0,
    totalQuestions: 0,
    timeRemaining: 0
  })
  const [answer, setAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGameState', gameCode, playerId })
      })
      const data = await response.json()
      if (data.success) {
        // Check if player is still registered in the current game
        const playerExists = data.players?.some((p: any) => p.id === playerId)
        
        if (!playerExists && playerId) {
          // Player was removed (game was reset), clear localStorage and redirect to registration
          localStorage.removeItem('playerId')
          localStorage.removeItem('playerName')
          localStorage.removeItem('gameCode')
          router.replace(`/register/${gameCode}`)
          return
        }
        
        setGameState(data.gameState)
        setScore(data.playerScore || 0)
        
        // Reset answer state when new question starts
        if (data.gameState.currentQuestion && 
            data.gameState.currentQuestion.id !== gameState.currentQuestion?.id) {
          setHasAnswered(false)
          setAnswer('')
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error)
    }
  }, [gameCode, playerId, gameState.currentQuestion, router])

  useEffect(() => {
    // Get player info from localStorage
    const storedPlayerId = localStorage.getItem('playerId')
    const storedPlayerName = localStorage.getItem('playerName')
    const storedGameCode = localStorage.getItem('gameCode')

    if (storedPlayerId && storedPlayerName && storedGameCode === gameCode) {
      setPlayerId(storedPlayerId)
      setPlayerName(storedPlayerName)
    } else {
      // If not registered, redirect to registration
      router.replace(`/register/${gameCode}`)
    }
  }, [gameCode, router])

  useEffect(() => {
    // Poll for game state updates
    if (playerId) {
      const interval = setInterval(fetchGameState, 2000)
      return () => clearInterval(interval)
    }
  }, [playerId, gameCode, fetchGameState])

  const submitAnswer = async () => {
    if (hasAnswered || loading || !answer.trim()) return
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitAnswer',
          gameCode,
          playerId,
          answer: answer.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        setHasAnswered(true)
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🎉 Ann&apos;s Birthday Trivia! 🎉</h1>
          <p className="text-white/80">Player: {playerName} | Score: <span className="font-bold text-yellow-300">{score}</span></p>
        </div>

        {/* Waiting Phase */}
        {gameState.phase === 'waiting' && (
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-white mb-4">Waiting for Game to Start</h2>
            <p className="text-white/80">The judge will start the game soon. Get ready!</p>
          </div>
        )}

        {(gameState.phase === 'question' || gameState.phase === 'answering') && gameState.currentQuestion && (
          <div className="space-y-6">
            {/* Question Header */}
            <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-white/80">
                  Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
                </span>
                <span className="text-yellow-300 font-bold text-xl">
                  {gameState.timeRemaining}s
                </span>
              </div>
              
              <h2 className="text-2xl font-bold text-white text-center mb-4">
                {gameState.currentQuestion.question}
              </h2>
              
              <p className="text-white/80 text-center text-sm">
                Look at the big screen for the question, then type your answer below!
              </p>
            </div>

            {/* Answer Input */}
            <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 text-center">✍️ Your Answer</h3>
              
              <div className="space-y-4">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  disabled={hasAnswered || loading}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl 
                           text-white placeholder-white/70 focus:border-white focus:outline-none
                           resize-none h-24 disabled:opacity-50"
                  maxLength={200}
                />
                
                <div className="flex justify-between items-center text-white/60 text-sm">
                  <span>{answer.length}/200 characters</span>
                  <span>{gameState.timeRemaining}s remaining</span>
                </div>
                
                <button
                  onClick={submitAnswer}
                  disabled={hasAnswered || loading || !answer.trim()}
                  className="w-full bg-green-500 text-white py-3 rounded-xl font-bold text-lg
                           hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300"
                >
                  {loading ? '🔄 Submitting...' : hasAnswered ? '✅ Answer Submitted!' : '📝 Submit Answer'}
                </button>
              </div>
            </div>

            {/* Answer Status */}
            <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-6 text-center">
              {hasAnswered ? (
                <div>
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-white font-semibold">Answer Submitted!</p>
                  <div className="text-white/80 text-sm mt-2 p-3 bg-white/10 rounded-lg">
                    &quot;{answer}&quot;
                  </div>
                  <p className="text-white/60 text-sm mt-2">Waiting for others to finish...</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">🤔</div>
                  <p className="text-white font-semibold">Type Your Answer Above</p>
                  <p className="text-white/80 text-sm">Be creative and have fun!</p>
                </div>
              )}
            </div>
          </div>
        )}


        {gameState.phase === 'results' && (
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🎊</div>
            <h2 className="text-2xl font-bold text-white mb-4">Points Awarded!</h2>
            <p className="text-white/80 mb-6">Check the big screen for the full results!</p>
            
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 p-8 rounded-2xl mb-6">
              <p className="text-2xl font-bold text-yellow-300 mb-4">🏆 Your Score Update! 🏆</p>
              <p className="text-5xl font-bold text-white mb-2">{score}</p>
              <p className="text-xl text-yellow-300">Total Points</p>
            </div>

            <p className="text-white/60 text-lg">Waiting for next question...</p>
          </div>
        )}

        {gameState.phase === 'ranking' && (
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⚖️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Judge is Reviewing Answers</h2>
            <p className="text-white/80 mb-6">All answers are being ranked by the judge...</p>
            
            <div className="bg-white/10 p-6 rounded-xl mb-6">
              <p className="text-xl font-bold text-yellow-300 mb-2">Your Current Score</p>
              <p className="text-3xl font-bold text-white">{score} points</p>
            </div>

            <div className="animate-pulse text-2xl mb-4">🔄</div>
            <p className="text-white/60">Results coming soon...</p>
          </div>
        )}

        {gameState.phase === 'final' && (
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-white mb-4">Game Complete!</h2>
            <p className="text-white/80 mb-6">Thanks for celebrating Ann&apos;s 30th birthday!</p>
            
            <div className="bg-white/10 p-6 rounded-xl mb-6">
              <p className="text-2xl font-bold text-yellow-300 mb-2">Your Final Score</p>
              <p className="text-4xl font-bold text-white">{score} points</p>
            </div>

            <div className="space-y-3">
              <p className="text-white font-semibold">🎂 Happy 30th Birthday Ann! 🎂</p>
              <p className="text-white/80">Hope you had fun with the trivia!</p>
            </div>

            <button
              onClick={() => window.location.href = '/'}
              className="mt-6 bg-blue-500 text-white px-8 py-3 rounded-xl font-bold
                       hover:bg-blue-600 transition-all duration-300"
            >
              🏠 Back to Home
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <button
            onClick={() => window.location.href = '/'}
            className="text-white/70 hover:text-white text-sm"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
