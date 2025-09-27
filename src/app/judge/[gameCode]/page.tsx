'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

interface Answer {
  id: string
  answer: string
  rank?: number
}

interface GameState {
  phase: 'waiting' | 'question' | 'answering' | 'ranking' | 'results' | 'final'
  currentQuestionIndex: number
  totalQuestions: number
  answers?: Answer[]
}

export default function JudgePage() {
  const params = useParams()
  const gameCode = (params?.gameCode as string) || 'DEMO123'
  const [judgeName, setJudgeName] = useState('')
  const [isJudge, setIsJudge] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    currentQuestionIndex: 0,
    totalQuestions: 3
  })
  const [answers, setAnswers] = useState<Answer[]>([])
  const [rankings, setRankings] = useState<{ [key: string]: number }>({})

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getJudgeGameState', gameCode })
      })
      const data = await response.json()
      if (data.success) {
        setGameState(data.gameState)
        if (data.gameState.answers) {
          setAnswers(data.gameState.answers)
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error)
    }
  }, [gameCode])

  useEffect(() => {
    // Poll for game state updates
    if (isJudge) {
      const interval = setInterval(fetchGameState, 2000)
      return () => clearInterval(interval)
    }
  }, [isJudge, gameCode, fetchGameState])

  const handleBecomeJudge = async () => {
    if (!judgeName.trim()) return
    
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'registerJudge', gameCode, judgeName })
      })
      const data = await response.json()
      if (data.success) {
        setIsJudge(true)
      }
    } catch (error) {
      console.error('Error registering as judge:', error)
    }
  }

  const handleRankAnswer = (answerId: string, rank: number) => {
    const newRankings = { ...rankings }
    
    // Remove this rank from any other answer
    Object.keys(newRankings).forEach(id => {
      if (newRankings[id] === rank) {
        delete newRankings[id]
      }
    })
    
    // Assign rank to this answer
    newRankings[answerId] = rank
    setRankings(newRankings)
  }

  const submitRankings = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submitRankings', 
          gameCode, 
          rankings 
        })
      })
      const data = await response.json()
      if (data.success) {
        setRankings({}) // Reset for next question
      }
    } catch (error) {
      console.error('Error submitting rankings:', error)
    }
  }

  const goHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <button onClick={goHome} className="text-white/70 hover:text-white mb-4">← Back to Home</button>
          <h1 className="text-3xl font-bold text-white mb-2">👨‍⚖️ Judge Interface</h1>
          <p className="text-white/80">Game: {gameCode}</p>
        </div>

        {!isJudge ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">👨‍⚖️ Become Judge</h2>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl 
                           text-white placeholder-white/70 focus:border-white focus:outline-none"
                />
                <button
                  onClick={handleBecomeJudge}
                  disabled={!judgeName.trim()}
                  className="w-full bg-green-500 text-white py-3 rounded-xl font-bold
                           hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-300"
                >
                  🎊 Join as Judge 🎊
                </button>
              </div>

              <div className="mt-6 text-center text-white/80 text-sm">
                <p>As the judge, you&apos;ll rank player answers</p>
                <p>and award points during the game.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Game Status */}
            <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                {gameState.phase === 'waiting' && '⏳ Waiting for Game to Start'}
                {gameState.phase === 'question' && '❓ Question Being Asked'}
                {gameState.phase === 'answering' && '✍️ Players Answering'}
                {gameState.phase === 'ranking' && '🏆 Time to Rank Answers!'}
                {gameState.phase === 'results' && '📊 Showing Results'}
                {gameState.phase === 'final' && '🎉 Game Complete!'}
              </h2>
              
              <p className="text-white/80">
                Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
              </p>
            </div>

            {/* Ranking Interface */}
            {gameState.phase === 'ranking' && answers.length > 0 && (
              <div>
                <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-6 mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4 text-center">🏆 Rank the Answers</h2>
                  <p className="text-white/80 text-center mb-6">
                    Tap the medal buttons to rank answers. Multiple answers can have the same rank.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {answers.map((answer) => (
                      <div key={answer.id} className="bg-white/10 p-6 rounded-xl">
                        <div className="text-white/80 text-sm mb-2">Player {answer.id.slice(-4)}</div>
                        <div className="text-xl text-white mb-4 p-4 bg-white/10 rounded-lg">
                          &quot;{answer.answer}&quot;
                        </div>
                        
                        <div className="flex space-x-2 justify-center">
                          <button
                            onClick={() => handleRankAnswer(answer.id, 1)}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${
                              rankings[answer.id] === 1 
                                ? 'bg-yellow-500 text-black' 
                                : 'bg-white/20 text-white hover:bg-yellow-500/30'
                            }`}
                          >
                            🥇 1st
                          </button>
                          <button
                            onClick={() => handleRankAnswer(answer.id, 2)}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${
                              rankings[answer.id] === 2 
                                ? 'bg-gray-400 text-black' 
                                : 'bg-white/20 text-white hover:bg-gray-400/30'
                            }`}
                          >
                            🥈 2nd
                          </button>
                          <button
                            onClick={() => handleRankAnswer(answer.id, 3)}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${
                              rankings[answer.id] === 3 
                                ? 'bg-orange-500 text-black' 
                                : 'bg-white/20 text-white hover:bg-orange-500/30'
                            }`}
                          >
                            🥉 3rd
                          </button>
                          <button
                            onClick={() => {
                              const newRankings = { ...rankings }
                              delete newRankings[answer.id]
                              setRankings(newRankings)
                            }}
                            className="px-4 py-2 bg-red-500/20 text-white rounded-lg hover:bg-red-500/30 transition-all"
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center mt-8">
                    <button
                      onClick={submitRankings}
                      disabled={Object.keys(rankings).length === 0}
                      className="bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-xl
                               hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed
                               transition-all duration-300"
                    >
                      ✅ Submit Rankings
                    </button>
                  </div>
                  
                  <div className="mt-4 text-center text-white/60 text-sm">
                    <p>1st Place = 100 points | 2nd Place = 50 points | 3rd Place = 25 points</p>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting States */}
            {gameState.phase !== 'ranking' && (
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
                {gameState.phase === 'waiting' && (
                  <div>
                    <div className="text-6xl mb-4">⏳</div>
                    <p className="text-xl text-white">Waiting for players to join and game to start...</p>
                  </div>
                )}
                
                {gameState.phase === 'question' && (
                  <div>
                    <div className="text-6xl mb-4">❓</div>
                    <p className="text-xl text-white">Question is being displayed on the big screen...</p>
                  </div>
                )}
                
                {gameState.phase === 'answering' && (
                  <div>
                    <div className="text-6xl mb-4">✍️</div>
                    <p className="text-xl text-white">Players are typing their answers...</p>
                  </div>
                )}
                
                {gameState.phase === 'results' && (
                  <div>
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-xl text-white">Results are being shown on the big screen...</p>
                  </div>
                )}
                
                {gameState.phase === 'final' && (
                  <div>
                    <div className="text-6xl mb-4">🎉</div>
                    <p className="text-xl text-white">Game completed! Final results are displayed.</p>
                    <button
                      onClick={goHome}
                      className="mt-6 bg-blue-500 text-white px-8 py-3 rounded-xl font-bold
                               hover:bg-blue-600 transition-all duration-300"
                    >
                      🏠 Back to Home
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
