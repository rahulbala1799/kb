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
  const gameCode = (params?.gameCode as string) || 'ANNS30TH'
  const [judgeName, setJudgeName] = useState('')
  const [isJudge, setIsJudge] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    currentQuestionIndex: 0,
    totalQuestions: 3
  })
  const [answers, setAnswers] = useState<Answer[]>([])
  const [rankings, setRankings] = useState<{ [key: string]: number }>({})
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getJudgeGameState' })
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
  }, [])

  useEffect(() => {
    // Check if judge is already registered
    const storedJudgeName = localStorage.getItem('judgeName')
    if (storedJudgeName) {
      setJudgeName(storedJudgeName)
      setIsJudge(true)
    }
  }, [])

  useEffect(() => {
    // Always poll for game state updates
    const interval = setInterval(fetchGameState, 2000)
    return () => clearInterval(interval)
  }, [fetchGameState])

  const handleBecomeJudge = async () => {
    if (!judgeName.trim()) return
    
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'registerJudge', judgeName })
      })
      const data = await response.json()
      if (data.success) {
        localStorage.setItem('judgeName', judgeName.trim())
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

  const startRanking = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'startRanking'
        })
      })
      const data = await response.json()
      if (data.success) {
        // This will move the game to ranking phase
      }
    } catch (error) {
      console.error('Error starting ranking:', error)
    }
  }

  const submitRankings = async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'submitRankings', 
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

  const handleResetGame = async () => {
    setIsResetting(true)
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetGame' })
      })
      
      const data = await response.json()
      if (data.success) {
        setShowResetConfirm(false)
        // Game will automatically refresh to waiting state
      }
    } catch (error) {
      console.error('Error resetting game:', error)
    } finally {
      setIsResetting(false)
    }
  }

  const goHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600">
      <div className="max-w-6xl mx-auto p-4">
        {/* Enhanced Header */}
        <div className="text-center mb-8 relative z-30">
          <div className="flex justify-between items-center mb-6 relative z-40">
            <button 
              onClick={goHome} 
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 backdrop-blur-sm border border-white/30 relative z-50 pointer-events-auto"
            >
              ← Back to Big Screen
            </button>
            
            {/* Reset Game Button for Judge */}
            {(gameState.phase !== 'waiting') && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="bg-red-500/80 hover:bg-red-600/80 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 backdrop-blur-sm border border-red-300/50 relative z-50 pointer-events-auto"
              >
                🔄 Reset Game
              </button>
            )}
          </div>
          
          <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 shadow-2xl">
            <div className="text-6xl mb-4">👑⚖️</div>
            <h1 className="text-5xl font-black text-white mb-4 drop-shadow-2xl">JUDGE CONTROL CENTER</h1>
            <div className="text-2xl text-yellow-200 font-semibold">Ann&apos;s Birthday Trivia • {gameCode}</div>
          </div>
        </div>

        {!isJudge ? (
          <div className="max-w-lg mx-auto">
            <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-10 shadow-2xl">
              <div className="text-center mb-8">
                <div className="text-8xl mb-6">👑</div>
                <h2 className="text-4xl font-bold text-white mb-4">Welcome, Birthday Judge!</h2>
                <p className="text-xl text-white/80 mb-6">Enter your name to control the trivia game</p>
              </div>
              
              <div className="space-y-6">
                <input
                  type="text"
                  placeholder="Enter your name (e.g., Ann)"
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                  className="w-full px-6 py-4 bg-white/20 border-2 border-white/30 rounded-2xl 
                           text-white placeholder-white/70 focus:border-yellow-300 focus:outline-none
                           text-xl font-semibold backdrop-blur-sm"
                />
                <button
                  onClick={handleBecomeJudge}
                  disabled={!judgeName.trim()}
                  className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-4 rounded-2xl font-black text-xl
                           hover:from-green-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                           transform hover:scale-105 transition-all duration-300 shadow-xl"
                >
                  🎊 START JUDGING! 🎊
                </button>
              </div>

              <div className="mt-8 text-center">
                <div className="bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl p-6">
                  <div className="text-2xl mb-3">🎯 Your Powers</div>
                  <div className="text-white/90 space-y-2">
                    <div>• Rank player answers</div>
                    <div>• Award points (100/50/25)</div>
                    <div>• Control game flow</div>
                    <div>• Make it fun for everyone!</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Enhanced Game Status */}
            <div className="bg-gradient-to-r from-indigo-500/30 to-purple-500/30 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 text-center shadow-2xl">
              <div className="text-5xl mb-4">
                {gameState.phase === 'waiting' && '⏳'}
                {gameState.phase === 'question' && '❓'}
                {gameState.phase === 'answering' && '✍️'}
                {gameState.phase === 'ranking' && '🏆'}
                {gameState.phase === 'results' && '📊'}
                {gameState.phase === 'final' && '🎉'}
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-6">
                {gameState.phase === 'waiting' && 'Waiting for Game to Start'}
                {gameState.phase === 'question' && 'Question Being Asked'}
                {gameState.phase === 'answering' && 'Players Answering - Check Big Screen!'}
                {gameState.phase === 'ranking' && 'Time to Rank Answers!'}
                {gameState.phase === 'results' && 'Showing Results'}
                {gameState.phase === 'final' && 'Game Complete!'}
              </h2>
              
              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-2xl p-4 inline-block">
                <p className="text-2xl font-bold text-yellow-200">
                  Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
                </p>
              </div>

              {/* Judge Status */}
              <div className="mt-6 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-2xl p-4">
                <div className="text-2xl font-bold text-white">
                  👑 Judge: {judgeName} 👑
                </div>
              </div>
            </div>

            {/* Start Ranking Button - Show during answering phase */}
            {gameState.phase === 'answering' && (
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-white mb-4">📝 Answers Coming In!</h3>
                <p className="text-white/80 mb-6">Watch the big screen to see player answers in real-time.</p>
                <p className="text-white/60 mb-6">When you&apos;re ready to rank the answers, click below:</p>
                
                <button
                  onClick={startRanking}
                  className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-xl
                           hover:bg-blue-600 transition-all duration-300 relative z-10"
                >
                  🏆 Start Ranking Answers
                </button>
              </div>
            )}

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
                            className={`px-4 py-2 rounded-lg font-bold transition-all relative z-10 ${
                              rankings[answer.id] === 1 
                                ? 'bg-yellow-500 text-black' 
                                : 'bg-white/20 text-white hover:bg-yellow-500/30'
                            }`}
                          >
                            🥇 1st
                          </button>
                          <button
                            onClick={() => handleRankAnswer(answer.id, 2)}
                            className={`px-4 py-2 rounded-lg font-bold transition-all relative z-10 ${
                              rankings[answer.id] === 2 
                                ? 'bg-gray-400 text-black' 
                                : 'bg-white/20 text-white hover:bg-gray-400/30'
                            }`}
                          >
                            🥈 2nd
                          </button>
                          <button
                            onClick={() => handleRankAnswer(answer.id, 3)}
                            className={`px-4 py-2 rounded-lg font-bold transition-all relative z-10 ${
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
                            className="px-4 py-2 bg-red-500/20 text-white rounded-lg hover:bg-red-500/30 transition-all relative z-10"
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
                               transition-all duration-300 relative z-10"
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

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-red-500/90 to-pink-500/90 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <div className="text-center">
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="text-3xl font-bold text-white mb-4">Reset Entire Game?</h2>
                <p className="text-xl text-white/90 mb-2">This will:</p>
                <div className="text-white/80 mb-6 space-y-2">
                  <div>• End the current game immediately</div>
                  <div>• Remove ALL players</div>
                  <div>• Clear ALL scores and answers</div>
                  <div>• Return to waiting screen</div>
                  <div>• Players must re-register</div>
                </div>
                
                <div className="bg-yellow-400/20 border-2 border-yellow-300/50 rounded-2xl p-4 mb-6">
                  <div className="text-yellow-200 font-bold text-lg mb-2">👑 Judge Power!</div>
                  <div className="text-yellow-100 text-sm">
                    As the judge, you can reset the game at any time. 
                    Use this if you want to start completely fresh.
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-white/20 text-white py-3 rounded-xl font-bold hover:bg-white/30 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetGame}
                    disabled={isResetting}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isResetting ? '🔄 Resetting...' : '✅ Reset Game'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
