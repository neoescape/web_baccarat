# Web Baccarat

A standalone, browser-based Baccarat card game with animated card dealing, multiple dealers, and persistent statistics. No server, no build tools, no dependencies — just open `index.html` and play.

## Quick Start

```bash
# Clone the repository
git clone git@github.com:neoescape/web_baccarat.git
cd web_baccarat

# Open in browser (any of the following)
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Or simply drag `index.html` into any modern browser. Works offline via `file://` protocol.

## Features

- **Standard Baccarat Rules** — 8-deck shoe, third-card draw rules, natural detection
- **Three Bet Types** — Player (1:1), Banker (0.95:1 with 5% commission), Tie (8:1)
- **Animated Card Dealing** — Sequential deal animation (P1 → B1 → P2 → B2 → P3 → B3)
- **Multiple Dealers** — Randomly selected dealer with unique personality and dialog lines
- **Dynamic Chip System** — Chip values auto-scale based on current balance
- **Statistics Tracking** — Win rate, streaks, biggest win/loss, total wagered
- **Persistent State** — Balance, history, and stats saved to `localStorage`
- **Responsive Design** — Mobile-first layout with iOS safe area support
- **Keyboard Shortcuts** — `Enter`/`Space` to deal, `1`/`2`/`3` to select bet type
- **Zero Dependencies** — Pure HTML, CSS, and vanilla JavaScript (ES5 compatible)

## Project Structure

```
web_baccarat/
├── index.html              # Entry point — game layout and UI structure
├── css/
│   └── style.css           # Dark casino theme, responsive breakpoints
├── js/
│   ├── config.js           # Game settings, payouts, timing, asset paths
│   ├── data.js             # Dealer profiles and dialog definitions
│   ├── utils.js            # Deck creation, shuffle, score calculation, helpers
│   ├── storage.js          # localStorage wrapper for points, history, stats
│   ├── game-engine.js      # Core baccarat logic and win-rate adjustment
│   └── ui-controller.js    # DOM manipulation, events, animations
├── assets/
│   ├── cards/              # 52 card face PNGs + card back
│   ├── chips/              # Chip images (fiche_0..5)
│   ├── dealers/            # Dealer portrait images (.webp)
│   └── backgrounds/        # Table background image
└── docs/                   # Documentation (reserved)
```

## Architecture

The app uses the **IIFE module pattern** with global variables (no ES modules) for `file://` compatibility.

### Script Load Order (dependency chain)

```
config.js → data.js → utils.js → storage.js → game-engine.js → ui-controller.js
```

| Module | Responsibility |
|---|---|
| `config.js` | All constants: deck count, payouts, bet limits, timing, asset paths, color schemes |
| `data.js` | Dealer array with name, image, personality, and categorized dialog strings |
| `utils.js` | Pure functions: `createDeck`, `shuffleDeck`, `calculateBaccaratScore`, `generateChipValues`, `calculateBetLimits`, number formatting |
| `storage.js` | `Storage` singleton — read/write `localStorage` for points, game history, and statistics |
| `game-engine.js` | `GameEngine` singleton — `playGame()` orchestrates deck creation, hand play, third-card rules, win-rate adjustment, and payout calculation |
| `ui-controller.js` | `UI` singleton — DOM caching, event binding, card dealing animation, phase management (betting → dealing → result), stats modal |

### Game Flow

```
[Betting Phase]
  User selects bet type + amount → clicks DEAL
        ↓
[Engine: playGame()]
  Deduct bet → Create & shuffle 8-deck shoe
  → Play hand (deal 4 cards, apply third-card rules)
  → Win-rate adjustment (retry up to 2x if needed)
  → Calculate payout → Update storage
        ↓
[Dealing Phase]
  Animate cards one by one with 400ms intervals
        ↓
[Result Phase]
  Show scores, result overlay, dealer dialog
  → Auto-transition to next round after 2s
```

### Baccarat Rules Implemented

- **Natural**: Player or Banker scores 8 or 9 on initial two cards — no third card drawn
- **Player draws** on 0–5, stands on 6–7
- **Banker draw** depends on banker's score and player's third card value (full tableau implemented)
- **Tie**: Bets on Player/Banker are returned (push); Tie bet pays 8:1

## Configuration

All tunable parameters are in `js/config.js`:

```javascript
CONFIG.INITIAL_POINTS       // 10000 — starting balance
CONFIG.NUM_DECKS            // 8 — standard baccarat shoe
CONFIG.PAYOUTS.player_win   // 2.0 (1:1)
CONFIG.PAYOUTS.banker_win   // 1.95 (0.95:1, 5% commission)
CONFIG.PAYOUTS.tie          // 9.0 (8:1)
CONFIG.MIN_BET              // 100
CONFIG.MAX_BET              // 100000
CONFIG.DEAL_INTERVAL        // 400ms — time between each card animation
CONFIG.AUTO_NEXT_DELAY      // 2000ms — delay before next round
CONFIG.TARGET_WIN_RATE      // 45 — target win rate for adjustment system
```

## Browser Compatibility

- Chrome 49+, Firefox 52+, Safari 10+, Edge 14+
- Works via `file://` protocol (no server required)
- Uses `crypto.getRandomValues()` for secure shuffle when available, falls back to `Math.random()`
- iOS safe area insets supported via `env(safe-area-inset-bottom)`

## Development

No build step required. Edit any file and refresh the browser.

```bash
# Optional: serve with a local HTTP server for development
python3 -m http.server 8080
# Then open http://localhost:8080
```

### Adding a New Dealer

1. Add a dealer portrait image to `assets/dealers/`
2. Append a new entry to the `DEALERS` array in `js/data.js`:

```javascript
{
  id: 'dealer_new',
  name: 'Alex',
  image: 'assets/dealers/dealer_new.webp',
  personality: 'mysterious',
  dialogs: {
    welcome: ["..."],
    win: ["..."],
    lose: ["..."],
    push: ["..."],
    player_win: ["..."],
    banker_win: ["..."],
    tie: ["..."],
    natural: ["..."]
  }
}
```

### Customizing Card Assets

Card images follow the naming convention:

```
assets/cards/card-{suit}-{value}.png
```

Where `suit` is `spade`, `heart`, `diamond`, or `club`, and `value` is `1`–`10`, `j`, `q`, or `k`.

## License

All rights reserved. Internal use only.
