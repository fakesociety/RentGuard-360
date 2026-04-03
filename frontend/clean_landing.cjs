const fs = require('fs');
const file = 'c:/Users/user/source/repos/RentGuard-360/frontend/src/pages/public/LandingPage.jsx';
let content = fs.readFileSync(file, 'utf8');
// remove from RegisterPromptModal down to MAIN LANDING PAGE
content = content.replace(/\/\/ Registration Prompt Modal Component.*?(\/\/ ===== MAIN LANDING PAGE =====)/s, '$1');
// remove ALL the auth modal related rendering: anything inside toggleAuth... until nextSlide
content = content.replace(/const toggleAuth =.*?const nextSlide = /s, 'const nextSlide = ');
// Write it back
fs.writeFileSync(file, content);