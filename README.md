# 📝 Bilgrandov — Engineer's Field Notes

A professional, creative, and minimal portfolio website styled as a handwritten developer's notebook ("Field Notes"). This project demonstrates a strong foundation in Front-End engineering, dynamic DOM manipulation, database integrations, and clean code layout without relying on heavy frameworks.

## 🌟 Key Features
- **Field Notes Aesthetic**: Clean document-centric design with a cream/ink paper palette, handwriting accents, elegant typewriter fonts, and a custom theme switcher (Light & Dark modes).
- **Supabase Blog Integration**: Dynamically fetches and displays real-time posts from a remote PostgreSQL Supabase database, featuring title search and client-side SessionStorage caching.
- **Dynamic File Explorer**: The Projects and Posts page sidebars use tree-based navigation to explore records without reloading the page.
- **Client-Side PDF Generation**: Projects can be exported to a beautifully formatted landscape scrapbook PDF directly from the browser using `jsPDF` and HTML5 Canvas.
- **Markdown Rendering**: Articles use `marked.js` to render raw `.md` files dynamically.
- **Fully Responsive & Accessible**: Adapts seamlessly to all viewport sizes using pure CSS Flexbox and Grid, with keyboard navigation (`tabindex`, `role="button"`) and screen reader optimizations.

## 🛠️ Technology Stack
- **HTML5** (Semantic structure & WCAG Accessibility)
- **CSS3** (Custom Properties, Flexbox, Grid, CSS Transitions)
- **Vanilla JavaScript** (ES6+, Fetch API, sessionStorage caching)
- **Supabase** (PostgreSQL cloud database integration)
- **jsPDF & HTML5 Canvas** (Scrapbook PDF generation)
- **Marked.js** (Markdown parsing)

## 🚀 Getting Started

Because the project fetches data dynamically from JSON databases and external APIs, **it must be run through a local web server** (opening HTML files directly via `file://` will block AJAX requests).

### Installation & Run

```bash
# 1. Clone this repository
git clone https://github.com/Bilgrandov/bilgrandov.github.io.git

# 2. Enter directory
cd bilgrandov.github.io

# 3. Create your Supabase config file
# Copy supabase.config.example.js to supabase.config.js and add your project keys:
cp supabase.config.example.js supabase.config.js

# 4. Start a local server (Example using PHP, or Python, or VSCode Live Server)
php -S localhost:8000
```
Then visit `http://localhost:8000` in your browser.

## 📁 File Structure
- `index.html` — Main profile page / front sheet
- `skills.html` — Technical skills catalog
- `projects.html` — Selected works archive & PDF generator
- `posts.html` — Blog & learning journal explorer
- `contact.html` — Work preferences & contact info
- `style.css` — Central responsive styling system & theme definitions
- `script.js` — Core client-side controller logic
- `data/` — Local JSON databases (`projects.json`, `skills.json`)

---
*Compiled by Bilgrandov — Always Learning 🌿*
