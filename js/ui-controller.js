/**
 * ui-controller.js - DOM manipulation, events, animations
 * Handles all visual presentation and user interaction
 */

var UI = (function() {
  'use strict';

  // Current game state
  var state = {
    phase: 'betting',  // 'betting', 'dealing', 'result'
    betType: 'player',
    betAmount: 0,
    dealer: null,
    gameResult: null,
    displayedPlayerCards: 0,
    displayedBankerCards: 0,
    chipValues: [],
    betLimits: null,
    isProcessing: false,
    dealTimeouts: [],
    typingTimeout: null
  };

  // DOM element cache
  var els = {};

  /**
   * Initialize the UI - called on page load
   */
  function init() {
    cacheElements();
    setupDealer();
    setupBackground();
    updatePoints();
    updateBetLimits();
    setupEventListeners();
    setPhase('betting');
    preloadCardImages();
  }

  /**
   * Cache frequently accessed DOM elements
   */
  function cacheElements() {
    els.gameContainer = document.getElementById('game-container');
    els.pointsDisplay = document.getElementById('points-display');
    els.dealerImage = document.getElementById('dealer-image');
    els.dealerName = document.getElementById('dealer-name');
    els.dialogBubble = document.getElementById('dialog-bubble');
    els.dialogText = document.getElementById('dialog-text');
    els.playerCardsArea = document.getElementById('player-cards');
    els.bankerCardsArea = document.getElementById('banker-cards');
    els.playerScore = document.getElementById('player-score');
    els.bankerScore = document.getElementById('banker-score');
    els.resultOverlay = document.getElementById('result-overlay');
    els.resultGameText = document.getElementById('result-game-text');
    els.resultUserText = document.getElementById('result-user-text');
    els.resultPayout = document.getElementById('result-payout');
    els.betTypeButtons = document.querySelectorAll('.bet-type-btn');
    els.betAmountDisplay = document.getElementById('bet-amount-display');
    els.chipsContainer = document.getElementById('chips-container');
    els.clearBtn = document.getElementById('btn-clear');
    els.allInBtn = document.getElementById('btn-allin');
    els.dealBtn = document.getElementById('btn-deal');
    els.controlPanel = document.getElementById('control-panel');
    els.bettingControls = document.getElementById('betting-controls');
    els.dealingInfo = document.getElementById('dealing-info');
    els.resultInfo = document.getElementById('result-info');
    els.betInfo = document.getElementById('bet-info');
    els.statsBtn = document.getElementById('btn-stats');
    els.statsModal = document.getElementById('stats-modal');
    els.statsContent = document.getElementById('stats-content');
    els.statsClose = document.getElementById('stats-close');
    els.resetBtn = document.getElementById('btn-reset');
  }

  /**
   * Preload card images so they display instantly during dealing
   */
  function preloadCardImages() {
    var suits = ['spade', 'heart', 'diamond', 'club'];
    var values = ['1','2','3','4','5','6','7','8','9','10','j','q','k'];
    for (var s = 0; s < suits.length; s++) {
      for (var v = 0; v < values.length; v++) {
        var img = new Image();
        img.src = 'assets/cards/card-' + suits[s] + '-' + values[v] + '.png';
      }
    }
    // Also preload card back
    var back = new Image();
    back.src = CONFIG.CARD_BACK_IMAGE;
  }

  /**
   * Set up the dealer (random selection)
   */
  function setupDealer() {
    state.dealer = randomChoice(DEALERS);
    if (state.dealer) {
      if (els.dealerImage) {
        els.dealerImage.src = state.dealer.image;
        els.dealerImage.alt = state.dealer.name;
        els.dealerImage.style.display = 'block';
      }
      if (els.dealerName) {
        els.dealerName.textContent = state.dealer.name;
      }
      showDialog('welcome');
    }
  }

  /**
   * Set up background image
   */
  function setupBackground() {
    if (els.gameContainer) {
      els.gameContainer.style.backgroundImage = 'url(' + CONFIG.TABLE_BG + ')';
    }
  }

  /**
   * Show dealer dialog with typing effect
   * @param {string} dialogType - Dialog category key
   */
  function showDialog(dialogType) {
    if (!state.dealer || !state.dealer.dialogs || !state.dealer.dialogs[dialogType]) return;

    var dialogs = state.dealer.dialogs[dialogType];
    if (!dialogs || dialogs.length === 0) return;

    var text = randomChoice(dialogs);
    if (!text) return;

    typeDialog(text);
  }

  /**
   * Type out dialog text character by character
   * @param {string} text - Full text to type
   */
  function typeDialog(text) {
    if (state.typingTimeout) {
      clearTimeout(state.typingTimeout);
    }

    if (!els.dialogBubble || !els.dialogText) return;

    els.dialogBubble.classList.remove('hidden');
    els.dialogText.textContent = '';

    var charIndex = 0;
    var speed = 25; // ms per character

    function typeNext() {
      if (charIndex < text.length) {
        els.dialogText.textContent += text.charAt(charIndex);
        charIndex++;
        state.typingTimeout = setTimeout(typeNext, speed);
      }
    }

    typeNext();
  }

  /**
   * Update points display
   */
  function updatePoints() {
    var points = Storage.getPoints();
    if (els.pointsDisplay) {
      els.pointsDisplay.textContent = formatNumber(points) + ' P';
    }
  }

  /**
   * Update bet limits and chip values
   */
  function updateBetLimits() {
    var points = Storage.getPoints();
    state.betLimits = calculateBetLimits(points);
    state.chipValues = generateChipValues(state.betLimits.min_chip, state.betLimits.max_chip);

    if (state.betAmount === 0 || state.betAmount < state.betLimits.min_bet) {
      state.betAmount = state.betLimits.min_bet;
    }
    if (state.betAmount > state.betLimits.max_bet) {
      state.betAmount = state.betLimits.max_bet;
    }

    updateBetDisplay();
    renderChips();
    updateBetInfo();
  }

  /**
   * Render chip buttons
   */
  function renderChips() {
    if (!els.chipsContainer) return;
    els.chipsContainer.innerHTML = '';

    for (var i = 0; i < state.chipValues.length; i++) {
      (function(index, value) {
        var chipBtn = document.createElement('button');
        chipBtn.className = 'chip-btn';
        chipBtn.setAttribute('data-value', value);

        var color = CONFIG.CHIP_COLORS[index % CONFIG.CHIP_COLORS.length];
        chipBtn.style.backgroundColor = color.bg;
        chipBtn.style.borderColor = color.border;

        // Check if chip image exists, use colored circle as fallback
        var chipImg = 'assets/chips/fiche_' + index + '.png';
        chipBtn.innerHTML =
          '<div class="chip-inner">' +
            '<img src="' + chipImg + '" alt="chip" class="chip-image" onerror="this.style.display=\'none\'">' +
            '<span class="chip-label">' + formatChipLabel(value) + '</span>' +
          '</div>';

        chipBtn.addEventListener('click', function() {
          addChip(value);
        });

        els.chipsContainer.appendChild(chipBtn);
      })(i, state.chipValues[i]);
    }
  }

  /**
   * Add chip value to bet
   * @param {number} value
   */
  function addChip(value) {
    if (state.phase !== 'betting') return;
    var newBet = state.betAmount + value;
    if (newBet <= state.betLimits.max_bet) {
      state.betAmount = newBet;
      updateBetDisplay();
      playChipSound();
    }
  }

  /**
   * Play a subtle click sound for chip interaction (optional)
   */
  function playChipSound() {
    // Using CSS animation feedback instead of audio for file:// compatibility
  }

  /**
   * Update bet amount display
   */
  function updateBetDisplay() {
    if (els.betAmountDisplay) {
      els.betAmountDisplay.textContent = formatNumber(state.betAmount);
    }
    updateChipStates();
    updateDealButton();
  }

  /**
   * Update chip button disabled states
   */
  function updateChipStates() {
    if (!els.chipsContainer) return;
    var chips = els.chipsContainer.querySelectorAll('.chip-btn');
    for (var i = 0; i < chips.length; i++) {
      var value = parseInt(chips[i].getAttribute('data-value'), 10);
      if (state.betAmount + value > state.betLimits.max_bet) {
        chips[i].classList.add('disabled');
      } else {
        chips[i].classList.remove('disabled');
      }
    }
  }

  /**
   * Update deal button state
   */
  function updateDealButton() {
    if (!els.dealBtn) return;
    var canDeal = state.betAmount >= state.betLimits.min_bet &&
                  state.betAmount <= state.betLimits.max_bet &&
                  !state.isProcessing;
    els.dealBtn.disabled = !canDeal;
  }

  /**
   * Update bet info text
   */
  function updateBetInfo() {
    if (!els.betInfo) return;
    var points = Storage.getPoints();
    els.betInfo.textContent = 'Min ' + formatNumber(state.betLimits.min_bet) +
                              ' | Balance ' + formatNumber(points) + ' P';
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Bet type buttons
    if (els.betTypeButtons) {
      for (var i = 0; i < els.betTypeButtons.length; i++) {
        els.betTypeButtons[i].addEventListener('click', function() {
          if (state.phase !== 'betting') return;
          var type = this.getAttribute('data-type');
          selectBetType(type);
        });
      }
    }

    // Clear bet
    if (els.clearBtn) {
      els.clearBtn.addEventListener('click', function() {
        if (state.phase !== 'betting') return;
        state.betAmount = state.betLimits.min_bet;
        updateBetDisplay();
      });
    }

    // All in
    if (els.allInBtn) {
      els.allInBtn.addEventListener('click', function() {
        if (state.phase !== 'betting') return;
        state.betAmount = state.betLimits.max_bet;
        updateBetDisplay();
      });
    }

    // Deal button
    if (els.dealBtn) {
      els.dealBtn.addEventListener('click', function() {
        if (state.phase !== 'betting' || state.isProcessing) return;
        startGame();
      });
    }

    // Stats button
    if (els.statsBtn) {
      els.statsBtn.addEventListener('click', function() {
        showStats();
      });
    }

    // Stats close
    if (els.statsClose) {
      els.statsClose.addEventListener('click', function() {
        hideStats();
      });
    }

    // Stats modal backdrop click
    if (els.statsModal) {
      els.statsModal.addEventListener('click', function(e) {
        if (e.target === els.statsModal) {
          hideStats();
        }
      });
    }

    // Reset button
    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', function() {
        if (confirm('Reset all data? Your points will be restored to ' + formatNumber(CONFIG.INITIAL_POINTS) + '.')) {
          Storage.resetAll();
          updatePoints();
          updateBetLimits();
          showDialog('welcome');
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (state.phase === 'betting') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startGame();
        } else if (e.key === '1') {
          selectBetType('player');
        } else if (e.key === '2') {
          selectBetType('tie');
        } else if (e.key === '3') {
          selectBetType('banker');
        }
      }
    });
  }

  /**
   * Select a bet type
   * @param {string} type - 'player', 'banker', or 'tie'
   */
  function selectBetType(type) {
    state.betType = type;

    // Update button styles
    if (els.betTypeButtons) {
      for (var i = 0; i < els.betTypeButtons.length; i++) {
        var btn = els.betTypeButtons[i];
        var btnType = btn.getAttribute('data-type');
        btn.classList.remove('active');
        if (btnType === type) {
          btn.classList.add('active');
        }
      }
    }
  }

  /**
   * Set the game phase and update UI
   * @param {string} phase - 'betting', 'dealing', 'result'
   */
  function setPhase(phase) {
    state.phase = phase;

    if (els.bettingControls) {
      els.bettingControls.style.display = phase === 'betting' ? 'block' : 'none';
    }
    if (els.dealingInfo) {
      els.dealingInfo.style.display = phase === 'dealing' ? 'block' : 'none';
    }
    if (els.resultInfo) {
      els.resultInfo.style.display = phase === 'result' ? 'block' : 'none';
    }
  }

  /**
   * Start a new game
   */
  function startGame() {
    if (state.isProcessing) return;

    // Check minimum bet
    if (state.betAmount < state.betLimits.min_bet) {
      showDialog('welcome');
      return;
    }

    // Check sufficient points
    var currentPoints = Storage.getPoints();
    if (state.betAmount > currentPoints) {
      typeDialog("You don't have enough points for that bet.");
      return;
    }

    state.isProcessing = true;

    try {
      // Play the game (all logic happens in game-engine.js)
      var result = GameEngine.playGame(state.betAmount, state.betType);
      state.gameResult = result;

      // Update points display immediately after deduction
      updatePoints();

      // Start dealing animation
      dealCards(result);
    } catch (e) {
      console.error('Game error:', e);
      typeDialog('An error occurred. Please try again.');
      state.isProcessing = false;
    }
  }

  /**
   * Deal cards with animation sequence
   * Ported from frontend page.tsx dealCards()
   * Sequence: P1 -> B1 -> P2 -> B2 -> (P3) -> (B3)
   * @param {Object} result - Game result from engine
   */
  function dealCards(result) {
    setPhase('dealing');
    state.displayedPlayerCards = 0;
    state.displayedBankerCards = 0;

    // Clear previous cards
    clearCards();
    hideResult();

    var totalPlayerCards = result.player_cards.length;
    var totalBankerCards = result.banker_cards.length;

    // Build deal sequence
    var sequence = [];

    // First two cards each: P1 -> B1 -> P2 -> B2
    sequence.push(function() {
      state.displayedPlayerCards = 1;
      renderCard('player', result.player_cards[0], 0, true);
    });
    sequence.push(function() {
      state.displayedBankerCards = 1;
      renderCard('banker', result.banker_cards[0], 0, true);
    });
    sequence.push(function() {
      state.displayedPlayerCards = 2;
      renderCard('player', result.player_cards[1], 1, true);
    });
    sequence.push(function() {
      state.displayedBankerCards = 2;
      renderCard('banker', result.banker_cards[1], 1, true);
    });

    // Third cards if applicable
    if (totalPlayerCards > 2) {
      sequence.push(function() {
        state.displayedPlayerCards = 3;
        renderCard('player', result.player_cards[2], 2, true);
      });
    }
    if (totalBankerCards > 2) {
      sequence.push(function() {
        state.displayedBankerCards = 3;
        renderCard('banker', result.banker_cards[2], 2, true);
      });
    }

    // Execute sequence with intervals
    var step = 0;
    clearDealTimeouts();

    function runNext() {
      if (step < sequence.length) {
        sequence[step]();
        step++;
        var timeout = setTimeout(runNext, CONFIG.DEAL_INTERVAL);
        state.dealTimeouts.push(timeout);
      } else {
        // All cards dealt - show result after delay
        var resultTimeout = setTimeout(function() {
          showResult(result);
        }, CONFIG.RESULT_DELAY);
        state.dealTimeouts.push(resultTimeout);
      }
    }

    var startTimeout = setTimeout(runNext, 300);
    state.dealTimeouts.push(startTimeout);
  }

  /**
   * Clear all deal timeouts
   */
  function clearDealTimeouts() {
    for (var i = 0; i < state.dealTimeouts.length; i++) {
      clearTimeout(state.dealTimeouts[i]);
    }
    state.dealTimeouts = [];
  }

  /**
   * Render a single card in the appropriate area
   * @param {string} side - 'player' or 'banker'
   * @param {Object} card - Card object { suit, value }
   * @param {number} index - Card index (0, 1, 2)
   * @param {boolean} animate - Whether to animate
   */
  function renderCard(side, card, index, animate) {
    var container = side === 'player' ? els.playerCardsArea : els.bankerCardsArea;
    if (!container) return;

    var cardEl = document.createElement('div');
    cardEl.className = 'card' + (animate ? ' card-deal-anim' : '');
    if (index === 2) {
      cardEl.className += ' card-third';
    }

    var imgEl = document.createElement('img');
    imgEl.src = getCardImagePath(card);
    imgEl.alt = card.suit + ' ' + card.value;
    imgEl.className = 'card-img';
    imgEl.onerror = function() {
      // Fallback: show text representation if image fails
      this.style.display = 'none';
      var fallback = document.createElement('div');
      fallback.className = 'card-fallback';
      fallback.innerHTML = getSuitSymbol(card.suit) + '<br>' + card.value.toUpperCase();
      cardEl.appendChild(fallback);
    };

    cardEl.appendChild(imgEl);
    container.appendChild(cardEl);
  }

  /**
   * Get Unicode suit symbol
   * @param {string} suit
   * @returns {string}
   */
  function getSuitSymbol(suit) {
    var symbols = {
      spade: '\u2660',
      heart: '\u2665',
      diamond: '\u2666',
      club: '\u2663'
    };
    return symbols[suit] || suit;
  }

  /**
   * Clear all displayed cards
   */
  function clearCards() {
    if (els.playerCardsArea) els.playerCardsArea.innerHTML = '';
    if (els.bankerCardsArea) els.bankerCardsArea.innerHTML = '';
    if (els.playerScore) {
      els.playerScore.style.opacity = '0';
      els.playerScore.textContent = '';
    }
    if (els.bankerScore) {
      els.bankerScore.style.opacity = '0';
      els.bankerScore.textContent = '';
    }
  }

  /**
   * Show the game result
   * @param {Object} result - Game result
   */
  function showResult(result) {
    setPhase('result');

    // Show scores
    if (els.playerScore) {
      els.playerScore.textContent = 'Score: ' + result.player_score;
      els.playerScore.style.opacity = '1';
    }
    if (els.bankerScore) {
      els.bankerScore.textContent = 'Score: ' + result.banker_score;
      els.bankerScore.style.opacity = '1';
    }

    // Show result overlay
    if (els.resultOverlay) {
      els.resultOverlay.classList.remove('hidden');
      els.resultOverlay.classList.add('result-fade-in');
    }

    // Game result text
    if (els.resultGameText) {
      var gameText = '';
      switch (result.game_result) {
        case 'player_win': gameText = 'Player Wins!'; break;
        case 'banker_win': gameText = 'Banker Wins!'; break;
        case 'tie': gameText = 'Tie!'; break;
      }
      els.resultGameText.textContent = gameText;
    }

    // User result text with color
    if (els.resultUserText) {
      var userText = '';
      var color = '';
      switch (result.user_result) {
        case 'win':
          userText = 'YOU WIN!';
          color = CONFIG.RESULT_COLORS.win;
          break;
        case 'lose':
          userText = 'YOU LOSE';
          color = CONFIG.RESULT_COLORS.lose;
          break;
        case 'push':
          userText = 'PUSH';
          color = CONFIG.RESULT_COLORS.push;
          break;
      }
      els.resultUserText.textContent = userText;
      els.resultUserText.style.color = color;
    }

    // Payout text
    if (els.resultPayout) {
      if (result.profit > 0) {
        els.resultPayout.textContent = '+' + formatNumber(result.payout) + ' P';
        els.resultPayout.style.color = CONFIG.RESULT_COLORS.win;
        els.resultPayout.style.display = 'block';
      } else if (result.profit === 0 && result.payout > 0) {
        els.resultPayout.textContent = 'Refund: ' + formatNumber(result.payout) + ' P';
        els.resultPayout.style.color = CONFIG.RESULT_COLORS.push;
        els.resultPayout.style.display = 'block';
      } else {
        els.resultPayout.style.display = 'none';
      }
    }

    // Update points display
    updatePoints();

    // Show dealer dialog based on result
    var dialogType;
    if (result.user_result === 'win') {
      dialogType = 'win';
    } else if (result.user_result === 'lose') {
      dialogType = 'lose';
    } else {
      dialogType = 'push';
    }

    // 50% chance to show game result dialog instead
    var gameResultType = result.game_result === 'player_win' ? 'player_win' :
                         result.game_result === 'banker_win' ? 'banker_win' : 'tie';
    var finalDialogType = Math.random() > 0.5 ? gameResultType : dialogType;

    // Show natural dialog if applicable
    if (result.is_natural && Math.random() > 0.5) {
      finalDialogType = 'natural';
    }

    showDialog(finalDialogType);

    // Auto-transition to next game after delay
    var nextTimeout = setTimeout(function() {
      newGame();
    }, CONFIG.AUTO_NEXT_DELAY);
    state.dealTimeouts.push(nextTimeout);
  }

  /**
   * Hide result overlay
   */
  function hideResult() {
    if (els.resultOverlay) {
      els.resultOverlay.classList.add('hidden');
      els.resultOverlay.classList.remove('result-fade-in');
    }
  }

  /**
   * Reset for a new game
   */
  function newGame() {
    clearDealTimeouts();
    state.gameResult = null;
    state.isProcessing = false;
    state.displayedPlayerCards = 0;
    state.displayedBankerCards = 0;

    clearCards();
    hideResult();
    updatePoints();
    updateBetLimits();
    setPhase('betting');

    // Check if player is out of points
    var points = Storage.getPoints();
    if (points <= 0) {
      typeDialog("You're out of points! Use the reset button to start fresh.");
      return;
    }

    showDialog('welcome');
  }

  /**
   * Show statistics modal
   */
  function showStats() {
    if (!els.statsModal || !els.statsContent) return;

    var stats = Storage.getStats();
    var winRate = stats.total_games > 0
      ? Math.round((stats.wins / stats.total_games) * 1000) / 10
      : 0;

    var html =
      '<div class="stats-grid">' +
        '<div class="stat-item">' +
          '<div class="stat-value">' + stats.total_games + '</div>' +
          '<div class="stat-label">Games Played</div>' +
        '</div>' +
        '<div class="stat-item stat-win">' +
          '<div class="stat-value">' + stats.wins + '</div>' +
          '<div class="stat-label">Wins</div>' +
        '</div>' +
        '<div class="stat-item stat-lose">' +
          '<div class="stat-value">' + stats.losses + '</div>' +
          '<div class="stat-label">Losses</div>' +
        '</div>' +
        '<div class="stat-item">' +
          '<div class="stat-value">' + stats.pushes + '</div>' +
          '<div class="stat-label">Pushes</div>' +
        '</div>' +
        '<div class="stat-item">' +
          '<div class="stat-value">' + winRate + '%</div>' +
          '<div class="stat-label">Win Rate</div>' +
        '</div>' +
        '<div class="stat-item">' +
          '<div class="stat-value">' + formatNumber(stats.total_wagered) + '</div>' +
          '<div class="stat-label">Total Wagered</div>' +
        '</div>' +
        '<div class="stat-item stat-win">' +
          '<div class="stat-value">' + formatNumber(stats.biggest_win) + '</div>' +
          '<div class="stat-label">Biggest Win</div>' +
        '</div>' +
        '<div class="stat-item stat-lose">' +
          '<div class="stat-value">' + formatNumber(Math.abs(stats.biggest_loss)) + '</div>' +
          '<div class="stat-label">Biggest Loss</div>' +
        '</div>' +
        '<div class="stat-item">' +
          '<div class="stat-value">' + stats.best_streak + '</div>' +
          '<div class="stat-label">Best Streak</div>' +
        '</div>' +
      '</div>';

    els.statsContent.innerHTML = html;
    els.statsModal.classList.remove('hidden');
  }

  /**
   * Hide statistics modal
   */
  function hideStats() {
    if (els.statsModal) {
      els.statsModal.classList.add('hidden');
    }
  }

  // Public API
  return {
    init: init
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  UI.init();
});
