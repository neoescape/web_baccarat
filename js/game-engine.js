/**
 * game-engine.js - Core baccarat game logic
 * Faithfully ported from Python BaccaratService (baccarat.py)
 *
 * Game flow:
 * 1. Player places bet (type + amount)
 * 2. Deck created (8 decks) and shuffled
 * 3. Win rate adjustment check
 * 4. Hand played (deal cards, apply third-card rules)
 * 5. Result determined, payout calculated
 */

var GameEngine = (function() {
  'use strict';

  /**
   * Check if player should draw a third card
   * Ported from Python BaccaratService._should_player_draw()
   * Player draws on 0-5, stands on 6-7
   * @param {number} playerScore - Player's current score (0-9)
   * @returns {boolean}
   */
  function shouldPlayerDraw(playerScore) {
    return playerScore <= 5;
  }

  /**
   * Check if banker should draw a third card
   * Ported from Python BaccaratService._should_banker_draw()
   * Complex table-based rules depending on banker score and player's third card
   * @param {number} bankerScore - Banker's current score (0-9)
   * @param {Object|null} playerThird - Player's third card object, or null if player stood
   * @returns {boolean}
   */
  function shouldBankerDraw(bankerScore, playerThird) {
    // If player stood (no third card), banker draws on 0-5
    if (playerThird === null || playerThird === undefined) {
      return bankerScore <= 5;
    }

    // Get numeric value of player's third card
    var p3 = getCardPointValue(playerThird);

    // Banker draw rules (ported exactly from Python)
    if (bankerScore <= 2) {
      return true;
    } else if (bankerScore === 3) {
      return p3 !== 8;
    } else if (bankerScore === 4) {
      return (p3 === 2 || p3 === 3 || p3 === 4 || p3 === 5 || p3 === 6 || p3 === 7);
    } else if (bankerScore === 5) {
      return (p3 === 4 || p3 === 5 || p3 === 6 || p3 === 7);
    } else if (bankerScore === 6) {
      return (p3 === 6 || p3 === 7);
    } else {
      // Score 7: stand
      return false;
    }
  }

  /**
   * Play a single hand of baccarat
   * Ported from Python BaccaratService._play_single_hand()
   * @param {Object[]} deck - Card array (modified in place via drawCard)
   * @returns {Object} Hand result
   */
  function playSingleHand(deck) {
    // Deal initial 4 cards: P1, P2, B1, B2
    var playerCards = [drawCard(deck), drawCard(deck)];
    var bankerCards = [drawCard(deck), drawCard(deck)];

    var playerScore = calculateBaccaratScore(playerCards);
    var bankerScore = calculateBaccaratScore(bankerCards);

    var playerThird = null;
    var isNatural = (playerScore >= 8 || bankerScore >= 8);

    if (!isNatural) {
      // Player third card rule
      if (shouldPlayerDraw(playerScore)) {
        playerThird = drawCard(deck);
        playerCards.push(playerThird);
        playerScore = calculateBaccaratScore(playerCards);
      }

      // Banker third card rule
      if (shouldBankerDraw(bankerScore, playerThird)) {
        var bankerThird = drawCard(deck);
        bankerCards.push(bankerThird);
        bankerScore = calculateBaccaratScore(bankerCards);
      }
    }

    // Determine result
    var result;
    if (playerScore > bankerScore) {
      result = 'player_win';
    } else if (bankerScore > playerScore) {
      result = 'banker_win';
    } else {
      result = 'tie';
    }

    return {
      player_cards: playerCards,
      banker_cards: bankerCards,
      player_score: playerScore,
      banker_score: bankerScore,
      is_natural: isNatural,
      game_result: result
    };
  }

  /**
   * Get win rate adjustment factor
   * Ported from Python BaccaratService._get_adjustment_factor()
   * @returns {number} Adjustment factor (-1.0 to 1.0)
   *   Negative = favor player, Positive = favor house
   */
  function getAdjustmentFactor() {
    var targetRate = CONFIG.TARGET_WIN_RATE;
    var currentRate = Storage.getCurrentWinRate();

    var rateDiff = currentRate - targetRate;
    var adjustment = Math.max(-1.0, Math.min(1.0, rateDiff / 20.0));

    return adjustment;
  }

  /**
   * Determine if adjustment should be applied (probabilistic)
   * Ported from Python BaccaratService._should_adjust()
   * @param {number} adjustmentFactor
   * @returns {boolean}
   */
  function shouldAdjust(adjustmentFactor) {
    if (Math.abs(adjustmentFactor) < 0.1) {
      return false;
    }

    var adjustProbability = Math.abs(adjustmentFactor) * 0.7;
    return randomInt(0, 100) < adjustProbability * 100;
  }

  /**
   * Play a complete game of baccarat
   * Ported from Python BaccaratService.play_game()
   * Includes win rate adjustment system
   *
   * @param {number} betAmount - Amount wagered
   * @param {string} betType - 'player', 'banker', or 'tie'
   * @returns {Object} Complete game result
   */
  function playGame(betAmount, betType) {
    // Validate bet type
    if (betType !== 'player' && betType !== 'banker' && betType !== 'tie') {
      throw new Error('Invalid bet type: ' + betType);
    }

    var currentPoints = Storage.getPoints();

    // Validate bet amount
    if (betAmount <= 0) {
      throw new Error('Bet amount must be positive');
    }
    if (betAmount > currentPoints) {
      throw new Error('Insufficient points');
    }

    // Deduct bet
    Storage.deductPoints(betAmount);

    // Win rate adjustment factor calculation
    var adjustmentFactor = getAdjustmentFactor();
    var doAdjust = shouldAdjust(adjustmentFactor);
    var favorHouse = adjustmentFactor > 0;

    // Create deck and shuffle
    var deck = createDeck(CONFIG.NUM_DECKS);
    shuffleDeck(deck);

    // Play first hand
    var handResult = playSingleHand(deck);

    // Win rate adjustment system (ported from Python)
    if (doAdjust) {
      // Check if user would win with this result
      var userWouldWin = (
        (betType === 'player' && handResult.game_result === 'player_win') ||
        (betType === 'banker' && handResult.game_result === 'banker_win') ||
        (betType === 'tie' && handResult.game_result === 'tie')
      );

      // Check if we need to retry
      var needRetry = (
        (favorHouse && userWouldWin) ||
        (!favorHouse && !userWouldWin)
      );

      // Retry up to MAX_ADJUSTMENT_RETRIES times
      if (needRetry) {
        for (var retry = 0; retry < CONFIG.MAX_ADJUSTMENT_RETRIES; retry++) {
          var deck2 = createDeck(CONFIG.NUM_DECKS);
          shuffleDeck(deck2);
          var hand2 = playSingleHand(deck2);

          var userWouldWin2 = (
            (betType === 'player' && hand2.game_result === 'player_win') ||
            (betType === 'banker' && hand2.game_result === 'banker_win') ||
            (betType === 'tie' && hand2.game_result === 'tie')
          );

          // Use this result if it matches desired outcome
          if ((favorHouse && !userWouldWin2) || (!favorHouse && userWouldWin2)) {
            handResult = hand2;
            break;
          }
        }
      }
    }

    // Calculate payout (ported exactly from Python)
    var payout = 0;
    if (betType === 'player' && handResult.game_result === 'player_win') {
      payout = Math.floor(betAmount * CONFIG.PAYOUTS.player_win);
    } else if (betType === 'banker' && handResult.game_result === 'banker_win') {
      payout = Math.floor(betAmount * CONFIG.PAYOUTS.banker_win);
    } else if (betType === 'tie' && handResult.game_result === 'tie') {
      payout = Math.floor(betAmount * CONFIG.PAYOUTS.tie);
    } else if (betType === 'tie' && handResult.game_result !== 'tie') {
      // Bet on tie but not tie - lose everything
      payout = 0;
    } else if (handResult.game_result === 'tie') {
      // Bet on player/banker but game is tie - return bet
      payout = betAmount;
    }

    // Add payout to points
    if (payout > 0) {
      Storage.addPoints(payout);
    }

    var profit = payout - betAmount;

    // Determine user result (win/lose/push)
    var userResult;
    if (payout > betAmount) {
      userResult = 'win';
    } else if (payout === betAmount) {
      userResult = 'push';
    } else {
      userResult = 'lose';
    }

    // Build complete result object
    var result = {
      bet_type: betType,
      bet_amount: betAmount,
      player_cards: handResult.player_cards,
      banker_cards: handResult.banker_cards,
      player_score: handResult.player_score,
      banker_score: handResult.banker_score,
      is_natural: handResult.is_natural,
      game_result: handResult.game_result,
      user_result: userResult,
      payout: payout,
      profit: profit,
      user_points: Storage.getPoints()
    };

    // Save to history
    Storage.addHistory({
      bet_type: betType,
      game_result: handResult.game_result,
      user_result: userResult,
      bet_amount: betAmount,
      payout: payout,
      profit: profit
    });

    // Update statistics
    Storage.updateStats(userResult, betAmount, payout);

    return result;
  }

  // Public API
  return {
    playGame: playGame,
    shouldPlayerDraw: shouldPlayerDraw,
    shouldBankerDraw: shouldBankerDraw,
    playSingleHand: playSingleHand,
    getAdjustmentFactor: getAdjustmentFactor
  };
})();
