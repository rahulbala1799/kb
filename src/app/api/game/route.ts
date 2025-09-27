import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { 
  initDb, 
  createGame, 
  getGame, 
  addPlayer, 
  getPlayers, 
  updatePlayerAnswer, 
  updatePlayerScore, 
  getQuestions, 
  updateGamePhase 
} from '@/lib/database'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// In-memory storage for real-time game state (in production, use Redis)
const gameStates = new Map()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, gameCode, playerId, playerName, answer, judgeName, rankings } = body

    // Initialize database on first use
    if (!gameStates.has('db_initialized')) {
      await initDb()
      gameStates.set('db_initialized', true)
    }

    switch (action) {
      case 'registerPlayer':
        return handleRegisterPlayer(gameCode, playerId, playerName)
      
      case 'registerJudge':
        return handleRegisterJudge(gameCode, judgeName)
      
      case 'getGameState':
        return handleGetGameState(gameCode, playerId)
      
      case 'getJudgeGameState':
        return handleGetJudgeGameState(gameCode)
      
      case 'submitAnswer':
        return handleSubmitAnswer(gameCode, playerId, answer)
      
      case 'submitRankings':
        return handleSubmitRankings(gameCode, rankings)
      
      case 'startGame':
        return handleStartGame(gameCode)
      
      default:
        return NextResponse.json({ success: false, message: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Game API error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

async function handleRegisterPlayer(gameCode: string, playerId: string, playerName: string) {
  try {
    // Check if game exists, create if not
    let game = await getGame(gameCode)
    if (!game) {
      game = await createGame(gameCode, 'system', 'System')
    }

    // Register player
    await addPlayer(gameCode, playerId, playerName)
    
    return NextResponse.json({
      success: true,
      message: 'Player registered successfully',
      playerId
    })
  } catch (error) {
    console.error('Error registering player:', error)
    return NextResponse.json({ success: false, message: 'Registration failed' }, { status: 500 })
  }
}

async function handleRegisterJudge(gameCode: string, judgeName: string) {
  try {
    // Update or create game with judge info
    let game = await getGame(gameCode)
    if (!game) {
      game = await createGame(gameCode, 'judge-1', judgeName)
    }

    return NextResponse.json({
      success: true,
      message: 'Judge registered successfully'
    })
  } catch (error) {
    console.error('Error registering judge:', error)
    return NextResponse.json({ success: false, message: 'Judge registration failed' }, { status: 500 })
  }
}

async function handleGetGameState(gameCode: string, playerId?: string) {
  try {
    const game = await getGame(gameCode)
    const players = await getPlayers(gameCode)
    const questions = await getQuestions()
    
    if (!game) {
      return NextResponse.json({
        success: true,
        gameState: {
          phase: 'waiting',
          currentQuestionIndex: 0,
          totalQuestions: 3,
          timeRemaining: 30
        },
        players: [],
        playerScore: 0
      })
    }

    const currentQuestion = game.phase === 'question' || game.phase === 'answering' 
      ? questions[game.question_index] 
      : undefined

    // Get current answers for ranking phase
    let answers: Array<{ id: string; answer: string; rank?: number }> = []
    if (game.phase === 'ranking') {
      answers = players
        .filter(p => p.current_answer)
        .map(p => ({
          id: p.player_id,
          answer: p.current_answer,
          rank: undefined
        }))
    }

    const playerScore = playerId ? (players.find(p => p.player_id === playerId)?.score || 0) : 0

    return NextResponse.json({
      success: true,
      gameState: {
        phase: game.phase,
        currentQuestion,
        currentQuestionIndex: game.question_index,
        totalQuestions: game.total_questions,
        timeRemaining: game.time_remaining,
        answers
      },
      players: players.map(p => ({
        id: p.player_id,
        name: p.player_name,
        score: p.score,
        hasAnswered: p.has_answered,
        answer: p.current_answer
      })),
      playerScore
    })
  } catch (error) {
    console.error('Error getting game state:', error)
    return NextResponse.json({ success: false, message: 'Failed to get game state' }, { status: 500 })
  }
}

async function handleGetJudgeGameState(gameCode: string) {
  try {
    const game = await getGame(gameCode)
    const players = await getPlayers(gameCode)
    
    if (!game) {
      return NextResponse.json({ success: false, message: 'Game not found' }, { status: 404 })
    }

    let answers: Array<{ id: string; answer: string; rank?: number }> = []
    if (game.phase === 'ranking') {
      answers = players
        .filter(p => p.current_answer)
        .map(p => ({
          id: p.player_id,
          answer: p.current_answer,
          rank: undefined
        }))
    }

    return NextResponse.json({
      success: true,
      gameState: {
        phase: game.phase,
        currentQuestionIndex: game.question_index,
        totalQuestions: game.total_questions,
        answers
      }
    })
  } catch (error) {
    console.error('Error getting judge game state:', error)
    return NextResponse.json({ success: false, message: 'Failed to get judge state' }, { status: 500 })
  }
}

async function handleSubmitAnswer(gameCode: string, playerId: string, answer: string) {
  try {
    // Update player answer
    await updatePlayerAnswer(gameCode, playerId, answer)
    
    // Check if all players have answered
    const players = await getPlayers(gameCode)
    const answeredPlayers = players.filter(p => p.has_answered)
    
    // If all players answered, move to ranking phase
    if (answeredPlayers.length === players.length && players.length > 0) {
      await updateGamePhase(gameCode, 'ranking')
    }

    return NextResponse.json({
      success: true,
      message: 'Answer submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting answer:', error)
    return NextResponse.json({ success: false, message: 'Failed to submit answer' }, { status: 500 })
  }
}

async function handleSubmitRankings(gameCode: string, rankings: { [key: string]: number }) {
  try {
    // Award points based on rankings
    for (const [playerId, rank] of Object.entries(rankings)) {
      let points = 0
      if (rank === 1) points = 100
      else if (rank === 2) points = 50
      else if (rank === 3) points = 25
      
      if (points > 0) {
        await updatePlayerScore(gameCode, playerId, points)
      }
    }

    // Move to results phase
    await updateGamePhase(gameCode, 'results')

    // Auto-advance to next question after 5 seconds
    setTimeout(async () => {
      try {
        const game = await getGame(gameCode)
        const questions = await getQuestions()
        
        if (game && game.phase === 'results') {
          if (game.question_index < questions.length - 1) {
            // Next question
            await updateGamePhase(gameCode, 'question', game.question_index + 1, 30)
            
            // Reset player answers
            const players = await getPlayers(gameCode)
            for (const player of players) {
              await pool.query(
                'UPDATE players SET has_answered = FALSE, current_answer = NULL WHERE game_code = $1 AND player_id = $2',
                [gameCode, player.player_id]
              )
            }

            // Start answering phase after 5 seconds
            setTimeout(async () => {
              await updateGamePhase(gameCode, 'answering')
            }, 5000)
          } else {
            // Game finished
            await updateGamePhase(gameCode, 'final')
          }
        }
      } catch (error) {
        console.error('Error in auto-advance:', error)
      }
    }, 5000)

    return NextResponse.json({
      success: true,
      message: 'Rankings submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting rankings:', error)
    return NextResponse.json({ success: false, message: 'Failed to submit rankings' }, { status: 500 })
  }
}

async function handleStartGame(gameCode: string) {
  try {
    // Start with first question
    await updateGamePhase(gameCode, 'question', 0, 30)

    // Move to answering phase after 5 seconds
    setTimeout(async () => {
      await updateGamePhase(gameCode, 'answering')
      
      // Start countdown timer
      let timeLeft = 30
      const timer = setInterval(async () => {
        timeLeft--
        if (timeLeft > 0) {
          await updateGamePhase(gameCode, 'answering', undefined, timeLeft)
        } else {
          clearInterval(timer)
          // Time's up - move to ranking
          await updateGamePhase(gameCode, 'ranking')
        }
      }, 1000)
    }, 5000)

    return NextResponse.json({
      success: true,
      message: 'Game started successfully'
    })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json({ success: false, message: 'Failed to start game' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Ann's Birthday Trivia Game API is ready! 🎂",
    endpoints: [
      'registerPlayer',
      'registerJudge', 
      'getGameState',
      'getJudgeGameState',
      'submitAnswer',
      'submitRankings',
      'startGame'
    ]
  })
}
