/**
 * utils.js - Card, Deck, shuffle, and baccarat score calculation
 * Ported from Python backend (base.py and baccarat.py)
 */

// Card suits and values (matching Python Card class)
var SUITS = ['spade', 'heart', 'diamond', 'club'];
var VALUES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'j', 'q', 'k'];

/**
 * Create a card object
 * @param {string} suit - Card suit (spade, heart, diamond, club)
 * @param {string} value - Card value (1-10, j, q, k)
 * @returns {Object} Card object with suit and value
 */
function createCard(suit, value) {
  return { suit: suit, value: value };
}

/**
 * Get the image path for a card
 * @param {Object} card - Card object
 * @returns {string} Image path
 */
function getCardImagePath(card) {
  return CONFIG.CARD_IMAGE_PATH
    .replace('{suit}', card.suit)
    .replace('{value}', card.value);
}

/**
 * Create a multi-deck shoe
 * Ported from Python Deck class
 * @param {number} numDecks - Number of decks to use
 * @returns {Object[]} Array of card objects
 */
function createDeck(numDecks) {
  var cards = [];
  for (var d = 0; d < numDecks; d++) {
    for (var s = 0; s < SUITS.length; s++) {
      for (var v = 0; v < VALUES.length; v++) {
        cards.push(createCard(SUITS[s], VALUES[v]));
      }
    }
  }
  return cards;
}

/**
 * Fisher-Yates shuffle (ported from Python Deck.shuffle using secrets)
 * Uses crypto.getRandomValues for security when available
 * @param {Object[]} cards - Array of card objects to shuffle in-place
 */
function shuffleDeck(cards) {
  var i, j, temp;
  for (i = cards.length - 1; i > 0; i--) {
    // Use crypto API for secure random if available, otherwise Math.random
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      j = arr[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    temp = cards[i];
    cards[i] = cards[j];
    cards[j] = temp;
  }
}

/**
 * Draw a card from the deck
 * @param {Object[]} cards - Deck array (modified in place)
 * @returns {Object} The drawn card
 */
function drawCard(cards) {
  if (cards.length === 0) {
    throw new Error('No cards left in the deck');
  }
  return cards.pop();
}

/**
 * Calculate baccarat score (last digit only)
 * Ported from Python calculate_baccarat_score()
 * - 10, J, Q, K = 0 points
 * - Ace (1) = 1 point
 * - 2-9 = face value
 * - Score is total modulo 10
 * @param {Object[]} cards - Array of card objects
 * @returns {number} Baccarat score (0-9)
 */
function calculateBaccaratScore(cards) {
  var total = 0;
  for (var i = 0; i < cards.length; i++) {
    var value = cards[i].value;
    if (value === '10' || value === 'j' || value === 'q' || value === 'k') {
      total += 0;
    } else if (value === '1') {
      // Ace = 1 point
      total += 1;
    } else {
      total += parseInt(value, 10);
    }
  }
  return total % 10;
}

/**
 * Get the numeric value of a card for baccarat third-card rules
 * @param {Object} card - Card object
 * @returns {number} Card point value (0-9)
 */
function getCardPointValue(card) {
  var value = card.value;
  if (value === '10' || value === 'j' || value === 'q' || value === 'k') {
    return 0;
  } else if (value === '1') {
    return 1;
  } else {
    return parseInt(value, 10);
  }
}

/**
 * Generate dynamic chip values based on player's current points
 * Ported from frontend page.tsx generateChipValues()
 * @param {number} minChip - Minimum chip value
 * @param {number} maxChip - Maximum chip value
 * @returns {number[]} Array of chip values (up to 6)
 */
function generateChipValues(minChip, maxChip) {
  var chips = [];
  var current = minChip;

  while (current <= maxChip) {
    chips.push(current);
    var magnitude = Math.pow(10, Math.floor(Math.log10(current)));
    var firstDigit = Math.floor(current / magnitude);

    var next;
    if (firstDigit === 1) {
      next = 2 * magnitude;
    } else if (firstDigit === 2) {
      next = 5 * magnitude;
    } else {
      next = 10 * magnitude;
    }
    current = next;
  }

  return chips.slice(0, 6);
}

/**
 * Calculate bet limits based on current points
 * Ported from Python BaccaratService.calculate_bet_limits()
 * @param {number} userPoints - Player's current points
 * @returns {Object} Bet limits
 */
function calculateBetLimits(userPoints) {
  var minChip = Math.floor((userPoints * 1) / 100);
  minChip = floorToSignificant(minChip);
  minChip = Math.max(minChip, 10);

  var maxChip = Math.floor((userPoints * 50) / 100);
  maxChip = floorToSignificant(maxChip);

  if (maxChip < minChip) {
    maxChip = minChip;
  }

  return {
    min_chip: minChip,
    max_chip: maxChip,
    min_bet: minChip,
    max_bet: userPoints,
    user_points: userPoints
  };
}

/**
 * Floor to significant digit
 * Ported from Python BaccaratService._floor_to_significant()
 * @param {number} value - Number to floor
 * @returns {number} Floored value
 */
function floorToSignificant(value) {
  if (value < 10) {
    return value;
  }
  var magnitude = Math.pow(10, String(value).length - 1);
  return Math.floor(value / magnitude) * magnitude;
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format chip label for display
 * @param {number} val - Chip value
 * @returns {string} Formatted label
 */
function formatChipLabel(val) {
  if (val >= 1000000) return (val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1) + 'M';
  if (val >= 1000) return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + 'K';
  return val.toString();
}

/**
 * Get a random integer between min (inclusive) and max (exclusive)
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    var arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % (max - min));
  }
  return min + Math.floor(Math.random() * (max - min));
}

/**
 * Pick a random element from an array
 * @param {Array} arr - Array to pick from
 * @returns {*} Random element
 */
function randomChoice(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[randomInt(0, arr.length)];
}
