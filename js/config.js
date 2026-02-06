/**
 * config.js - Game settings, constants, and payout definitions
 * Baccarat game configuration ported from Python backend
 */

var CONFIG = {
  // Starting points for new players
  INITIAL_POINTS: 10000,

  // Number of decks used in baccarat (standard is 8)
  NUM_DECKS: 8,

  // Payout multipliers (bet amount * multiplier = total return)
  // player_win: 2.0 means 1:1 payout (bet + winnings)
  // banker_win: 1.95 means 0.95:1 payout (5% commission)
  // tie: 9.0 means 8:1 payout
  PAYOUTS: {
    player_win: 2.0,
    banker_win: 1.95,
    tie: 9.0
  },

  // Win rate adjustment system
  TARGET_WIN_RATE: 45,
  RECENT_GAMES_FOR_ADJUSTMENT: 100,
  MAX_ADJUSTMENT_RETRIES: 2,

  // Bet limits
  MIN_BET: 100,
  MAX_BET: 100000,

  // Card dealing animation timing (ms)
  DEAL_INTERVAL: 400,
  RESULT_DELAY: 500,
  AUTO_NEXT_DELAY: 2000,

  // Card image path template
  CARD_IMAGE_PATH: 'assets/cards/card-{suit}-{value}.png',
  CARD_BACK_IMAGE: 'assets/cards/card-back.png',

  // Dealer image path
  DEALER_IMAGE_PATH: 'assets/dealers/',

  // Background
  TABLE_BG: 'assets/backgrounds/table-bg.jpg',

  // Chip image path
  CHIP_IMAGE_PATH: 'assets/chips/fiche_{index}.png',

  // localStorage keys
  STORAGE_KEYS: {
    POINTS: 'baccarat_points',
    HISTORY: 'baccarat_history',
    STATS: 'baccarat_stats',
    SETTINGS: 'baccarat_settings'
  },

  // Chip colors (CSS)
  CHIP_COLORS: [
    { bg: '#dc2626', hover: '#ef4444', border: '#fca5a5' },  // Red
    { bg: '#2563eb', hover: '#3b82f6', border: '#93c5fd' },  // Blue
    { bg: '#16a34a', hover: '#22c55e', border: '#86efac' },  // Green
    { bg: '#9333ea', hover: '#a855f7', border: '#c4b5fd' },  // Purple
    { bg: '#ca8a04', hover: '#eab308', border: '#fde047' },  // Yellow
    { bg: '#db2777', hover: '#ec4899', border: '#f9a8d4' }   // Pink
  ],

  // Result colors
  RESULT_COLORS: {
    win: '#fbbf24',   // Gold
    lose: '#f87171',  // Red
    push: '#9ca3af'   // Gray
  }
};
