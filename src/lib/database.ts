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
        total_questions INTEGER DEFAULT 20,
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

    // Clear existing questions and insert Ann's birthday questions
    await pool.query('DELETE FROM questions')
    
    // All Ann's birthday questions (excluding hospital question)
    const allAnnQuestions = [
      "In which city was Ann born?",
      "Who is Ann's favorite person in the whole world?",
      "What value does Ann appreciate the most?",
      "What is Ann's zodiac sign?",
      "What company does Ann currently work for?",
      "What is Ann's professional qualification?",
      "What should Ann name her first child?",
      "What is Ann's favorite meal?",
      "What is Ann's favorite dessert?",
      "What drink does Ann love most?",
      "What's Ann's guilty pleasure snack?",
      "What hobby does Ann enjoy the most with friends?",
      "What is Ann's favorite time to wake up on weekends?",
      "What's Ann's favorite excuse for being late?",
      "What's Ann's most beautiful feature?",
      "What hobby did Ann recently learn?",
      "What is Ann's dream car?",
      "What is Ann's favorite car to drive?",
      "Who is Ann's favorite Malayalam actor?",
      "What is Ann's favorite Mohanlal movie?",
      "What color outfit does Ann love wearing most?",
      "What's Ann's favorite makeup product?",
      "What perfume brand does Ann love most?",
      "What's Ann's go-to outfit when dressing up?",
      "What country would Ann love to travel to next?",
      "What's Ann's dream holiday destination?",
      "Which social media app does Ann use the most?",
      "Which movie has Ann seen the most times?",
      "Who is Ann's celebrity crush apart from Mohanlal?",
      "What is Ann's favorite hobby?",
      "What's Ann's secret talent that nobody knows yet?",
      "What's Ann's favorite nickname?",
      "What's Ann's go-to \"lazy day\" hobby?",
      "Who is Ann's biggest celebrity crush?",
      "What is Ann's favorite way to spend weekends?",
      "What would Ann be if not her current profession?",
      "What is Ann's favorite festival to celebrate?",
      "What is Ann's favorite thing about herself?",
      "What is the one thing people instantly love about Ann?"
    ]

    // Shuffle questions and take only 20
    const shuffledQuestions = allAnnQuestions.sort(() => 0.5 - Math.random())
    const selectedQuestions = shuffledQuestions.slice(0, 20)

    for (const question of selectedQuestions) {
      await pool.query(
        'INSERT INTO questions (question) VALUES ($1)',
        [question]
      )
    }
    
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Error initializing database:', error)
  }
}

export async function createGame(gameCode: string, judgeId: string, judgeName: string) {
  // Get the actual number of questions in the database
  const questionCount = await pool.query('SELECT COUNT(*) FROM questions')
  const totalQuestions = parseInt(questionCount.rows[0].count)
  
  const result = await pool.query(
    'INSERT INTO games (game_code, judge_id, judge_name, total_questions) VALUES ($1, $2, $3, $4) RETURNING *',
    [gameCode, judgeId, judgeName, totalQuestions]
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
