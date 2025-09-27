import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        game_code VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'waiting',
        judge_id VARCHAR(255) NOT NULL,
        judge_name VARCHAR(255) NOT NULL,
        current_question_id INTEGER,
        question_index INTEGER DEFAULT 0,
        total_questions INTEGER DEFAULT 3,
        time_remaining INTEGER DEFAULT 30,
        phase VARCHAR(50) DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        game_code VARCHAR(255) NOT NULL,
        player_id VARCHAR(255) NOT NULL,
        player_name VARCHAR(255) NOT NULL,
        score INTEGER DEFAULT 0,
        is_connected BOOLEAN DEFAULT TRUE,
        current_answer TEXT,
        has_answered BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(game_code, player_id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        category VARCHAR(255),
        difficulty VARCHAR(50),
        explanation TEXT
      );

      CREATE TABLE IF NOT EXISTS answers (
        id SERIAL PRIMARY KEY,
        game_code VARCHAR(255) NOT NULL,
        question_id INTEGER NOT NULL,
        player_id VARCHAR(255) NOT NULL,
        answer_text TEXT NOT NULL,
        rank INTEGER,
        points INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Insert demo questions about the judge
    const questionCount = await pool.query('SELECT COUNT(*) FROM questions')
    if (parseInt(questionCount.rows[0].count) === 0) {
      const demoQuestions = [
        {
          question: "What's the judge's favorite birthday cake flavor?",
          category: 'Personal',
          difficulty: 'easy',
          explanation: 'A fun question about the judge\'s preferences!'
        },
        {
          question: "What gift would the judge want most for their birthday?",
          category: 'Personal',
          difficulty: 'easy',
          explanation: 'Let\'s see who knows the judge best!'
        },
        {
          question: "What's the judge's dream birthday party location?",
          category: 'Personal',
          difficulty: 'easy',
          explanation: 'Where would the judge love to celebrate?'
        }
      ]

      for (const q of demoQuestions) {
        await pool.query(
          'INSERT INTO questions (question, category, difficulty, explanation) VALUES ($1, $2, $3, $4)',
          [q.question, q.category, q.difficulty, q.explanation]
        )
      }
    }
    
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

export async function createGame(gameCode: string, judgeId: string, judgeName: string) {
  const result = await pool.query(
    'INSERT INTO games (game_code, judge_id, judge_name) VALUES ($1, $2, $3) RETURNING *',
    [gameCode, judgeId, judgeName]
  )
  return result.rows[0]
}

export async function getGame(gameCode: string) {
  const result = await pool.query('SELECT * FROM games WHERE game_code = $1', [gameCode])
  return result.rows[0]
}

export async function addPlayer(gameCode: string, playerId: string, playerName: string) {
  const result = await pool.query(
    'INSERT INTO players (game_code, player_id, player_name) VALUES ($1, $2, $3) ON CONFLICT (game_code, player_id) DO UPDATE SET player_name = $3, is_connected = TRUE RETURNING *',
    [gameCode, playerId, playerName]
  )
  return result.rows[0]
}

export async function getPlayers(gameCode: string) {
  const result = await pool.query('SELECT * FROM players WHERE game_code = $1 ORDER BY score DESC', [gameCode])
  return result.rows
}

export async function updatePlayerAnswer(gameCode: string, playerId: string, answer: string) {
  const result = await pool.query(
    'UPDATE players SET current_answer = $3, has_answered = TRUE WHERE game_code = $1 AND player_id = $2 RETURNING *',
    [gameCode, playerId, answer]
  )
  return result.rows[0]
}

export async function updatePlayerScore(gameCode: string, playerId: string, points: number) {
  const result = await pool.query(
    'UPDATE players SET score = score + $3 WHERE game_code = $1 AND player_id = $2 RETURNING *',
    [gameCode, playerId, points]
  )
  return result.rows[0]
}

export async function getQuestions() {
  const result = await pool.query('SELECT * FROM questions ORDER BY id')
  return result.rows
}

export async function updateGamePhase(gameCode: string, phase: string, questionIndex?: number, timeRemaining?: number) {
  let query = 'UPDATE games SET phase = $2'
  const params: (string | number)[] = [gameCode, phase]
  
  if (questionIndex !== undefined) {
    query += ', question_index = $3'
    params.push(questionIndex)
  }
  
  if (timeRemaining !== undefined) {
    query += ', time_remaining = $' + (params.length + 1)
    params.push(timeRemaining)
  }
  
  query += ' WHERE game_code = $1 RETURNING *'
  
  const result = await pool.query(query, params)
  return result.rows[0]
}
