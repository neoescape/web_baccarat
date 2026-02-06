/**
 * storage.js - localStorage management for points, history, and stats
 * Handles persistence of game state across sessions
 */

var Storage = (function() {
  'use strict';

  var KEYS = CONFIG.STORAGE_KEYS;

  /**
   * Safely get item from localStorage
   * @param {string} key
   * @returns {*} Parsed value or null
   */
  function _get(key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Storage read error for key:', key, e);
      return null;
    }
  }

  /**
   * Safely set item in localStorage
   * @param {string} key
   * @param {*} value
   */
  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage write error for key:', key, e);
    }
  }

  /**
   * Get current points (initializes to INITIAL_POINTS if not set)
   * @returns {number} Current points
   */
  function getPoints() {
    var points = _get(KEYS.POINTS);
    if (points === null || typeof points !== 'number') {
      points = CONFIG.INITIAL_POINTS;
      _set(KEYS.POINTS, points);
    }
    return points;
  }

  /**
   * Set current points
   * @param {number} points
   */
  function setPoints(points) {
    _set(KEYS.POINTS, Math.max(0, Math.floor(points)));
  }

  /**
   * Add points (winnings)
   * @param {number} amount
   * @returns {number} New total
   */
  function addPoints(amount) {
    var current = getPoints();
    var newTotal = current + amount;
    setPoints(newTotal);
    return newTotal;
  }

  /**
   * Deduct points (bet)
   * @param {number} amount
   * @returns {number} New total, or -1 if insufficient
   */
  function deductPoints(amount) {
    var current = getPoints();
    if (current < amount) return -1;
    var newTotal = current - amount;
    setPoints(newTotal);
    return newTotal;
  }

  /**
   * Get game history (last N games for win rate adjustment)
   * @returns {Object[]} Array of game history entries
   */
  function getHistory() {
    var history = _get(KEYS.HISTORY);
    if (!Array.isArray(history)) {
      history = [];
      _set(KEYS.HISTORY, history);
    }
    return history;
  }

  /**
   * Add a game result to history
   * Keeps only the most recent RECENT_GAMES_FOR_ADJUSTMENT entries
   * @param {Object} entry - Game result entry
   *   { bet_type, game_result, user_result, bet_amount, payout, profit, timestamp }
   */
  function addHistory(entry) {
    var history = getHistory();
    entry.timestamp = Date.now();
    history.push(entry);

    // Keep only recent games
    var maxEntries = CONFIG.RECENT_GAMES_FOR_ADJUSTMENT;
    if (history.length > maxEntries) {
      history = history.slice(history.length - maxEntries);
    }

    _set(KEYS.HISTORY, history);
  }

  /**
   * Get game statistics
   * @returns {Object} Stats object { wins, losses, pushes, total_games, total_wagered, total_won }
   */
  function getStats() {
    var stats = _get(KEYS.STATS);
    if (!stats || typeof stats !== 'object') {
      stats = {
        wins: 0,
        losses: 0,
        pushes: 0,
        total_games: 0,
        total_wagered: 0,
        total_won: 0,
        biggest_win: 0,
        biggest_loss: 0,
        streak: 0,
        best_streak: 0,
        worst_streak: 0
      };
      _set(KEYS.STATS, stats);
    }
    return stats;
  }

  /**
   * Update stats with a game result
   * @param {string} userResult - 'win', 'lose', or 'push'
   * @param {number} betAmount
   * @param {number} payout
   */
  function updateStats(userResult, betAmount, payout) {
    var stats = getStats();
    var profit = payout - betAmount;

    stats.total_games++;
    stats.total_wagered += betAmount;

    if (userResult === 'win') {
      stats.wins++;
      stats.total_won += payout;
      if (profit > stats.biggest_win) stats.biggest_win = profit;
      // Streak tracking
      if (stats.streak >= 0) {
        stats.streak++;
      } else {
        stats.streak = 1;
      }
      if (stats.streak > stats.best_streak) stats.best_streak = stats.streak;
    } else if (userResult === 'lose') {
      stats.losses++;
      if (Math.abs(profit) > Math.abs(stats.biggest_loss)) stats.biggest_loss = profit;
      if (stats.streak <= 0) {
        stats.streak--;
      } else {
        stats.streak = -1;
      }
      if (stats.streak < stats.worst_streak) stats.worst_streak = stats.streak;
    } else {
      stats.pushes++;
      stats.total_won += payout;
      stats.streak = 0;
    }

    _set(KEYS.STATS, stats);
  }

  /**
   * Calculate current win rate from recent history
   * Ported from Python BaccaratService.get_current_win_rate()
   * @returns {number} Win rate as percentage (0-100)
   */
  function getCurrentWinRate() {
    var history = getHistory();
    if (history.length === 0) return 50.0;

    var wins = 0;
    for (var i = 0; i < history.length; i++) {
      if (history[i].profit > 0) {
        wins++;
      }
    }
    return Math.round((wins / history.length) * 1000) / 10;
  }

  /**
   * Reset all game data
   */
  function resetAll() {
    _set(KEYS.POINTS, CONFIG.INITIAL_POINTS);
    _set(KEYS.HISTORY, []);
    _set(KEYS.STATS, null);
  }

  // Public API
  return {
    getPoints: getPoints,
    setPoints: setPoints,
    addPoints: addPoints,
    deductPoints: deductPoints,
    getHistory: getHistory,
    addHistory: addHistory,
    getStats: getStats,
    updateStats: updateStats,
    getCurrentWinRate: getCurrentWinRate,
    resetAll: resetAll
  };
})();
