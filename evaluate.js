import { GoogleGenerativeAI } from "@google/generative-ai";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const app = express();

app.use(cors());
app.use(express.json());

app.post("/evaluate", async (req, res) => {
  const { question, answer } = req.body;

  const prompt = `
Evaluate the answer to the question below and provide the correct answer.

Question: ${question}

Student's answer: ${answer}

Grade the answer on a scale from 1 to 10 (1 = poor, 10 = excellent). Also include the correct answer — everything combined must be no more than 300 characters.

Return the result **only** as a valid JSON object, with no introduction or comments.

Example output:
{
  "score": 7,
  "feedback": "Promises are not functions that wait to be called, but objects representing the result (or error) of an async operation. The async/await syntax makes working with Promises easier and looks like synchronous code."
}
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response) {
      throw new Error("Gemini did not return any response (response is null).");
    }

    const text = await response.text();

    if (!text || typeof text !== "string") {
      throw new Error(
        "Gemini returned no text or it was in an invalid format."
      );
    }

    console.log("🔍 Gemini raw response:", text);

    const match = text.match(
      /```json\n([\s\S]*?)\n```|```([\s\S]*?)```|\{[\s\S]*?\}/
    );

    if (!match || (!match[1] && !match[2] && !match[0])) {
      throw new Error(
        "Gemini response was not in JSON format or it couldn’t be extracted."
      );
    }

    let jsonString = match[1] || match[2] || match[0];
    jsonString = jsonString.replace(/^`{1,3}(json)?\s*|`{1,3}$/g, "").trim();

    const parsed = JSON.parse(jsonString);
    res.json(parsed);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({
      score: 0,
      feedback:
        "❌ Failed to get evaluation from AI. Try a different answer or contact the admin.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend is running at http://localhost:${PORT}`);
});
