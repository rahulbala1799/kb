'use client'

import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import Image from 'next/image'

interface Player {
  id: string
  name: string
  score: number
  hasAnswered: boolean
  answer?: string
}

interface GameState {
  phase: 'waiting' | 'question' | 'answering' | 'ranking' | 'results' | 'final'
  currentQuestionIndex: number
  totalQuestions: number
  timeRemaining: number
  currentQuestion?: {
    id: number
    question: string
  }
  answers?: Array<{
    id: string
    answer: string
    rank?: number
  }>
}

export default function Home() {
  const [gameCode, setGameCode] = useState('ANNS30TH') // Fixed game code for the party
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [judgeQrCodeUrl, setJudgeQrCodeUrl] = useState('')

  // Generate anonymous player ID for display
  const getAnonymousPlayerId = (playerId: string) => {
    // Use last 4 characters of player ID for anonymous display
    return `Player ${playerId.slice(-4).toUpperCase()}`
  }
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    currentQuestionIndex: 0,
    totalQuestions: 3,
    timeRemaining: 0
  })
  const [players, setPlayers] = useState<Player[]>([])
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getOrCreateGame' })
      })
      const data = await response.json()
      if (data.success) {
        setGameCode(data.gameCode)
        setGameState(data.gameState)
        setPlayers(data.players)
      }
    } catch (error) {
      console.error('Error fetching game state:', error)
    }
  }, [])

  useEffect(() => {
    // Generate QR codes for player registration and judge interface
    const registrationUrl = `${window.location.origin}/register/ANNS30TH`
    const judgeUrl = `${window.location.origin}/judge/ANNS30TH`
    
    QRCode.toDataURL(registrationUrl)
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err))
      
    QRCode.toDataURL(judgeUrl)
      .then(url => setJudgeQrCodeUrl(url))
      .catch(err => console.error(err))
  }, [gameCode])

  useEffect(() => {
    // Poll for game state updates
    const interval = setInterval(fetchGameState, 2000)
    return () => clearInterval(interval)
  }, [fetchGameState])

  const startGame = async () => {
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startGame' })
      })
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  const nextQuestion = async () => {
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'nextQuestion' })
      })
    } catch (error) {
      console.error('Error going to next question:', error)
    }
  }

  const showFinalResults = async () => {
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'showFinalResults' })
      })
    } catch (error) {
      console.error('Error showing final results:', error)
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
        // Clear localStorage for players
        localStorage.removeItem('playerId')
        localStorage.removeItem('playerName')
        // Reset local state
        setPlayers([])
        setGameState({
          phase: 'waiting',
          currentQuestionIndex: 0,
          totalQuestions: 3,
          timeRemaining: 0
        })
        setShowResetConfirm(false)
      }
    } catch (error) {
      console.error('Error resetting game:', error)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600 text-white">
      {/* Waiting Phase - Spectacular Birthday Homepage */}
      {gameState.phase === 'waiting' && (
        <div className="relative min-h-screen overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300 rounded-full animate-pulse"></div>
              <div className="absolute top-32 right-20 w-16 h-16 bg-pink-300 rounded-full animate-bounce delay-100"></div>
              <div className="absolute bottom-20 left-32 w-24 h-24 bg-purple-300 rounded-full animate-pulse delay-200"></div>
              <div className="absolute bottom-40 right-16 w-12 h-12 bg-blue-300 rounded-full animate-bounce delay-300"></div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
            <div className="text-center max-w-7xl w-full">
              {/* Main Birthday Header */}
              <div className="mb-12">
                <div className="flex justify-center items-center mb-8">
                  <div className="text-9xl animate-bounce mr-4">🎉</div>
                  <div className="text-9xl animate-bounce delay-100 mr-4">🎂</div>
                  <div className="text-9xl animate-bounce delay-200">🎊</div>
                </div>
                
                <h1 className="text-8xl font-black mb-6 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent animate-pulse">
                  HAPPY 30TH
                </h1>
                <h2 className="text-6xl font-bold mb-8 text-white drop-shadow-2xl">
                  🌟 ANN&apos;S BIRTHDAY BASH! 🌟
                </h2>
                <div className="text-3xl mb-8 text-yellow-200 font-semibold">
                  🎮 Let&apos;s Play Birthday Trivia! 🎮
                </div>
              </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8 items-start">
                {/* QR Code Section */}
                <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 shadow-2xl">
                  <div className="text-4xl mb-6">📱✨</div>
                  <h3 className="text-3xl font-bold mb-6 text-yellow-200">Scan to Join!</h3>
                  {qrCodeUrl && (
                    <div className="bg-white p-8 rounded-3xl inline-block mb-6 shadow-xl transform hover:scale-105 transition-transform">
                      <Image src={qrCodeUrl} alt="QR Code" width={280} height={280} />
                    </div>
                  )}
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-6 py-4 rounded-2xl font-black text-2xl mb-4">
                    {gameCode}
                  </div>
                  <p className="text-lg text-white/90">Point your camera here!</p>
                </div>

                {/* Judge QR Code Section */}
                <div className="bg-gradient-to-br from-red-500/30 to-orange-500/30 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 shadow-2xl">
                  <div className="text-4xl mb-6">👑⚖️</div>
                  <h3 className="text-3xl font-bold mb-6 text-yellow-200">Judge Access!</h3>
                  {judgeQrCodeUrl && (
                    <div className="bg-white p-8 rounded-3xl inline-block mb-6 shadow-xl transform hover:scale-105 transition-transform">
                      <Image src={judgeQrCodeUrl} alt="Judge QR Code" width={280} height={280} />
                    </div>
                  )}
                  <div className="bg-gradient-to-r from-red-400 to-pink-400 text-white px-6 py-4 rounded-2xl font-black text-2xl mb-4">
                    JUDGE
                  </div>
                  <p className="text-lg text-white/90">For Ann to control the game!</p>
                </div>

                {/* Players List */}
                <div className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 shadow-2xl">
                  <div className="text-4xl mb-6">👥🎊</div>
                  <h3 className="text-3xl font-bold mb-6 text-yellow-200">Party Players ({players.length})</h3>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {players.length === 0 ? (
                      <div className="py-16">
                        <div className="text-6xl mb-4 animate-pulse">⏳</div>
                        <p className="text-white/70 text-xl">Waiting for birthday guests...</p>
                      </div>
                    ) : (
                      players.map((player, index) => (
                        <div key={player.id} className="bg-gradient-to-r from-white/20 to-white/10 p-4 rounded-2xl flex justify-between items-center transform hover:scale-105 transition-transform">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{index === 0 ? '👑' : '🎉'}</div>
                            <span className="text-xl font-bold text-white">{player.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-green-300 text-2xl">✅</span>
                            <span className="text-yellow-300 font-bold">{player.score} pts</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {players.length > 0 && (
                    <button
                      onClick={startGame}
                      className="mt-8 w-full bg-gradient-to-r from-green-400 to-blue-500 text-white px-8 py-6 rounded-2xl font-black text-2xl
                               hover:from-green-500 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-xl"
                    >
                      🚀 START THE PARTY! 🚀
                    </button>
                  )}
                </div>

                {/* Game Info & Instructions */}
                <div className="bg-gradient-to-br from-indigo-500/30 to-purple-500/30 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 shadow-2xl">
                  <div className="text-4xl mb-6">🎯🎂</div>
                  <h3 className="text-3xl font-bold mb-6 text-yellow-200">How to Play</h3>
                  <div className="space-y-4 text-left">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">1️⃣</div>
                      <div className="text-lg text-white/90">Scan QR code with your phone camera</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">2️⃣</div>
                      <div className="text-lg text-white/90">Enter your name to join</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">3️⃣</div>
                      <div className="text-lg text-white/90">Answer trivia questions about Ann!</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">4️⃣</div>
                      <div className="text-lg text-white/90">Ann judges the best answers</div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">🏆</div>
                      <div className="text-lg text-white/90">Win points and celebrate!</div>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-4 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-2xl">
                    <div className="text-2xl mb-2">🎊 Scoring 🎊</div>
                    <div className="text-sm text-white/80 space-y-1">
                      <div>🥇 1st Place: 100 points</div>
                      <div>🥈 2nd Place: 50 points</div>
                      <div>🥉 3rd Place: 25 points</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Phase - Enhanced Question Display */}
      {(gameState.phase === 'question' || gameState.phase === 'answering') && gameState.currentQuestion && (
        <div className="relative min-h-screen overflow-hidden">
          {/* Dynamic Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-400 rounded-full animate-pulse"></div>
              <div className="absolute bottom-32 right-32 w-24 h-24 bg-pink-400 rounded-full animate-bounce"></div>
              <div className="absolute top-1/2 left-10 w-16 h-16 bg-blue-400 rounded-full animate-pulse delay-100"></div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
            <div className="text-center max-w-7xl w-full">
              {/* Question Header */}
              <div className="mb-12">
                <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-lg rounded-3xl p-6 border-2 border-white/30">
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">❓</div>
                    <span className="text-3xl font-bold text-yellow-200">
                      Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">⏰</div>
                    <span className="text-yellow-300 font-black text-5xl animate-pulse">
                      {gameState.timeRemaining}s
                    </span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-lg border-4 border-yellow-300/50 rounded-3xl p-12 mb-8 shadow-2xl">
                  <div className="text-6xl mb-6">🎂</div>
                  <h1 className="text-6xl font-black mb-4 text-white drop-shadow-2xl leading-tight">
                    {gameState.currentQuestion.question}
                  </h1>
                  <div className="text-2xl text-yellow-200 font-semibold">
                    📱 Answer on your phone! 📱
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Player Status */}
                <div className="bg-gradient-to-br from-green-500/30 to-blue-500/30 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 shadow-2xl">
                  <div className="text-4xl mb-6">👥📝</div>
                  <h3 className="text-3xl font-bold mb-6 text-yellow-200">Player Status</h3>
                  <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                    {players.map((player) => (
                      <div key={player.id} className={`p-4 rounded-2xl text-center transition-all duration-500 ${
                        player.hasAnswered 
                          ? 'bg-gradient-to-r from-green-400/40 to-emerald-400/40 border-2 border-green-300 transform scale-105' 
                          : 'bg-white/10 border-2 border-white/20 animate-pulse'
                      }`}>
                        <div className="text-2xl mb-2">
                          {player.hasAnswered ? '✅' : '⏳'}
                        </div>
                        <div className="text-lg font-bold text-white">{player.name}</div>
                        <div className="text-sm mt-2 text-white/80">
                          {player.hasAnswered ? 'Submitted!' : 'Thinking...'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Answers Display */}
                <div className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 shadow-2xl">
                  <div className="text-4xl mb-6">💬✨</div>
                  <h3 className="text-3xl font-bold mb-6 text-yellow-200">Live Answers</h3>
                  <div className="max-h-80 overflow-y-auto">
                    {players.filter(p => p.hasAnswered && p.answer).length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="text-6xl mb-4 animate-bounce">⏳</div>
                        <p className="text-white/70 text-xl">Waiting for answers...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {players
                          .filter(p => p.hasAnswered && p.answer)
                          .map((player) => (
                            <div key={player.id} className="bg-gradient-to-r from-white/20 to-white/10 p-6 rounded-2xl text-left border border-white/20 transform hover:scale-105 transition-transform">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className="text-2xl">💭</div>
                                <div className="text-white/80 font-bold">{getAnonymousPlayerId(player.id)}</div>
                              </div>
                              <div className="text-xl text-white font-medium bg-white/10 p-4 rounded-xl">
                                &quot;{player.answer}&quot;
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 text-center">
                    <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-2xl p-4">
                      <div className="text-2xl font-bold text-yellow-200">
                        {players.filter(p => p.hasAnswered).length} of {players.length} answered
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Phase - Show Ranked Answers */}
      {gameState.phase === 'results' && gameState.answers && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-6xl w-full">
            <h1 className="text-5xl font-bold mb-8">🏆 Results - Question {gameState.currentQuestionIndex + 1}</h1>
            
            <div className="space-y-6 mb-8">
              {gameState.answers
                .filter(answer => answer.rank && answer.rank <= 3)
                .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                .map((answer) => (
                  <div key={answer.id} className={`p-8 rounded-3xl border-4 ${
                    answer.rank === 1 ? 'bg-yellow-500/30 border-yellow-400' :
                    answer.rank === 2 ? 'bg-gray-400/30 border-gray-400' :
                    answer.rank === 3 ? 'bg-orange-500/30 border-orange-400' :
                    'bg-white/10 border-white/20'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="text-left flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <span className="text-4xl">
                            {answer.rank === 1 ? '🥇' : answer.rank === 2 ? '🥈' : answer.rank === 3 ? '🥉' : ''}
                          </span>
                          <span className="text-2xl font-bold">
                            {answer.rank === 1 ? '1st Place' : answer.rank === 2 ? '2nd Place' : answer.rank === 3 ? '3rd Place' : ''}
                          </span>
                          <span className="text-xl text-white/80">Player {answer.id.slice(-4)}</span>
                        </div>
                        <div className="text-xl bg-white/10 p-4 rounded-xl">
                          &quot;{answer.answer}&quot;
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <div className="text-yellow-300 font-bold text-3xl">
                          {answer.rank === 1 ? '100' : answer.rank === 2 ? '50' : answer.rank === 3 ? '25' : '0'} pts
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Next Question Button */}
            <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-8">
              {gameState.currentQuestionIndex < gameState.totalQuestions - 1 ? (
                <button
                  onClick={nextQuestion}
                  className="bg-blue-500 text-white px-12 py-6 rounded-xl font-bold text-2xl
                           hover:bg-blue-600 transition-all duration-300"
                >
                  ➡️ Next Question
                </button>
              ) : (
                <button
                  onClick={showFinalResults}
                  className="bg-purple-500 text-white px-12 py-6 rounded-xl font-bold text-2xl
                           hover:bg-purple-600 transition-all duration-300"
                >
                  🏆 Final Results
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Final Results */}
      {gameState.phase === 'final' && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-4xl w-full">
            <div className="text-8xl mb-6">🏆</div>
            <h1 className="text-6xl font-bold mb-8">🎂 Final Results! 🎂</h1>
            
            <div className="space-y-6">
              {players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div key={player.id} className={`p-8 rounded-3xl border-4 ${
                    index === 0 ? 'bg-yellow-500/30 border-yellow-400' :
                    index === 1 ? 'bg-gray-400/30 border-gray-400' :
                    index === 2 ? 'bg-orange-500/30 border-orange-400' :
                    'bg-white/10 border-white/20'
                  } flex justify-between items-center`}>
                    <div className="flex items-center space-x-6">
                      <span className="text-4xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="text-4xl font-bold">{player.name}</span>
                    </div>
                    <span className="text-yellow-300 font-bold text-4xl">{player.score} points</span>
                  </div>
                ))}
            </div>
            
            <div className="mt-12">
              <h2 className="text-4xl font-bold mb-4">🎉 Happy Birthday Ann! 🎉</h2>
              <p className="text-2xl">Thanks for playing!</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Controls */}
      <div className="fixed bottom-4 right-4 space-y-3 z-50">
        <div>
          <a 
            href={`/judge/ANNS30TH`}
            className="block bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all duration-300 shadow-lg text-center relative z-10"
          >
            👑 Judge Interface
          </a>
        </div>
        
        {/* Reset Game Button - Only show if game is active */}
        {(gameState.phase !== 'waiting' || players.length > 0) && (
          <div>
            <button
              onClick={() => setShowResetConfirm(true)}
                  className="block bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-all duration-300 shadow-lg w-full relative z-10"
            >
              🔄 Reset Game
            </button>
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-red-500/90 to-pink-500/90 backdrop-blur-lg border-2 border-white/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-6">⚠️</div>
              <h2 className="text-3xl font-bold text-white mb-4">Reset Game?</h2>
              <p className="text-xl text-white/90 mb-2">This will:</p>
              <div className="text-white/80 mb-6 space-y-2">
                <div>• End the current game</div>
                <div>• Remove all players</div>
                <div>• Clear all scores</div>
                <div>• Start fresh from the beginning</div>
              </div>
              
              {gameState.phase !== 'waiting' && (
                <div className="bg-yellow-400/20 border-2 border-yellow-300/50 rounded-2xl p-4 mb-6">
                  <div className="text-yellow-200 font-bold text-lg mb-2">⚠️ Game in Progress!</div>
                  <div className="text-yellow-100 text-sm">
                    You are currently on Question {gameState.currentQuestionIndex + 1}. 
                    All progress will be lost!
                  </div>
                </div>
              )}

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
                  {isResetting ? '🔄 Resetting...' : '✅ Yes, Reset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}