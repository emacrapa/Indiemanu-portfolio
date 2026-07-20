# INDIEMANU — Portfolio Site

## Structure

```
indiemanu/
├── index.html          ← Single-page app shell (all pages inside)
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── main.js         ← All logic: routing, carousel, minigame, etc.
│   └── projects.json   ← ALL project content (edit this to add/update projects)
└── README.md
```

## How to run

Just open `index.html` in any browser. No build step, no server needed.
To host it, upload the entire folder to GitHub Pages, Netlify, Vercel, or any static host.

## Adding a new project

Edit `js/projects.json` and add a new object to the `"projects"` array:

```json
{
  "id": "my-new-game",
  "slug": "my-new-game",
  "title": "My New Game",
  "subtitle": "Context — short subtitle",
  "category": "gamejam",         // shipped | gamelab | remake | gamejam | coursera | other
  "categoryLabel": "Game Jam",
  "year": 2025,
  "coverImage": "https://...",   // 16:9 image URL
  "heroImage": "https://...",    // can be same as coverImage
  "role": "Game Designer",
  "duration": "48 hours",
  "teamSize": "5 members",
  "engine": "Unity",
  "platform": ["PC"],
  "tags": ["Game Jam", "Unity", "Solo"],
  "description": "Short description shown in cards.",
  "longDescription": "Full description shown on project page.",
  "links": [
    { "label": "itch.io Page", "url": "https://...", "icon": "itch" },
    { "label": "Download Build", "url": "https://...", "icon": "download" }
  ],
  "gallery": ["https://img1.jpg", "https://img2.jpg"],
  "color": "#2ea84a"             // accent colour for this project
}
```

## Easter Egg

Type the **Konami Code** anywhere on the site:  
`↑ ↑ ↓ ↓ ← → ← → B A`  
to unlock a hidden Breakout mini-game 🎮

## Pages

| Hash          | Page                          |
|---------------|-------------------------------|
| `#home`       | Landing page with carousel    |
| `#projects`   | All projects with search/filter |
| `#project/slug` | Individual project page     |
| `#about`      | About me + full CV timeline   |
| `#contact`    | All contact links             |

## Customisation tips

- **Your photo**: Replace the emoji in `page-about` with `<img src="your-photo.jpg">` inside `.about-avatar-box`
- **CV PDF**: Update the href on the CV download buttons to your actual PDF
- **Colours**: Edit CSS variables in `:root` in `style.css`
- **Fonts**: Loaded from Google Fonts — change `@import` at top of `style.css`
