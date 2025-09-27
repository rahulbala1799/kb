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
  const [gameCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase())
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    currentQuestionIndex: 0,
    totalQuestions: 3,
    timeRemaining: 0
  })
  const [players, setPlayers] = useState<Player[]>([])

  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getGameState', gameCode })
      })
      const data = await response.json()
      if (data.success) {
        setGameState(data.gameState)
        setPlayers(data.players)
      }
    } catch (error) {
      console.error('Error fetching game state:', error)
    }
  }, [gameCode])

  useEffect(() => {
    // Generate QR code for player registration
    const registrationUrl = `${window.location.origin}/register/${gameCode}`
    QRCode.toDataURL(registrationUrl)
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error(err))
  }, [gameCode])

  useEffect(() => {
    // Poll for game state updates
    const interval = setInterval(fetchGameState, 2000)
    return () => clearInterval(interval)
  }, [gameCode, fetchGameState])

  const startGame = async () => {
    try {
      await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'startGame', gameCode })
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
        body: JSON.stringify({ action: 'nextQuestion', gameCode })
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
        body: JSON.stringify({ action: 'showFinalResults', gameCode })
      })
    } catch (error) {
      console.error('Error showing final results:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600 text-white">
      {/* Waiting Phase - Show QR Code */}
      {gameState.phase === 'waiting' && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-6xl w-full">
            <div className="mb-8">
              <div className="text-8xl mb-4 animate-bounce">🎉</div>
              <h1 className="text-6xl font-bold mb-4">Happy 30th Birthday!</h1>
              <h2 className="text-4xl font-semibold mb-6">Ann! 🎂</h2>
              <p className="text-2xl mb-8">Let&apos;s play birthday trivia!</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* QR Code */}
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-8">
                <h3 className="text-3xl font-bold mb-6">📱 Scan to Join!</h3>
                {qrCodeUrl && (
                  <div className="bg-white p-6 rounded-2xl inline-block mb-6">
                    <Image src={qrCodeUrl} alt="QR Code" width={320} height={320} />
                  </div>
                )}
                <p className="text-xl mb-4">Game Code: <span className="font-bold text-yellow-300 text-3xl">{gameCode}</span></p>
              </div>

              {/* Players List */}
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-8">
                <h3 className="text-3xl font-bold mb-6">🎊 Players ({players.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {players.length === 0 ? (
                    <p className="text-white/60 text-xl py-12">Waiting for players...</p>
                  ) : (
                    players.map(player => (
                      <div key={player.id} className="bg-white/10 p-4 rounded-xl flex justify-between items-center">
                        <span className="text-xl font-semibold">Player {player.id.slice(-4)}</span>
                        <span className="text-green-300 text-lg">✅ Ready</span>
                      </div>
                    ))
                  )}
                </div>
                
                {players.length > 0 && (
                  <button
                    onClick={startGame}
                    className="mt-6 bg-green-500 text-white px-8 py-4 rounded-xl font-bold text-xl
                             hover:bg-green-600 transition-all duration-300"
                  >
                    🎊 Start Game! 🎊
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Phase - Show Current Question with Live Answers */}
      {(gameState.phase === 'question' || gameState.phase === 'answering') && gameState.currentQuestion && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-6xl w-full">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <span className="text-2xl text-white/80">Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}</span>
                <span className="text-yellow-300 font-bold text-4xl">{gameState.timeRemaining}s</span>
              </div>
              
              <h1 className="text-5xl font-bold mb-8 leading-tight">{gameState.currentQuestion.question}</h1>
              
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-8 mb-8">
                <h3 className="text-2xl font-bold mb-6">📝 Type Your Answer on Your Phone!</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {players.map(player => (
                    <div key={player.id} className={`p-4 rounded-xl text-center ${
                      player.hasAnswered ? 'bg-green-500/30 border-green-400' : 'bg-white/10 border-white/20'
                    } border-2`}>
                      <div className="text-lg font-semibold">Player {player.id.slice(-4)}</div>
                      <div className="text-sm mt-2">
                        {player.hasAnswered ? '✅ Answered' : '⏳ Typing...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Answers Display */}
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-3xl p-8">
                <h3 className="text-2xl font-bold mb-6">💬 Live Answers</h3>
                {players.filter(p => p.hasAnswered && p.answer).length === 0 ? (
                  <p className="text-white/60 text-xl py-8">Waiting for answers...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {players
                      .filter(p => p.hasAnswered && p.answer)
                      .map(player => (
                        <div key={player.id} className="bg-white/10 p-6 rounded-xl text-left">
                          <div className="text-white/80 text-sm mb-2">Player {player.id.slice(-4)}</div>
                          <div className="text-lg text-white font-medium">
                            &quot;{player.answer}&quot;
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                
                <div className="mt-6 text-white/70 text-sm">
                  {players.filter(p => p.hasAnswered).length} of {players.length} players answered
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
      <div className="fixed bottom-4 right-4">
        <a 
          href={`/judge/${gameCode}`}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
        >
          Judge Interface
        </a>
      </div>
    </div>
  )
}