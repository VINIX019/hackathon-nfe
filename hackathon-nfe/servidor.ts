// Painel web: API + monitor de pagamentos rodando no mesmo processo.
// Rodar com: npm run painel   →   abrir http://localhost:3000
import express from "express";
import QRCode from "qrcode";
import * as path from "path";
import { lerLista, criarCobranca, rodadaMonitor, verificarDocumento } from "./nucleo";

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

// O XML chega como bytes brutos: o hash precisa ser calculado sobre o arquivo exato
const corpoXml = express.raw({ type: "*/*", limit: "5mb" });

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/cobrancas", (_req, res) => {
  res.json(lerLista().slice().reverse()); // mais recentes primeiro
});

app.post("/api/cobrancas", corpoXml, async (req, res) => {
  try {
    const nome = String(req.query.nome || "nota.xml");
    const c = criarCobranca(req.body as Buffer, nome);
    const qr = await QRCode.toDataURL(c.url, { width: 360, margin: 1 });
    res.json({ ...c, qr });
  } catch (e: any) {
    res.status(400).json({ erro: e.message });
  }
});

app.get("/api/cobrancas/:reference/qr", async (req, res) => {
  const c = lerLista().find((x) => x.reference === req.params.reference);
  if (!c) return res.status(404).json({ erro: "Cobrança não encontrada." });
  res.json({ qr: await QRCode.toDataURL(c.url, { width: 360, margin: 1 }), url: c.url });
});

app.post("/api/verificar", corpoXml, async (req, res) => {
  try {
    res.json(await verificarDocumento(req.body as Buffer));
  } catch (e: any) {
    res.status(500).json({ erro: e.message });
  }
});

// Monitor embutido: uma rodada a cada 3 s, sem sobrepor rodadas
async function loopMonitor() {
  try {
    await rodadaMonitor();
  } catch (e: any) {
    console.warn("Erro no monitor:", e.message);
  }
  setTimeout(loopMonitor, 3000);
}

app.listen(PORTA, () => {
  console.log(`Painel em http://localhost:${PORTA}`);
  console.log("Monitor de pagamentos ativo.");
  loopMonitor();
});
