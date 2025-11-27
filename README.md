# IRDA IR-38 Exam Study Site

A premium, interactive study website for the Indian IRDA IR-38 insurance agent exam.

## Features
- **Study Mode**: Practice questions with immediate feedback.
- **Explanations**: Detailed explanations with visual aids (charts).
- **Progress Tracking**: Dashboard with accuracy, total attempted, and correct/wrong counts.
- **History**: Review your past answers.
- **Persistence**: Progress is saved automatically using LocalStorage.
- **Responsive Design**: Works on mobile, tablet, and desktop.

## Setup & Run

1. **Prerequisites**: Node.js installed (optional, for local server).
2. **Run Locally**:
   You can simply open `index.html` in your browser, or for the best experience (to avoid CORS issues with JSON loading), run a local server:

   ```bash
   npx serve .
   ```

3. **Open in Browser**:
   Visit `http://localhost:3000` (or the port shown in terminal).

## Project Structure
- `index.html`: Main application layout.
- `style.css`: Premium glassmorphism styling.
- `script.js`: Application logic and state management.
- `data/questions.json`: Question bank.
- `assets/`: Images and icons.

## Technologies
- HTML5, CSS3, Vanilla JavaScript
- Chart.js (for visualizations)
- Font Awesome (for icons)
- Google Fonts (Inter)
