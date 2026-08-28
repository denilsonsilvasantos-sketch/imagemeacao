import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Generation endpoint for custom cards/words by theme & age
app.post("/api/generate-cards", async (req, res) => {
  try {
    const { theme, ageRange, count = 5, customInstructions = "" } = req.body;

    if (!theme || !ageRange) {
      return res.status(400).json({ error: "Tema e faixa etária são obrigatórios." });
    }

    const ai = getAIClient();

    const prompt = `Gere ${count} conjuntos completos de cartas do jogo "Imagem & Ação" no formato clássico com as 6 categorias:
Tema: "${theme}"
Faixa Etária: "${ageRange}"
${customInstructions ? `Instruções adicionais: ${customInstructions}` : ""}

Regras para as categorias:
- P (PESSOA): Personagem, pessoa histórica, figura relevante compatível com o tema e a idade (ex: Bíblia -> Davi, Moisés, Maria).
- O (OBJETO): Item físico, artefato, objeto representável por mímica ou desenho (ex: Cálice, Cajado, Arca).
- A (AÇÃO): Verbo ou ação representável (ex: Orar, Pregar, Construir arca, Pescar).
- D (DESAFIO): Palavra única ou termo simples desafiador (atenção: NÃO use frases longas! Máximo 1 ou 2 palavras, ex: Maná, Serpente, Gigante).
- L (LUGAR): Local geográfico, cidade, monte ou livro relevante (ex: Belém, Nazaré, Egito, Gênesis).
- M (MISTÉRIO/TEMA): Conceito, evento marcante ou mistério (ex: Pentecostes, Parábola, Criação).

As palavras devem ser divertidas, adequadas para gincanas em grupo/igreja/família e compatíveis com a faixa etária especificada.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction:
          "Você é um especialista em jogos de gincana, dinâmicas bíblicas e recreação para todas as idades. Gere palavras claras, cativantes e fáceis de mimetizar/desenhar.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista de cards de Imagem & Ação contendo as 6 categorias",
          items: {
            type: Type.OBJECT,
            properties: {
              P: { type: Type.STRING, description: "Pessoa ou personagem" },
              O: { type: Type.STRING, description: "Objeto" },
              A: { type: Type.STRING, description: "Ação (verbo ou ação)" },
              D: { type: Type.STRING, description: "Desafio (palavra simples ou termo curto)" },
              L: { type: Type.STRING, description: "Lugar ou livro" },
              M: { type: Type.STRING, description: "Mistério ou tema" },
              pontos: { type: Type.INTEGER, description: "Pontos do card (padrão 1)" },
            },
            required: ["P", "O", "A", "D", "L", "M"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Nenhum dado retornado pela IA.");
    }

    const cards = JSON.parse(text);
    return res.json({ success: true, cards });
  } catch (error: any) {
    console.error("Erro na geração por IA:", error);
    return res.status(500).json({
      error: "Falha ao gerar cartas por IA.",
      details: error?.message || String(error),
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
