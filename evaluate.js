import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const app = express();

app.use(cors());
app.use(express.json());

app.post("/evaluate", async (req, res) => {
  const { question, answer } = req.body;

  const prompt = `
Vyhodnoť odpověď studenta k níže uvedené otázce.

Otázka: ${question}

Odpověď studenta: ${answer}

Zhodnoť odpověď známkou od 1 do 10 (1 = špatná, 10 = výborná). Napiš zároveň krátkou zpětnou vazbu a přidej stručné vysvětlení správné odpovědi — vše dohromady maximálně 250 znaků.

Vrať výsledek **pouze** jako validní JSON objekt, bez jakéhokoli úvodu nebo komentáře.

Příklad výstupu:
{
  "score": 7,
  "feedback": "Student vystihl rozdíl mezi var a let, ale vynechal const. Správně: const je blokově scoped a nelze přepsat – u objektů ale lze měnit jejich obsah."
}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    const text = await response.text();
    const match = text.match(/```json\n([\s\S]*?)\n```|```([\s\S]*?)```|\{[\s\S]*?\}/);
    let jsonString = match[1] || match[2] || match[0];
    jsonString = jsonString.replace(/^`{1,3}(json)?\s*|`{1,3}$/g, "").trim();

    const parsed = JSON.parse(jsonString);
    res.json(parsed);
  } catch (err) {
    console.error("❌ Chyba:", err);
    res.status(500).json({
      score: 0,
      feedback: "❌ Chyba při získávání hodnocení z AI. Zkus jinou odpověď nebo kontaktuj admina.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend běží na http://localhost:${PORT}`);
});
