const fs = require("fs");
const content = fs.readFileSync("src/contexts/LanguageContext.jsx", "utf8");

const start = content.indexOf("const translations =");
let depth = 0;
let end = -1;
let started = false;

for (let i = start; i < content.length; i++) {
    if (content[i] === "{") {
        depth++;
        started = true;
    } else if (content[i] === "}") {
        depth--;
    }
    
    if (started && depth === 0) {
        end = i + 1;
        break;
    }
}

const objStr = content.substring(start, end).replace("const translations =", "var temp_translations =");
eval(objStr);

fs.mkdirSync("src/locales", { recursive: true });
fs.writeFileSync("src/locales/he.js", "export const he = " + JSON.stringify(temp_translations.he, null, 4) + ";\n", "utf8");
fs.writeFileSync("src/locales/en.js", "export const en = " + JSON.stringify(temp_translations.en, null, 4) + ";\n", "utf8");

const importLines = "import { he } from \"../locales/he\";\nimport { en } from \"../locales/en\";\n\nconst translations = { he, en };";
const newContent = content.substring(0, start) + importLines + content.substring(end);
fs.writeFileSync("src/contexts/LanguageContext.jsx", newContent, "utf8");
