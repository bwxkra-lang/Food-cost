import React, { useState, useEffect, useMemo, useRef } from "react";

/* ============================================================
   MENSANA · Quaderno dei costi + Supabase
   Food cost per piatto → prezzo → menu engineering → libretto PDF
   Dati sincronizzati su Supabase, real-time per i collaboratori
   ============================================================ */

// Configurazione Supabase
const SUPABASE_URL = "https://qogbmlxrewvkaaufvhjp.supabase.co";
const SUPABASE_KEY = "sb_publishable_apH2G0GjocUwAeh7uStEhA_mr3-MhGW";

const CATS = ["antipasti", "primi", "secondi", "contorni", "dolci"];

const uid = () => Math.random().toString(36).slice(2, 9);

/* --- ingrediente: peso SERVITO nel piatto, poi scarto e calo risalgono al lordo --- */
const ALLERGENI = [
  "Glutine", "Crostacei", "Uova e derivati", "Pesce", "Arachidi e derivati", "Soia",
  "Latte e lattiero-caseari", "Frutta a guscio", "Sedano", "Senape", "Sesamo",
  "Anidride solforosa e solfiti", "Lupino", "Molluschi",
];

/* riconoscimento automatico degli allergeni dal nome dell'ingrediente */
const REGOLE = [
  [/farina|semola|pane|pangrattato|frisa|focaccia|carasau|savoiard|cantucc|orecchiett|capunt|troccol|fregola|pasticciotto|crumble|amido/i, 1],
  [/gamber|scampi|astice|granch/i, 2],
  [/uov|tuorl|albume|maionese|mayo/i, 3],
  [/pesce|spada|tonno|orata|acciug|alici|bottarg|paranza|katsuobushi/i, 4],
  [/arachid/i, 5],
  [/soia/i, 6],
  [/burrata|stracciat|ricotta|caciocavallo|cacioricotta|provola|nodini|mascarpone|blu di capra|panna|latte(?! di mandorla)|formagg|fonduta|parmigian|pecorin|fior di latte/i, 7],
  [/mandorl|noc|pistacch|frutta a guscio|latte di mandorla/i, 8],
  [/sedano/i, 9],
  [/senape/i, 10],
  [/sesamo/i, 11],
  [/vino|moscato|passito|aceto|solfit/i, 12],
  [/lupin|fave|macco/i, 13],
  [/cozze|vongol|seppia|polpo|moscardin|totano|calamar|mollusc/i, 14],
];
const guessAlg = (nome) => REGOLE.filter(([r]) => r.test(nome || "")).map(([, n]) => n);

const ing = (nome, servito, scarto, calo, costoKg, unit = "g", alg = null) => ({
  id: uid(), nome, servito, scarto, calo, costoKg, unit,
  alg: alg || guessAlg(nome),
});

const DEFAULT_DISHES = [
  /* ---------------- ANTIPASTI ---------------- */
  { id: uid(), cat: "antipasti", nome: "La Frisa del Gargano", prezzo: 15, venduti: 0, sole: false,
    desc: "maiale stufato a lungo, germogli di senape e cipolla rossa agrodolce",
    story: "La frisa nasce come pane dei contadini: si bagnava per ammorbidirla. Qui a bagnarla è il sugo dello stufato, cotto quattro ore.",
    wine: "", upsell: "",
    ings: [ing("Frisa", 60, 0, 0, 4), ing("Spalla di maiale", 90, 8, 35, 8.5),
            ing("Cipolla rossa", 30, 12, 20, 2.2), ing("Germogli di senape", 5, 0, 0, 40)] },

  { id: uid(), cat: "antipasti", nome: "Bruschetta della Murgia", prezzo: 15, venduti: 0, sole: true,
    desc: "pane bruscato, blu di capra di Bitonto e carne salada di cavallo",
    story: "La carne salada la facciamo noi: parte magra di cavallo, salata e riposata, tagliata sottile al momento. Sotto, il blu di capra di Bitonto — erborinato di latte caprino, venato di blu-verde, cremoso e appena piccante.",
    wine: "Susumaniello Antieri · Schola Sarmenti", upsell: "",
    ings: [ing("Pane casereccio", 70, 0, 12, 3.5), ing("Blu di capra", 30, 0, 0, 35),
            ing("Carne salada di cavallo", 45, 15, 0, 20)] },

  { id: uid(), cat: "antipasti", nome: "Zuppa di cozze e fagioli alla tarantina", prezzo: 13, venduti: 0, sole: false,
    desc: "cozze aperte al pepe nero, fagioli e il loro brodo",
    story: "", wine: "", upsell: "",
    ings: [ing("Cozze", 350, 0, 0, 4), ing("Fagioli secchi", 40, 0, -110, 3.2),
            ing("Pomodorino", 40, 0, 0, 3), ing("Pane per crostone", 25, 0, 0, 3.5)] },

  { id: uid(), cat: "antipasti", nome: "Cuoppo di seppia e gamberi", prezzo: 18, venduti: 0, sole: false,
    desc: "fritti al momento, con salsa agrodolce di 'nduja e miele",
    story: "", wine: "", upsell: "",
    ings: [ing("Seppia", 80, 20, 15, 12), ing("Gamberi", 70, 30, 15, 16),
            ing("Semola per frittura", 30, 0, 0, 1.4), ing("'Nduja", 12, 0, 0, 18),
            ing("Miele", 10, 0, 0, 12)] },

  { id: uid(), cat: "antipasti", nome: "Tagliere Valle d'Itria", prezzo: 20, venduti: 0, sole: false,
    desc: "capocollo di Martina Franca, salame dolce, nodini di Andria, caciocavallo occhiato, olive Bella di Cerignola, fichi secchi al vino rosso",
    story: "", wine: "Chiacchierino Primitivo di Manduria", upsell: "",
    ings: [ing("Capocollo Martina Franca", 45, 12, 0, 32), ing("Salame dolce", 35, 10, 0, 16),
            ing("Nodini di Andria", 60, 0, 0, 12), ing("Caciocavallo occhiato", 40, 5, 0, 14),
            ing("Olive Bella di Cerignola", 40, 25, 0, 9), ing("Fichi secchi", 25, 0, 0, 14),
            ing("Vino rosso da cottura", 20, 0, 0, 3, "ml")] },

  { id: uid(), cat: "antipasti", nome: "Burrata del casaro", prezzo: 14, venduti: 0, sole: false,
    desc: "fatta fresca stamattina da Giuseppe, con cardoncelli e pane carasau",
    story: "", wine: "", upsell: "",
    ings: [ing("Burrata", 180, 0, 0, 14), ing("Cardoncelli", 60, 12, 30, 9),
            ing("Pane carasau", 20, 0, 0, 12)] },

  { id: uid(), cat: "antipasti", nome: "La fcazz' ripiena", prezzo: 11, venduti: 0, sole: false,
    desc: "caciocavallo occhiato che fila e cime di rapa",
    story: "", wine: "", upsell: "",
    ings: [ing("Impasto focaccia", 180, 0, 12, 1.2), ing("Caciocavallo occhiato", 60, 5, 0, 14),
            ing("Cime di rapa", 90, 45, 35, 2.8)] },

  { id: uid(), cat: "antipasti", nome: "La fcazz' pugliese", prezzo: 7, venduti: 0, sole: false,
    desc: "soffice e calda, pomodorino di Manduria",
    story: "", wine: "", upsell: "provala con la stracciata|+2",
    ings: [ing("Impasto focaccia", 160, 0, 12, 1.2), ing("Pomodorino di Manduria", 60, 0, 0, 4.5),
            ing("Olio EVO", 12, 0, 0, 9, "ml")] },

  /* ---------------- PRIMI ---------------- */
  { id: uid(), cat: "primi", nome: "Orecchiette mare e terra", prezzo: 22, venduti: 0, sole: true,
    desc: "cime di rapa e vongole veraci",
    story: "Le cime di rapa con le orecchiette sono il piatto pugliese per definizione. Quest'anno le abbiamo portate al mare: vongole veraci aperte al momento, l'amaro della cima che incontra il salato del guscio.",
    wine: "Bombino Bianco Marese · Rivera", upsell: "",
    ings: [ing("Orecchiette fresche", 130, 0, -60, 5), ing("Vongole veraci", 180, 0, 0, 20),
            ing("Cime di rapa", 150, 45, 35, 2.8), ing("Aglio, olio, peperoncino", 15, 0, 0, 9)] },

  { id: uid(), cat: "primi", nome: "Fregola alla Salentina", prezzo: 19, venduti: 0, sole: false,
    desc: "polpo, moscardini in pignata e stracciata fresca a crudo",
    story: "La fregola ce la prestano i nostri cugini sardi: noi la decliniamo nel nostro mare, con il polpo e i moscardini cotti nella pignata di coccio.",
    wine: "", upsell: "",
    ings: [ing("Fregola", 90, 0, -110, 6), ing("Teste di polpo", 70, 10, 35, 11),
            ing("Moscardini", 70, 15, 30, 10), ing("Stracciata", 40, 0, 0, 13),
            ing("Passata Cusmai", 60, 0, 0, 4.5)] },

  { id: uid(), cat: "primi", nome: "Troccoli al cavallo", prezzo: 17, venduti: 0, sole: false,
    desc: "stracotto di sette ore e cacioricotta a scaglie",
    story: "Il ragù di cavallo cuoce sette ore. È la ricetta della domenica delle case del Salento, quella che si iniziava il sabato sera.",
    wine: "Piro Piro Negroamaro del Salento", upsell: "",
    ings: [ing("Troccoli freschi", 130, 0, -60, 5), ing("Polpa di cavallo", 80, 10, 40, 13),
            ing("Passata Cusmai", 70, 0, 0, 4.5), ing("Cacioricotta", 15, 0, 0, 16),
            ing("Sedano, carota, cipolla", 25, 20, 0, 2)] },

  { id: uid(), cat: "primi", nome: "Capunti Mensana", prezzo: 17, venduti: 0, sole: false,
    desc: "conserva Cusmai, burrata e finocchietto selvatico",
    story: "La conserva arriva da Masseria Cusmai, a Bitonto: quando finisce, si aspetta la prossima raccolta.",
    wine: "", upsell: "",
    ings: [ing("Capunti freschi", 130, 0, -60, 5), ing("Conserva Cusmai", 110, 0, 0, 4.5),
            ing("Burrata", 60, 0, 0, 14), ing("Finocchietto", 8, 0, 0, 12)] },

  { id: uid(), cat: "primi", nome: "Orecchiette alla Nerano di zucca", prezzo: 15, venduti: 0, sole: false,
    desc: "caciocavallo, timo e polvere di capocollo",
    story: "Un piatto campano declinato con la zucca di stagione e innestato con la polvere di capocollo di Martina Franca, per quel tocco abbrustolito.",
    wine: "", upsell: "",
    ings: [ing("Orecchiette fresche", 130, 0, -60, 5), ing("Zucca", 140, 30, 25, 2.4),
            ing("Caciocavallo", 35, 5, 0, 14), ing("Scarto capocollo (polvere)", 10, 0, 40, 0)] },

  /* ---------------- SECONDI ---------------- */
  { id: uid(), cat: "secondi", nome: "U purpu arrustutu", prezzo: 24, venduti: 0, sole: false,
    desc: "purè di patate, fave fritte e salsa verde",
    story: "Croccante fuori, morbido dentro, con l'affumicato della piastra addosso. Come se fossimo a Polignano, con i piedi a penzoloni sulla scogliera.",
    wine: "Pungirosa · Rivera", upsell: "",
    ings: [ing("Polpo", 220, 12, 35, 13), ing("Patate", 150, 20, 15, 1.4),
            ing("Fave secche", 30, 0, 0, 4), ing("Prezzemolo, olio, capperi", 20, 0, 0, 8)] },

  { id: uid(), cat: "secondi", nome: "Controfiletto di cavallo", prezzo: 29, venduti: 0, sole: true,
    desc: "300 gr, caciocavallo al cannello",
    story: "Il cavallo è una carne che si trova poco, e il controfiletto è il taglio più pregiato: il macellaio ce lo porta una volta a settimana, e non sempre c'è. Tre etti, porzionati a mano, cotti al sangue. Il caciocavallo lo sciogliamo al cannello sopra la carne, sulla piastra, e cola mentre il piatto arriva al tavolo. Con il tartufo sopra — quel sentore di terra e di bosco — è la morte sua.",
    wine: "", upsell: "provalo con il tartufo|+3",
    ings: [ing("Controfiletto di cavallo", 300, 8, 0, 20), ing("Caciocavallo occhiato", 50, 5, 0, 14),
            ing("Rosmarino, olio, sale", 10, 0, 0, 7)] },

  { id: uid(), cat: "secondi", nome: "«Braciola» di pesce spada", prezzo: 22, venduti: 0, sole: false,
    desc: "nel suo sugo lento e olive taggiasche",
    story: "La braciola è l'involtino della domenica: di solito si fa con la carne, qui la facciamo con lo spada. Stessa cottura lenta nel sugo.",
    wine: "", upsell: "",
    ings: [ing("Pesce spada", 200, 15, 20, 13), ing("Passata Cusmai", 90, 0, 0, 4.5),
            ing("Olive taggiasche", 30, 20, 0, 12), ing("Pangrattato, aglio, prezzemolo", 25, 0, 0, 3)] },

  { id: uid(), cat: "secondi", nome: "Cotoletta di pleurotus", prezzo: 15, venduti: 0, sole: false,
    desc: "dorata e croccante, salsa di cime di rapa, champignon marinato e rucola",
    story: "D'estate era la parmigiana, d'inverno è il fungo: impanato e fritto come una cotoletta. La polpa soda tiene la frittura come una fetta di carne.",
    wine: "", upsell: "",
    ings: [ing("Pleurotus", 220, 10, 25, 7), ing("Pangrattato e uovo", 60, 0, 0, 3.5),
            ing("Cime di rapa (salsa)", 80, 45, 35, 2.8), ing("Champignon", 50, 10, 20, 5),
            ing("Rucola", 20, 10, 0, 8)] },

  { id: uid(), cat: "secondi", nome: "Bombette con la loro salsa", prezzo: 18, venduti: 0, sole: false,
    desc: "capocollo, pancetta e provola",
    story: "L'icona più conosciuta della Puglia: nate nelle bracerie della Valle d'Itria, dove il macellaio ti cuoce la carne davanti mentre aspetti. La provola dentro si scioglie e resta filante.",
    wine: "Passera Scopaiola Nero di Troia", upsell: "",
    ings: [ing("Capocollo di maiale", 150, 12, 30, 9), ing("Pancetta", 50, 8, 30, 8),
            ing("Provola", 60, 5, 0, 10), ing("Insalata di contorno", 50, 20, 0, 3)] },

  /* ---------------- CONTORNI ---------------- */
  { id: uid(), cat: "contorni", nome: "Macco di fave", prezzo: 7, venduti: 0, sole: true,
    desc: "cremoso, come lo facevano nei campi",
    story: "", wine: "", upsell: "provalo con la cicoria|10",
    ings: [ing("Fave decorticate", 90, 0, -120, 3.5), ing("Olio EVO", 15, 0, 0, 9, "ml")] },

  { id: uid(), cat: "contorni", nome: "Patate novelle al forno", prezzo: 7, venduti: 0, sole: false,
    desc: "croccanti fuori, morbide dentro",
    story: "", wine: "", upsell: "provale con fonduta e tartufo|10",
    ings: [ing("Patate novelle", 230, 12, 18, 2), ing("Olio, aglio, rosmarino", 15, 0, 0, 8)] },

  { id: uid(), cat: "contorni", nome: "Verza e cavolo alla salentina", prezzo: 8, venduti: 0, sole: false,
    desc: "", story: "", wine: "", upsell: "",
    ings: [ing("Verza e cavolo", 250, 25, 35, 1.6), ing("Olio, aglio, peperoncino", 15, 0, 0, 8)] },

  { id: uid(), cat: "contorni", nome: "Cicoria ripassata", prezzo: 7, venduti: 0, sole: false,
    desc: "saltata in padella con aglio e peperoncino",
    story: "", wine: "", upsell: "",
    ings: [ing("Cicoria", 220, 40, 40, 2.6), ing("Olio, aglio, peperoncino", 15, 0, 0, 8)] },

  /* ---------------- DOLCI ---------------- */
  { id: uid(), cat: "dolci", nome: "Zabaione caldo al moscato di Trani", prezzo: 8, venduti: 0, sole: false,
    desc: "montato al momento, con i cantucci salentini del nostro pasticcere Donato",
    story: "Si monta al momento, caldo, con il moscato di Trani: un vino dolce che in Puglia si beve a fine pasto da sempre. Arriva fumante, si intinge il cantuccio.",
    wine: "", upsell: "",
    ings: [ing("Tuorli", 40, 0, 0, 7), ing("Zucchero", 30, 0, 0, 1.2),
            ing("Moscato di Trani", 40, 0, 0, 9, "ml"), ing("Cantucci (Donato)", 45, 0, 0, 14)] },

  { id: uid(), cat: "dolci", nome: "Pasticciotto e biancomangiare", prezzo: 9, venduti: 0, sole: true,
    desc: "",
    story: "Lo fa Donato, il re del pasticciotto a Roma, salentino doc. Arriva caldo, accompagnato da una crema di biancomangiare — un dolce pugliese antico, fatto solo con le mandorle.",
    wine: "", upsell: "",
    ings: [ing("Pasticciotto (Donato)", 1, 0, 0, 1.2, "pz"),
            ing("Latte di mandorla", 90, 0, 0, 3, "ml"), ing("Amido e zucchero", 15, 0, 0, 2)] },

  { id: uid(), cat: "dolci", nome: "Sporcamousse", prezzo: 8, venduti: 0, sole: false,
    desc: "crema pasticcera, ricotta mantecata e frutti di bosco",
    story: "Si chiama così perché è fatto per sporcare: si rompe la superficie e si mescola tutto. Non è un dolce elegante, è un dolce da finire.",
    wine: "", upsell: "",
    ings: [ing("Ricotta", 90, 0, 0, 6), ing("Crema pasticcera", 70, 0, 0, 3.5),
            ing("Frutti di bosco", 40, 0, 0, 12)] },

  { id: uid(), cat: "dolci", nome: "Pere al vino rosso pugliese", prezzo: 8, venduti: 0, sole: false,
    desc: "cotte nel vino finché non prendono il colore, cioccolato fondente e crumble · vegano e senza glutine",
    story: "", wine: "Passito di Pantelleria", upsell: "",
    ings: [ing("Pere", 160, 15, 20, 2.4), ing("Vino rosso", 90, 0, 0, 3, "ml"),
            ing("Cioccolato fondente", 25, 0, 0, 11), ing("Crumble di mandorle", 30, 0, 0, 9)] },

  { id: uid(), cat: "dolci", nome: "Tirami giù", prezzo: 8, venduti: 0, sole: false,
    desc: "variante con latte di mandorla, caffè e mandorle tostate",
    story: "", wine: "", upsell: "",
    ings: [ing("Mascarpone", 80, 0, 0, 9), ing("Savoiardi", 40, 0, 0, 7),
            ing("Latte di mandorla", 50, 0, 0, 3, "ml"), ing("Mandorle tostate", 15, 0, 0, 16)] },
];

/* ---------- calcoli ---------- */
function lordoOf(i) {
  const s = Math.min(i.scarto || 0, 95) / 100;
  const c = (i.calo || 0) / 100;
  const resa = (1 - s) * (1 - c);
  if (resa <= 0) return 0;
  return (i.servito || 0) / resa;
}
function costoOf(i) {
  if (i.unit === "pz") return (i.servito || 0) * (i.costoKg || 0);
  return (lordoOf(i) / 1000) * (i.costoKg || 0);
}
const costoPiatto = (d) => d.ings.reduce((a, i) => a + costoOf(i), 0);
const algPiatto = (d) => {
  const set = new Set();
  d.ings.forEach((i) => (i.alg || []).forEach((n) => set.add(n)));
  return [...set].sort((a, b) => a - b);
};
const eur = (n) => (isFinite(n) ? n : 0).toFixed(2).replace(".", ",");

export default function App() {
  const [dishes, setDishes] = useState(DEFAULT_DISHES);
  const [fcMin, setFcMin] = useState(24);
  const [fcMax, setFcMax] = useState(30);
  const [iva, setIva] = useState(10);
  const [open, setOpen] = useState(null);
  const [tab, setTab] = useState("costi");
  const [saved, setSaved] = useState("");
  const [baseline, setBaseline] = useState(null);
  const [files, setFiles] = useState([]);
  const [vista, setVista] = useState(null);
  const [stampa, setStampa] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);
  const syncTimeout = useRef(null);

  /* ---------- persistenza su Supabase ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/mensana_menu?select=data&id=eq.main`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "apikey": SUPABASE_KEY,
          },
        });
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const v = rows[0].data;
          if (v.dishes) setDishes(v.dishes);
          if (v.fcMin) setFcMin(v.fcMin);
          if (v.fcMax) setFcMax(v.fcMax);
          if (v.iva != null) setIva(v.iva);
          if (v.baseline) setBaseline(v.baseline);
        }
      } catch (e) { /* prima apertura o nessun dato su Supabase */ }
      setLoading(false);
    })();
  }, []);

  /* Auto-save su Supabase con debounce */
  useEffect(() => {
    clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(() => {
      save();
    }, 2000);
    return () => clearTimeout(syncTimeout.current);
  }, [dishes, fcMin, fcMax, iva, baseline]);

  const save = async () => {
    try {
      const data = { dishes, fcMin, fcMax, iva, baseline };
      const rows = await fetch(`${SUPABASE_URL}/rest/v1/mensana_menu?id=eq.main`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
        },
      }).then(r => r.json());
      
      if (rows && rows.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/mensana_menu?id=eq.main`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "apikey": SUPABASE_KEY,
          },
          body: JSON.stringify({ data }),
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/mensana_menu`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "apikey": SUPABASE_KEY,
          },
          body: JSON.stringify({ id: "main", data }),
        });
      }
      setSaved("Salvato su Supabase · " + new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
      setTimeout(() => setSaved(""), 3000);
    } catch (e) { setSaved("Salvataggio non riuscito: " + (e?.message || e)); }
  };

  const ricarica = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/mensana_menu?select=data&id=eq.main`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
        },
      });
      const rows = await res.json();
      if (rows && rows.length > 0) {
        const v = rows[0].data;
        if (v.dishes) setDishes(v.dishes);
        if (v.fcMin) setFcMin(v.fcMin);
        if (v.fcMax) setFcMax(v.fcMax);
        if (v.iva != null) setIva(v.iva);
        if (v.baseline) setBaseline(v.baseline);
        setSaved("Ricaricato dall'ultima versione salvata su Supabase");
        setTimeout(() => setSaved(""), 3000);
      }
    } catch (e) { setSaved("Nessuna versione salvata trovata su Supabase"); }
  };

  const pubblica = (blob, nome, extra = "") => {
    const url = URL.createObjectURL(blob);
    const voce = { url, nome, extra,
      ora: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
    setFiles((f) => [voce, ...f].slice(0, 6));
    if (nome.endsWith(".pdf")) setVista(voce);
  };

  const fcTarget = (fcMin + fcMax) / 200;

  /* ---------- analisi ---------- */
  const analisi = useMemo(() => {
    const out = {};
    CATS.forEach((cat) => {
      const list = dishes.filter((d) => d.cat === cat).map((d) => {
        const costo = costoPiatto(d);
        const imponibile = d.prezzo / (1 + iva / 100);
        const fc = imponibile > 0 ? costo / imponibile : 0;
        const margine = imponibile - costo;
        const suggerito = fcTarget > 0 ? (costo / fcTarget) * (1 + iva / 100) : 0;
        return { ...d, costo, imponibile, fc, margine, suggerito, algList: algPiatto(d) };
      });
      const totV = list.reduce((a, d) => a + (d.venduti || 0), 0);
      const soglia = list.length ? 0.7 / list.length : 0;
      const margMedio = totV > 0
        ? list.reduce((a, d) => a + d.margine * (d.venduti || 0), 0) / totV
        : list.reduce((a, d) => a + d.margine, 0) / (list.length || 1);
      list.forEach((d) => {
        d.mix = totV > 0 ? (d.venduti || 0) / totV : null;
        d.popolare = d.mix != null ? d.mix >= soglia : null;
        d.redditizio = d.margine >= margMedio;
        d.quad = d.mix == null ? "—"
          : d.popolare && d.redditizio ? "Star"
          : d.popolare && !d.redditizio ? "Plowhorse"
          : !d.popolare && d.redditizio ? "Puzzle" : "Dog";
      });
      out[cat] = { list, totV, soglia, margMedio };
    });
    return out;
  }, [dishes, iva, fcTarget]);

  /* ordine consigliato: Puzzle alti in cima, poi Star per margine, Plowhorse/Dog in fondo */
  const ordinato = (cat) => {
    const rank = { Puzzle: 0, Star: 1, "—": 2, Dog: 3, Plowhorse: 4 };
    return [...analisi[cat].list].sort((a, b) => {
      const r = (rank[a.quad] ?? 2) - (rank[b.quad] ?? 2);
      return r !== 0 ? r : b.margine - a.margine;
    });
  };

  /* ---------- mutazioni ---------- */
  const upd = (id, patch) => setDishes((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const updIng = (did, iid, patch) =>
    setDishes((ds) => ds.map((d) => d.id !== did ? d
      : { ...d, ings: d.ings.map((i) => (i.id === iid ? { ...i, ...patch } : i)) }));
  const addIng = (did) =>
    setDishes((ds) => ds.map((d) => d.id !== did ? d : { ...d, ings: [...d.ings, ing("", 0, 0, 0, 0)] }));
  const delIng = (did, iid) =>
    setDishes((ds) => ds.map((d) => d.id !== did ? d : { ...d, ings: d.ings.filter((i) => i.id !== iid) }));
  const addDish = (cat) =>
    setDishes((ds) => [...ds, { id: uid(), cat, nome: "Nuovo piatto", prezzo: 0, venduti: 0,
      sole: false, desc: "", story: "", wine: "", upsell: "", ings: [] }]);
  const delDish = (id) => setDishes((ds) => ds.filter((d) => d.id !== id));

  const copiaDati = async () => {
    const testo = JSON.stringify({ dishes, fcMin, fcMax, iva, baseline });
    try {
      await navigator.clipboard.writeText(testo);
      setSaved("Dati copiati — incollali nella chat e ti rigenero il menù in PDF");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = testo; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); setSaved("Dati copiati negli appunti"); }
      catch (err) { setSaved("Copia non riuscita: seleziona a mano dal riquadro qui sotto"); }
      document.body.removeChild(ta);
    }
    setTimeout(() => setSaved(""), 5000);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ dishes, fcMin, fcMax, iva, baseline }, null, 2)],
      { type: "application/json" });
    pubblica(blob, "mensana-dati.json");
  };
  const importJson = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const v = JSON.parse(r.result);
        if (v.dishes) setDishes(v.dishes);
        if (v.fcMin) setFcMin(v.fcMin);
        if (v.fcMax) setFcMax(v.fcMax);
        if (v.iva != null) setIva(v.iva);
      } catch (err) { alert("File non leggibile"); }
    };
    r.readAsText(f);
  };



  /* ---------- versione stampabile (iOS: Condividi → Salva come PDF) ---------- */
  const esc = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const soleSvg = (px) =>
    `<svg viewBox="0 0 100 100" width="${px}" height="${px}" style="vertical-align:middle">
       <g fill="#B8873F"><circle cx="50" cy="50" r="18"/>` +
    Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const p = (r, o) => `${50 + r * Math.cos(a + o)},${50 + r * Math.sin(a + o)}`;
      return `<polygon points="${p(17, 0.16)} ${p(17, -0.16)} ${p(48, 0)}"/>`;
    }).join("") + `</g></svg>`;

  const htmlMenu = () => {
    const titolo = { antipasti: "Antipasti", primi: "Primi", secondi: "Secondi",
                     contorni: "Contorni", dolci: "Dolci" };
    const sezioni = CATS.map((cat) => {
      const piatti = ordinato(cat).map((d) => {
        const alg = d.algList?.length ? `<sup>${d.algList.join(",")}</sup>` : "";
        const up = d.upsell
          ? `<div class="box">${esc(d.upsell.split("|")[0])} <b>${esc(d.upsell.split("|")[1])}</b></div>` : "";
        const wi = d.wine ? `<div class="wine">in abbinamento · ${esc(d.wine)}</div>` : "";
        const st = d.story ? `<p class="story">${esc(d.story)}</p>` : "";
        const de = d.desc ? `<p class="desc">${esc(d.desc)}</p>` : "";
        const pr = d.proofTxt ? "" : "";
        return `<div class="dish">
            <h3>${d.sole ? soleSvg(13) + " " : ""}${esc(d.nome)}
              <span class="price">${esc(String(d.prezzo).replace(".", ","))}${alg}</span></h3>
            ${de}${st}${up}${wi}${pr}</div>`;
      }).join("");
      return `<section><h2>${titolo[cat]}</h2>${piatti}</section>`;
    }).join("");

    const legenda = ALLERGENI.map((a, n) => `<span>${n + 1}. ${a}</span>`).join("");

    return `<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Mensana — menù autunno</title>
<style>
  @page { size: A5; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Georgia, "Times New Roman", serif; color:#25304C;
         background:#F8F4EA; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .cover { background:#1B2338; color:#F8F4EA; text-align:center; padding:70px 20px;
           page-break-after:always; }
  .cover .nome { font-family:Helvetica,Arial,sans-serif; font-weight:700; font-size:34px;
                 letter-spacing:-.5px; margin:26px 0 4px; }
  .cover .sub { color:#D9AE6B; font-style:italic; letter-spacing:3px; font-size:11px; }
  .cover .payoff { color:#B8873F; font-family:Helvetica,Arial,sans-serif; font-size:14px;
                   margin-top:22px; }
  .cover .stag { color:#8E96AC; font-style:italic; font-size:10px; margin-top:6px; }
  .cover .addr { color:#6E7690; font-family:Helvetica,Arial,sans-serif; font-size:8px;
                 margin-top:46px; }
  section { page-break-inside:auto; margin-bottom:22px; }
  h2 { font-family:Helvetica,Arial,sans-serif; text-transform:uppercase; letter-spacing:1px;
       color:#B8873F; font-size:15px; border-bottom:1px solid #B8873F; padding-bottom:5px;
       margin:0 0 14px; }
  .dish { margin:0 0 15px; page-break-inside:avoid; padding-left:16px; position:relative; }
  .dish h3 { font-family:Helvetica,Arial,sans-serif; font-size:11.5px; font-weight:600;
             margin:0 0 3px; }
  .dish h3 svg { margin-left:-16px; margin-right:3px; }
  .price { color:#B8873F; font-weight:700; margin-left:7px; }
  .price sup { color:#8A8272; font-weight:400; font-size:6px; }
  .desc { margin:0; font-family:Helvetica,Arial,sans-serif; font-size:9px; color:#8A8272; }
  .story { margin:5px 0 0; font-style:italic; font-size:9.5px; line-height:1.45;
           border-left:2px solid #B8873F; padding-left:8px; }
  .box { display:inline-block; border:1px solid #B8873F; color:#B8873F; font-style:italic;
         font-size:8.5px; padding:2px 8px; border-radius:3px; margin-top:5px; }
  .wine { font-style:italic; font-size:8.5px; color:#8A8272; margin-top:4px; }
  .alg { page-break-before:always; }
  .alg h2 { margin-bottom:10px; }
  .alg .lista { display:flex; flex-wrap:wrap; gap:4px 18px;
                font-family:Helvetica,Arial,sans-serif; font-size:9px; }
  .alg .lista span { width:45%; }
  .alg p { font-style:italic; font-size:9px; line-height:1.5; margin-top:14px; }
  .foot { margin-top:16px; font-family:Helvetica,Arial,sans-serif; font-size:6.5px;
          color:#9A9280; text-align:right; }
</style></head><body>
<div class="cover">
  ${soleSvg(90)}
  <div class="nome">mensana</div>
  <div class="sub">· m a s s e r i a &nbsp; u r b a n a ·</div>
  <div class="payoff">l'unica masseria in città</div>
  <div class="stag">menù autunno</div>
  <div class="addr">parcheggio privato · Via del Quadrifoglio 12, Roma</div>
</div>
${sezioni}
<div class="alg"><h2>Allergeni</h2><div class="lista">${legenda}</div>
<p>I nostri piatti sono preparati in una cucina dove si lavorano tutti gli allergeni elencati:
non possiamo escludere contaminazioni crociate. Se avete un'allergia o un'intolleranza,
segnalatelo al personale prima di ordinare.</p></div>
<div class="foot">accoglienza e servizi · parcheggio privato interno · pane, taralli e olio EVO della casa · 4 €</div>
</body></html>`;
  };

  const htmlReport = () => {
    const blocchi = CATS.map((cat) => {
      const a = analisi[cat];
      const righe = ordinato(cat).map((d, n) => {
        const b = baseline?.items?.[d.id];
        let conf = "";
        if (b) {
          const dPos = b.pos - (n + 1), dPrz = d.prezzo - b.prezzo;
          const f = [];
          if (dPos > 0) f.push(`In carta è in posizione ${b.pos}: dovrebbe salire di ${dPos}.`);
          else if (dPos < 0) f.push(`In carta è in posizione ${b.pos}: dovrebbe scendere di ${-dPos}.`);
          else f.push("La posizione in carta è già quella giusta.");
          if (Math.abs(dPrz) >= 0.5) f.push(`Prezzo cambiato di ${eur(dPrz)} € (era ${eur(b.prezzo)} €).`);
          conf = `<p class="conf">${esc(f.join(" "))}</p>`;
        }
        return `<div class="dish"><h3>${n + 1}. ${esc(d.nome)}
          <span class="price">${eur(d.prezzo)} €</span></h3>
          ${diagnosi(d, cat).map((p) => `<p class="story">${esc(p)}</p>`).join("")}${conf}</div>`;
      }).join("");
      return `<section><h2>${cat}</h2>
        <p class="desc">${a.totV} venduti · soglia ${(a.soglia * 100).toFixed(1)}% ·
        margine medio ${eur(a.margMedio)} €</p>${righe}</section>`;
    }).join("");

    return `<!doctype html><html lang="it"><head><meta charset="utf-8">
<title>Menu engineering — Mensana</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Georgia, serif; color:#25304C; background:#fff; margin:0; }
  h1 { font-family:Helvetica,Arial,sans-serif; color:#B8873F; font-size:20px;
       border-bottom:1px solid #B8873F; padding-bottom:6px; }
  h2 { font-family:Helvetica,Arial,sans-serif; text-transform:uppercase; color:#B8873F;
       font-size:13px; letter-spacing:1px; border-bottom:1px solid #ddd; padding-bottom:4px;
       margin-top:26px; }
  .dish { margin:0 0 13px; page-break-inside:avoid; }
  .dish h3 { font-family:Helvetica,Arial,sans-serif; font-size:12px; margin:0 0 3px; }
  .price { color:#B8873F; float:right; }
  .story { font-size:10.5px; line-height:1.5; margin:3px 0 0 12px; }
  .conf { font-size:10px; font-style:italic; color:#7a7466; margin:4px 0 0 12px; }
  .desc { font-style:italic; font-size:10px; color:#7a7466; }
</style></head><body>
<h1>Menu engineering — analisi piatto per piatto</h1>
<p class="desc">Mensana · masseria urbana — ${new Date().toLocaleDateString("it-IT")} ·
target food cost ${fcMin}–${fcMax}% · IVA ${iva}%
${baseline ? ` · confronto con il menu in carta del ${baseline.data}` : ""}</p>
${blocchi}</body></html>`;
  };

  const apriStampa = (html, titolo) => setStampa({ html, titolo });

  /* ---------- menu in carta: fotografia di riferimento ---------- */
  const fissaBaseline = () => {
    const items = {};
    CATS.forEach((cat) => {
      ordinato(cat).forEach((d, n) => {
        items[d.id] = { pos: n + 1, prezzo: d.prezzo, nome: d.nome, cat };
      });
    });
    setBaseline({ data: new Date().toLocaleDateString("it-IT"), items });
    setSaved("Menu in carta fissato — da ora il report confronta con questo");
    setTimeout(() => setSaved(""), 4000);
  };

  /* ---------- testo diagnostico per piatto ---------- */
  const diagnosi = (d, cat) => {
    const fcp = d.fc * 100;
    const mix = d.mix != null ? (d.mix * 100).toFixed(1) + "%" : null;
    const t = [];

    if (!mix) {
      t.push(`Venduti non inseriti: senza il mix non si può dire in quale quadrante stia. Il food cost è ${fcp.toFixed(1)}% e il margine ${eur(d.margine)} €.`);
      return t;
    }

    const spiega = {
      Star: `vende sopra la soglia della categoria e lascia più margine della media. È un piatto che regge l'incasso: non va scontato, non va alleggerito nella ricetta, e la sua posizione in carta non ha bisogno di aiuti.`,
      Puzzle: `lascia un margine sopra la media ma vende poco. Quasi mai è un problema di prodotto: è che il cliente non lo sceglie. Si lavora su nome, descrizione, posizione in carta e proposta di sala — non sulla ricetta.`,
      Plowhorse: `vende molto ma lascia meno margine della media. Porta gente, quindi non si tocca alla leggera: è però il piatto su cui un ritocco di prezzo o un upsell pesano meno, perché la domanda è già forte.`,
      Dog: `vende poco e lascia poco. È il candidato all'uscita, a meno che non copra un caso d'uso obbligato — un'opzione vegetariana, un senza glutine, un piatto per bambini.`,
    }[d.quad];

    t.push(`Mix ${mix}, food cost ${fcp.toFixed(1)}%, margine ${eur(d.margine)} €. È un ${d.quad}: ${spiega}`);

    if (fcp > fcMax) {
      t.push(`Il food cost è sopra il target (${fcMin}–${fcMax}%). A questo costo il prezzo coerente sarebbe ${eur(d.suggerito)} €, cioè ${eur(d.suggerito - d.prezzo)} € in più. Le alternative sono alzare il prezzo, rivedere la grammatura o cambiare fornitore su un ingrediente.`);
    } else if (fcp < fcMin) {
      t.push(`Il food cost è sotto il target: il piatto è prezzato più caro di quanto il costo richieda. Non è un errore — se vende bene è un ottimo affare — ma se il mix è basso, il prezzo è il primo sospettato.`);
    }

    if (d.quad === "Puzzle" && d.margine > 0) {
      const soglia = analisi[cat].soglia;
      const target = Math.round(soglia * analisi[cat].totV);
      const recuperabile = (target - d.venduti) * d.margine;
      if (recuperabile > 0) {
        t.push(`Se arrivasse solo alla soglia di popolarità (${target} pezzi), porterebbe circa ${eur(recuperabile)} € di margine in più nel periodo, a parità di food cost.`);
      }
    }
    return t;
  };

  /* ---------- report PDF ---------- */
  const generaReport = async () => {
   try {
    if (!window.jspdf) {
      await new Promise((res, rej) => {
        const sc = document.createElement("script");
        sc.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
      });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 20, CW = W - 2 * M;
    const NAVY = [37, 48, 76], GOLD = [184, 135, 63], SOFT = [120, 114, 102];
    let y = 24;

    const nl = (h = 5) => { y += h; if (y > 275) { doc.addPage(); y = 24; } };
    const testo = (s, size = 9, font = "normal", col = NAVY, ind = 0) => {
      doc.setFont("helvetica", font); doc.setFontSize(size); doc.setTextColor(...col);
      doc.splitTextToSize(s, CW - ind).forEach((l) => {
        if (y > 275) { doc.addPage(); y = 24; }
        doc.text(l, M + ind, y); y += size * 0.48 + 1.6;
      });
    };

    doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
    doc.text("Menu engineering — analisi piatto per piatto", M, y); nl(7);
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.3); doc.line(M, y - 3, W - M, y - 3);
    testo(`Mensana · masseria urbana — ${new Date().toLocaleDateString("it-IT")}`, 8.5, "normal", SOFT);
    testo(`Target food cost ${fcMin}–${fcMax}% · IVA ${iva}%` +
      (baseline ? ` · confronto con il menu in carta del ${baseline.data}` : " · nessun menu di riferimento fissato"),
      8.5, "normal", SOFT);
    nl(4);

    testo("La soglia di popolarità è il 70% del mix medio della categoria. La redditività si misura sul margine in euro, non sul food cost in percentuale: un piatto con food cost alto può lasciare più soldi in cassa di uno con food cost basso.", 8.5, "italic", SOFT);
    nl(4);

    CATS.forEach((cat) => {
      const lista = ordinato(cat);
      if (!lista.length) return;
      if (y > 250) { doc.addPage(); y = 24; }
      nl(4);
      doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text(cat.toUpperCase(), M, y); nl(2);
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.2); doc.line(M, y - 1, W - M, y - 1); nl(4);

      const a = analisi[cat];
      testo(`${a.totV} venduti nel periodo · soglia di popolarità ${(a.soglia * 100).toFixed(1)}% · margine medio ponderato ${eur(a.margMedio)} €`, 8, "italic", SOFT);
      nl(3);

      lista.forEach((d, n) => {
        if (y > 258) { doc.addPage(); y = 24; }
        const b = baseline?.items?.[d.id];
        doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text(`${n + 1}. ${d.nome}`, M, y);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GOLD);
        doc.text(`${eur(d.prezzo)} €`, W - M, y, { align: "right" });
        nl(5);

        diagnosi(d, cat).forEach((p) => testo(p, 8.6, "normal", NAVY, 4));

        if (b) {
          const dPos = b.pos - (n + 1);
          const dPrz = d.prezzo - b.prezzo;
          const frasi = [];
          if (dPos > 0) frasi.push(`In carta oggi è in posizione ${b.pos}: dovrebbe salire di ${dPos} ${dPos === 1 ? "posto" : "posti"}.`);
          else if (dPos < 0) frasi.push(`In carta oggi è in posizione ${b.pos}: dovrebbe scendere di ${-dPos} ${dPos === -1 ? "posto" : "posti"}.`);
          else frasi.push(`La posizione in carta è già quella giusta.`);
          if (Math.abs(dPrz) >= 0.5) frasi.push(`Il prezzo è cambiato di ${eur(dPrz)} € rispetto al menu in carta (${eur(b.prezzo)} €).`);
          if (b.nome !== d.nome) frasi.push(`In carta si chiamava «${b.nome}».`);
          testo(frasi.join(" "), 8.4, "italic", SOFT, 4);
        }
        nl(3);
      });
    });

    /* sintesi finale */
    doc.addPage(); y = 24;
    doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("Le tre cose da fare per prime", M, y); nl(8);

    const tutti = CATS.flatMap((c) => analisi[c].list.map((d) => ({ ...d, cat: c })))
      .filter((d) => d.mix != null);
    const puzzles = tutti.filter((d) => d.quad === "Puzzle")
      .map((d) => {
        const a = analisi[d.cat];
        const target = Math.round(a.soglia * a.totV);
        return { ...d, recuperabile: Math.max(0, (target - d.venduti) * d.margine) };
      })
      .sort((x, z) => z.recuperabile - x.recuperabile).slice(0, 3);

    if (puzzles.length) {
      testo("I Puzzle con il margine non raccolto più alto. Sono piatti che rendono bene ma che il cliente non sceglie: si recuperano con visibilità in carta e proposta di sala, senza toccare food cost né fornitori.", 9, "normal", NAVY);
      nl(3);
      puzzles.forEach((d, i) => {
        testo(`${i + 1}. ${d.nome} (${d.cat}) — margine ${eur(d.margine)} € a piatto, mix ${(d.mix * 100).toFixed(1)}%. Recuperabili circa ${eur(d.recuperabile)} € portandolo alla soglia.`, 9, "normal", NAVY, 4);
      });
    } else {
      testo("Nessun Puzzle rilevato, oppure i venduti non sono ancora stati inseriti.", 9, "italic", SOFT);
    }

    nl(6);
    const fuori = tutti.filter((d) => d.fc * 100 > fcMax).sort((x, z) => z.fc - x.fc).slice(0, 5);
    if (fuori.length) {
      doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text("Piatti fuori target di food cost", M, y); nl(6);
      fuori.forEach((d) => testo(`${d.nome} — ${(d.fc * 100).toFixed(1)}%, prezzo coerente ${eur(d.suggerito)} € contro gli attuali ${eur(d.prezzo)} €.`, 9, "normal", NAVY, 4));
    }

    pubblica(doc.output("blob"), "mensana-report-menu-engineering.pdf",
      doc.getNumberOfPages() + " pagine");
   } catch (err) {
     setSaved("Errore nel report: " + (err?.message || err));
   }
  };

  /* ---------- PDF ---------- */
  const generaPdf = async () => {
   try {
    if (!window.jspdf) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: [148, 210] });
    const W = 148, H = 210, M = 21, MR = 15, GUT = 11, CW = W - M - MR;
    const NAVY = [37, 48, 76], GOLD = [184, 135, 63], CREAM = [248, 244, 234],
          SOFT = [138, 130, 114], FOOT = [154, 146, 128];

    const sole = (cx, cy, r) => {
      doc.setFillColor(...GOLD);
      doc.circle(cx, cy, r * 0.45, "F");
      for (let i = 0; i < 12; i++) {
        const a = (2 * Math.PI * i) / 12, a1 = a + 0.13, a2 = a - 0.13;
        doc.triangle(cx + r * 0.42 * Math.cos(a1), cy + r * 0.42 * Math.sin(a1),
                     cx + r * 0.42 * Math.cos(a2), cy + r * 0.42 * Math.sin(a2),
                     cx + r * Math.cos(a), cy + r * Math.sin(a), "F");
      }
    };
    const footer = () => {
      doc.setTextColor(...FOOT); doc.setFont("helvetica", "normal"); doc.setFontSize(5.6);
      doc.text("accoglienza e servizi · parcheggio privato interno · pane, taralli e olio EVO della casa · 4 €",
        W - MR, H - 8, { align: "right" });
    };
    const meandro = (x, y, w) => {
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.2);
      const st = 1.6, n = Math.floor(w / (st * 4));
      doc.line(x, y, x + n * st * 4, y);
      for (let k = 0; k < n; k++) {
        const o = x + k * st * 4;
        doc.lines([[0, -st * 2], [st * 3, 0], [0, st * 1.4], [-st * 2, 0], [0, -st * 0.7]], o, y);
      }
    };

    /* --- copertina --- */
    doc.setFillColor(27, 35, 56); doc.rect(0, 0, W, H, "F");
    sole(W / 2, 62, 22);
    doc.setTextColor(...CREAM); doc.setFont("helvetica", "bold"); doc.setFontSize(30);
    doc.text("mensana", W / 2, 128, { align: "center" });
    doc.setTextColor(217, 174, 107); doc.setFont("times", "italic"); doc.setFontSize(10.5);
    doc.text("·  m a s s e r i a   u r b a n a  ·", W / 2, 135, { align: "center" });
    doc.setTextColor(...GOLD); doc.setFont("helvetica", "normal"); doc.setFontSize(12.5);
    doc.text("l'unica masseria in città", W / 2, 152, { align: "center" });
    doc.setTextColor(142, 150, 172); doc.setFont("times", "italic"); doc.setFontSize(8.8);
    doc.text("menù autunno", W / 2, 159, { align: "center" });
    meandro(W / 2 - 32, 190, 64);
    doc.setTextColor(110, 118, 144); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text("parcheggio privato · Via del Quadrifoglio 12, Roma", W / 2, 197, { align: "center" });

    /* --- pagine categorie --- */
    const titolo = { antipasti: "ANTIPASTI", primi: "PRIMI", secondi: "SECONDI",
                     contorni: "CONTORNI", dolci: "DOLCI" };
    CATS.forEach((cat) => {
      doc.addPage(); doc.setFillColor(...CREAM); doc.rect(0, 0, W, H, "F");
      let y = 26;
      doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text(titolo[cat], M, y);
      doc.setDrawColor(...GOLD); doc.setLineWidth(0.2); doc.line(M, y + 2, W - MR, y + 2);
      y += 10;

      ordinato(cat).forEach((d) => {
        if (y > 178) return;
        if (d.sole) sole(GUT, y - 1.2, 1.7);
        doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9.6);
        doc.text(d.nome, M, y);
        const nw = doc.getTextWidth(d.nome);
        doc.setTextColor(...GOLD); doc.setFontSize(10.4);
        doc.text(String(d.prezzo).replace(".", ","), M + nw + 3.6, y);
        if (d.algList && d.algList.length) {
          const pw = doc.getTextWidth(String(d.prezzo));
          doc.setTextColor(...SOFT); doc.setFont("helvetica", "normal"); doc.setFontSize(4.8);
          doc.text(d.algList.join(","), M + nw + 3.6 + pw + 1.2, y - 1.6);
        }
        y += 4.2;
        if (d.desc) {
          doc.setTextColor(...SOFT); doc.setFont("helvetica", "normal"); doc.setFontSize(7.4);
          doc.splitTextToSize(d.desc, CW - 4).forEach((l) => { doc.text(l, M, y); y += 3.5; });
        }
        if (d.story) {
          const ls = doc.splitTextToSize(d.story, CW - 10);
          const top = y - 1;
          doc.setTextColor(...NAVY); doc.setFont("times", "italic"); doc.setFontSize(7.8);
          ls.forEach((l) => { doc.text(l, M + 5, y + 1.5); y += 3.9; });
          doc.setDrawColor(...GOLD); doc.setLineWidth(0.45);
          doc.line(M + 1.5, top, M + 1.5, y - 2);
        }
        if (d.upsell) {
          const [t, p] = d.upsell.split("|");
          doc.setDrawColor(...GOLD); doc.setLineWidth(0.2);
          doc.roundedRect(M, y, 52, 4.6, 0.8, 0.8);
          doc.setTextColor(...GOLD); doc.setFont("times", "italic"); doc.setFontSize(6.8);
          doc.text(t, M + 1.6, y + 3.2);
          doc.setFont("helvetica", "bold"); doc.setFontSize(7.2);
          doc.text(p, M + 50.4, y + 3.2, { align: "right" });
          y += 7;
        }
        if (d.wine) {
          doc.setTextColor(...SOFT); doc.setFont("times", "italic"); doc.setFontSize(6.8);
          doc.text("in abbinamento · " + d.wine, M, y + 1.5);
          y += 4.5;
        }
        y += 4.5;
      });
      footer();
    });

    /* --- scheda tecnica interna --- */
    doc.addPage(); doc.setFillColor(...CREAM); doc.rect(0, 0, W, H, "F");
    let y = 26;
    doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("SCHEDA COSTI — uso interno", M, y);
    doc.setDrawColor(...GOLD); doc.line(M, y + 2, W - MR, y + 2); y += 8;
    doc.setFontSize(6.4); doc.setFont("helvetica", "normal"); doc.setTextColor(...SOFT);
    doc.text(`target food cost ${fcMin}–${fcMax}%  ·  IVA ${iva}%`, M, y); y += 6;

    CATS.forEach((cat) => {
      if (y > 185) { doc.addPage(); doc.setFillColor(...CREAM); doc.rect(0, 0, W, H, "F"); y = 24; }
      doc.setTextColor(...GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(cat.toUpperCase(), M, y); y += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(5.8); doc.setTextColor(...SOFT);
      doc.text("piatto", M, y); doc.text("costo", M + 52, y);
      doc.text("fc%", M + 66, y); doc.text("marg.", M + 78, y);
      doc.text("sugg.", M + 92, y); doc.text("quadr.", M + 105, y); y += 3;
      analisi[cat].list.forEach((d) => {
        if (y > 195) { doc.addPage(); doc.setFillColor(...CREAM); doc.rect(0, 0, W, H, "F"); y = 24; }
        doc.setTextColor(...NAVY); doc.setFontSize(6);
        doc.text(doc.splitTextToSize(d.nome, 50)[0], M, y);
        doc.text(eur(d.costo), M + 52, y);
        const fcp = d.fc * 100;
        if (fcp > fcMax) doc.setTextColor(170, 60, 40);
        else if (fcp < fcMin) doc.setTextColor(80, 120, 70);
        doc.text(fcp.toFixed(1), M + 66, y);
        doc.setTextColor(...NAVY);
        doc.text(eur(d.margine), M + 78, y);
        doc.text(eur(d.suggerito), M + 92, y);
        doc.text(d.quad, M + 105, y);
        y += 3.3;
      });
      y += 4;
    });

    pubblica(doc.output("blob"), "mensana-menu-ottobre.pdf",
      doc.getNumberOfPages() + " pagine");
   } catch (err) {
     setSaved("Errore nel menù: " + (err?.message || err));
   }
  };

  if (loading) {
    return <div className="min-h-screen bg-stone-100 flex items-center justify-center">
      <p className="text-stone-500 text-sm">Apertura del quaderno…</p></div>;
  }

  const badge = (q) => {
    const m = { Star: "bg-amber-100 text-amber-900 border-amber-300",
                Puzzle: "bg-sky-100 text-sky-900 border-sky-300",
                Plowhorse: "bg-stone-200 text-stone-700 border-stone-300",
                Dog: "bg-rose-100 text-rose-900 border-rose-300" };
    return m[q] || "bg-stone-100 text-stone-400 border-stone-200";
  };

  return (
    <div className="min-h-screen" style={{ background: "#F3EFE6" }}>
      {/* intestazione */}
      <div style={{ background: "#25304C" }} className="px-5 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl tracking-wide" style={{ color: "#F8F4EA", fontWeight: 700 }}>
              Quaderno dei costi
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#8E96AC" }}>
              Mensana · masseria urbana — food cost, prezzi, posizione in carta
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={save} className="px-3 py-1.5 text-xs rounded border"
              style={{ borderColor: "#B8873F", color: "#D9AE6B" }}>Salva</button>
            <button onClick={ricarica} className="px-3 py-1.5 text-xs rounded border"
              style={{ borderColor: "#4A5570", color: "#B9C0D2" }}>Ricarica</button>
            <button onClick={exportJson} className="px-3 py-1.5 text-xs rounded border"
              style={{ borderColor: "#4A5570", color: "#B9C0D2" }}>Esporta dati</button>
            <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 text-xs rounded border"
              style={{ borderColor: "#4A5570", color: "#B9C0D2" }}>Importa</button>
            <input ref={fileRef} type="file" accept=".json" onChange={importJson} className="hidden" />
            {tab === "costi" ? (
              <button onClick={() => apriStampa(htmlMenu(), "Menù")}
                className="px-3 py-1.5 text-xs rounded font-medium"
                style={{ background: "#B8873F", color: "#1B2338" }}>Genera il menù</button>
            ) : (
              <button onClick={() => apriStampa(htmlReport(), "Report")}
                className="px-3 py-1.5 text-xs rounded font-medium"
                style={{ background: "#B8873F", color: "#1B2338" }}>Genera il report</button>
            )}
          </div>
        </div>
        {saved && <p className="max-w-5xl mx-auto text-xs mt-2" style={{ color: saved.startsWith("Errore") ? "#F0A5A5" : "#D9AE6B" }}>{saved}</p>}
      </div>

      {stampa && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#1B2338" }}>
          <div className="px-4 py-3 flex items-center justify-between gap-3"
            style={{ background: "#25304C" }}>
            <p className="text-sm" style={{ color: "#F8F4EA" }}>{stampa.titolo}</p>
            <div className="flex gap-2">
              <button onClick={copiaDati} className="px-3 py-1.5 text-xs rounded font-medium"
                style={{ background: "#B8873F", color: "#1B2338" }}>Copia i dati</button>
              <button onClick={() => setStampa(null)}
                className="px-3 py-1.5 text-xs rounded border"
                style={{ borderColor: "#4A5570", color: "#B9C0D2" }}>Chiudi</button>
            </div>
          </div>
          <iframe id="telaio-stampa" title="anteprima" srcDoc={stampa.html}
            className="flex-1 w-full" style={{ border: "none", background: "#fff" }} />
          <p className="px-4 py-2 text-xs" style={{ color: "#8E96AC" }}>
            Controlla che sia tutto giusto, poi premi «Copia i dati» e incollali nella chat con
            Claude: da lì arriva il PDF definitivo, con i font e le illustrazioni del brand.
          </p>
        </div>
      )}

      {vista && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#1B2338" }}>
          <div className="flex items-center justify-between px-4 py-3 gap-3"
            style={{ background: "#25304C" }}>
            <div className="min-w-0">
              <p className="text-sm truncate" style={{ color: "#F8F4EA" }}>{vista.nome}</p>
              <p className="text-xs" style={{ color: "#8E96AC" }}>{vista.extra}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={vista.url} target="_blank" rel="noreferrer"
                className="px-3 py-1.5 text-xs rounded font-medium"
                style={{ background: "#B8873F", color: "#1B2338" }}>Apri a schermo intero</a>
              <button onClick={() => setVista(null)}
                className="px-3 py-1.5 text-xs rounded border"
                style={{ borderColor: "#4A5570", color: "#B9C0D2" }}>Chiudi</button>
            </div>
          </div>
          <iframe src={vista.url} title={vista.nome} className="flex-1 w-full"
            style={{ border: "none", background: "#F8F4EA" }} />
          <p className="px-4 py-2 text-xs" style={{ color: "#8E96AC" }}>
            Se il documento non compare qui sotto, premi «Apri a schermo intero»: da lì il pulsante di
            condivisione di iOS permette di salvarlo nei File o di mandarlo su WhatsApp.
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div style={{ background: "#B8873F" }} className="px-5 py-2">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-xs" style={{ color: "#1B2338" }}>Pronti da aprire:</span>
            {files.map((f, i) => (
              <button key={i} onClick={() => setVista(f)}
                className="text-xs underline font-medium" style={{ color: "#1B2338" }}>
                {f.nome} <span className="opacity-70">({f.extra ? f.extra + " · " : ""}{f.ora})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* parametri */}
      <div className="max-w-5xl mx-auto px-5 py-4">
        <div className="bg-white border border-stone-300 rounded p-4 flex flex-wrap gap-6 items-end">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Food cost target</label>
            <div className="flex items-center gap-2">
              <input type="number" value={fcMin} onChange={(e) => setFcMin(+e.target.value)}
                className="w-16 border border-stone-300 rounded px-2 py-1 text-sm" />
              <span className="text-stone-400 text-sm">→</span>
              <input type="number" value={fcMax} onChange={(e) => setFcMax(+e.target.value)}
                className="w-16 border border-stone-300 rounded px-2 py-1 text-sm" />
              <span className="text-stone-500 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">IVA sui prezzi di vendita</label>
            <input type="number" value={iva} onChange={(e) => setIva(+e.target.value)}
              className="w-20 border border-stone-300 rounded px-2 py-1 text-sm" />
          </div>
          <div className="flex gap-1">
            {["costi", "engineering"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={"px-3 py-1.5 text-xs rounded border " +
                  (tab === t ? "bg-stone-800 text-white border-stone-800" : "border-stone-300 text-stone-600")}>
                {t === "costi" ? "Schede costo" : "Menu engineering"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- SCHEDE COSTO ---------- */}
      {tab === "costi" && (
        <div className="max-w-5xl mx-auto px-5 pb-16 space-y-8">
          {CATS.map((cat) => (
            <section key={cat}>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-sm uppercase tracking-widest" style={{ color: "#B8873F", fontWeight: 700 }}>
                  {cat}
                </h2>
                <button onClick={() => addDish(cat)} className="text-xs text-stone-500 underline">
                  aggiungi piatto
                </button>
              </div>

              <div className="space-y-2">
                {analisi[cat].list.map((d) => {
                  const fcp = d.fc * 100;
                  const stato = fcp > fcMax ? "alto" : fcp < fcMin ? "basso" : "ok";
                  const col = stato === "alto" ? "#B0392A" : stato === "basso" ? "#4F7A4A" : "#B8873F";
                  return (
                    <div key={d.id} className="bg-white border border-stone-300 rounded">
                      <div className="px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 cursor-pointer"
                        onClick={() => setOpen(open === d.id ? null : d.id)}>
                        <span className="text-sm flex-1 min-w-40" style={{ color: "#25304C", fontWeight: 600 }}>
                          {d.sole && <span style={{ color: "#B8873F" }}>✦ </span>}{d.nome}
                        </span>
                        <span className="text-xs text-stone-500 tabular-nums">costo {eur(d.costo)} €</span>
                        <span className="text-xs tabular-nums font-semibold" style={{ color: col }}>
                          {fcp.toFixed(1)}%
                        </span>
                        <span className="text-xs text-stone-500 tabular-nums">margine {eur(d.margine)} €</span>
                        <span className="text-xs text-stone-400 tabular-nums">
                          suggerito {eur(d.suggerito)} €
                        </span>
                        <input type="number" step="0.5" value={d.prezzo} onClick={(e) => e.stopPropagation()}
                          onChange={(e) => upd(d.id, { prezzo: +e.target.value })}
                          className="w-20 border border-stone-300 rounded px-2 py-1 text-sm tabular-nums" />
                      </div>

                      {open === d.id && (
                        <div className="border-t border-stone-200 px-3 py-3 bg-stone-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <label className="text-xs text-stone-500">Nome
                              <input value={d.nome} onChange={(e) => upd(d.id, { nome: e.target.value })}
                                className="mt-1 w-full border border-stone-300 rounded px-2 py-1 text-sm text-stone-800" />
                            </label>
                            <label className="text-xs text-stone-500">Descrizione
                              <input value={d.desc} onChange={(e) => upd(d.id, { desc: e.target.value })}
                                className="mt-1 w-full border border-stone-300 rounded px-2 py-1 text-sm text-stone-800" />
                            </label>
                            <label className="text-xs text-stone-500 md:col-span-2">Racconto (facoltativo)
                              <textarea value={d.story} rows={2}
                                onChange={(e) => upd(d.id, { story: e.target.value })}
                                className="mt-1 w-full border border-stone-300 rounded px-2 py-1 text-sm text-stone-800" />
                            </label>
                            <label className="text-xs text-stone-500">Abbinamento vino
                              <input value={d.wine} onChange={(e) => upd(d.id, { wine: e.target.value })}
                                className="mt-1 w-full border border-stone-300 rounded px-2 py-1 text-sm text-stone-800" />
                            </label>
                            <label className="text-xs text-stone-500">Upsell — testo|prezzo
                              <input value={d.upsell} onChange={(e) => upd(d.id, { upsell: e.target.value })}
                                placeholder="provalo con la cicoria|10"
                                className="mt-1 w-full border border-stone-300 rounded px-2 py-1 text-sm text-stone-800" />
                            </label>
                            <label className="text-xs text-stone-500 flex items-center gap-2 mt-5">
                              <input type="checkbox" checked={d.sole}
                                onChange={(e) => upd(d.id, { sole: e.target.checked })} />
                              «la vera Puglia» (sole)
                            </label>
                          </div>

                          {/* ingredienti */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-stone-500 text-left">
                                  <th className="py-1 pr-2 font-normal">ingrediente</th>
                                  <th className="py-1 px-1 font-normal">nel piatto</th>
                                  <th className="py-1 px-1 font-normal">scarto %</th>
                                  <th className="py-1 px-1 font-normal">calo cottura %</th>
                                  <th className="py-1 px-1 font-normal">€/kg</th>
                                  <th className="py-1 px-1 font-normal">lordo</th>
                                  <th className="py-1 px-1 font-normal text-right">costo</th>
                                  <th className="py-1 px-1 font-normal">allerg.</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {d.ings.map((i) => (
                                  <tr key={i.id} className="border-t border-stone-200">
                                    <td className="py-1 pr-2">
                                      <input value={i.nome} onChange={(e) => updIng(d.id, i.id, { nome: e.target.value })}
                                        className="w-full border border-stone-200 rounded px-1 py-0.5" />
                                    </td>
                                    <td className="py-1 px-1">
                                      <div className="flex gap-1">
                                        <input type="number" value={i.servito}
                                          onChange={(e) => updIng(d.id, i.id, { servito: +e.target.value })}
                                          className="w-14 border border-stone-200 rounded px-1 py-0.5 tabular-nums" />
                                        <select value={i.unit}
                                          onChange={(e) => updIng(d.id, i.id, { unit: e.target.value })}
                                          className="border border-stone-200 rounded px-1 py-0.5">
                                          <option value="g">g</option><option value="ml">ml</option>
                                          <option value="pz">pz</option>
                                        </select>
                                      </div>
                                    </td>
                                    <td className="py-1 px-1">
                                      <input type="number" value={i.scarto} disabled={i.unit === "pz"}
                                        onChange={(e) => updIng(d.id, i.id, { scarto: +e.target.value })}
                                        className="w-12 border border-stone-200 rounded px-1 py-0.5 tabular-nums disabled:bg-stone-100" />
                                    </td>
                                    <td className="py-1 px-1">
                                      <input type="number" value={i.calo} disabled={i.unit === "pz"}
                                        onChange={(e) => updIng(d.id, i.id, { calo: +e.target.value })}
                                        className="w-12 border border-stone-200 rounded px-1 py-0.5 tabular-nums disabled:bg-stone-100" />
                                    </td>
                                    <td className="py-1 px-1">
                                      <input type="number" step="0.1" value={i.costoKg}
                                        onChange={(e) => updIng(d.id, i.id, { costoKg: +e.target.value })}
                                        className="w-16 border border-stone-200 rounded px-1 py-0.5 tabular-nums" />
                                    </td>
                                    <td className="py-1 px-1 text-stone-500 tabular-nums">
                                      {i.unit === "pz" ? "—" : Math.round(lordoOf(i)) + " g"}
                                    </td>
                                    <td className="py-1 px-1 text-right tabular-nums" style={{ color: "#25304C" }}>
                                      {eur(costoOf(i))} €
                                    </td>
                                    <td className="py-1 px-1">
                                      <details className="relative">
                                        <summary className="cursor-pointer list-none text-stone-500 tabular-nums whitespace-nowrap">
                                          {(i.alg || []).length ? (i.alg || []).join(",") : "—"}
                                        </summary>
                                        <div className="absolute right-0 z-10 mt-1 w-52 bg-white border border-stone-300 rounded shadow-lg p-2 max-h-56 overflow-y-auto">
                                          {ALLERGENI.map((a, n) => (
                                            <label key={n} className="flex items-center gap-2 py-0.5">
                                              <input type="checkbox"
                                                checked={(i.alg || []).includes(n + 1)}
                                                onChange={(e) => {
                                                  const cur = new Set(i.alg || []);
                                                  e.target.checked ? cur.add(n + 1) : cur.delete(n + 1);
                                                  updIng(d.id, i.id, { alg: [...cur].sort((x, z) => x - z) });
                                                }} />
                                              <span className="text-stone-700">{n + 1}. {a}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </details>
                                    </td>
                                    <td className="py-1 pl-1">
                                      <button onClick={() => delIng(d.id, i.id)}
                                        className="text-stone-400 hover:text-rose-600">×</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <button onClick={() => addIng(d.id)} className="text-xs text-stone-600 underline">
                              aggiungi ingrediente
                            </button>
                            <button onClick={() => delDish(d.id)} className="text-xs text-rose-600 underline">
                              elimina piatto
                            </button>
                          </div>

                          <div className="mt-3 pt-3 border-t border-stone-200">
                            <p className="text-xs text-stone-500 mb-1">
                              Allergeni del piatto, calcolati dagli ingredienti:
                            </p>
                            <p className="text-xs" style={{ color: "#25304C" }}>
                              {d.algList.length
                                ? d.algList.map((n) => `${n}. ${ALLERGENI[n - 1]}`).join("  ·  ")
                                : "nessuno rilevato — verifica gli ingredienti"}
                            </p>
                          </div>

                          <p className="text-xs text-stone-500 mt-3 leading-relaxed">
                            Il calo di cottura negativo indica un aumento di peso: la pasta secca, i legumi e la
                            fregola assorbono acqua. Per la pasta fresca usa −60, per i legumi secchi −110 circa.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ---------- MENU ENGINEERING ---------- */}
      {tab === "engineering" && (
        <div className="max-w-5xl mx-auto px-5 pb-16 space-y-8">
          <div className="bg-white border border-stone-300 rounded p-4 text-xs text-stone-600 leading-relaxed">
            I venduti si inseriscono qui, non nelle schede costo: la cucina lavora sui costi, la sala e la
            direzione sui volumi. La classificazione compare appena i venduti sono inseriti. La soglia di
            popolarità è il 70% del mix medio della categoria; la redditività si misura sul margine in euro,
            non sul food cost in percentuale.
          </div>

          {CATS.map((cat) => (
            <section key={cat}>
              <div className="flex items-baseline gap-3 mb-2">
                <h2 className="text-sm uppercase tracking-widest" style={{ color: "#B8873F", fontWeight: 700 }}>
                  {cat}
                </h2>
                <span className="text-xs text-stone-500">
                  {analisi[cat].totV > 0
                    ? `${analisi[cat].totV} venduti · soglia ${(analisi[cat].soglia * 100).toFixed(1)}% · margine medio ${eur(analisi[cat].margMedio)} €`
                    : "venduti non inseriti"}
                </span>
              </div>
              <div className="bg-white border border-stone-300 rounded overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-stone-500 text-left border-b border-stone-200">
                      <th className="py-2 px-3 font-normal">ordine consigliato</th>
                      <th className="py-2 px-2 font-normal text-right">prezzo</th>
                      <th className="py-2 px-2 font-normal text-right">costo</th>
                      <th className="py-2 px-2 font-normal text-right">fc%</th>
                      <th className="py-2 px-2 font-normal text-right">margine</th>
                      <th className="py-2 px-2 font-normal text-right">venduti</th>
                      <th className="py-2 px-2 font-normal text-right">mix</th>
                      <th className="py-2 px-3 font-normal">quadrante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordinato(cat).map((d, n) => (
                      <tr key={d.id} className="border-b border-stone-100">
                        <td className="py-2 px-3">
                          <span className="text-stone-400 tabular-nums mr-2">{n + 1}</span>
                          {d.sole && <span style={{ color: "#B8873F" }}>✦ </span>}
                          <span style={{ color: "#25304C" }}>{d.nome}</span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">{eur(d.prezzo)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-stone-500">{eur(d.costo)}</td>
                        <td className="py-2 px-2 text-right tabular-nums font-semibold"
                          style={{ color: d.fc * 100 > fcMax ? "#B0392A" : d.fc * 100 < fcMin ? "#4F7A4A" : "#8A8272" }}>
                          {(d.fc * 100).toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">{eur(d.margine)}</td>
                        <td className="py-2 px-2 text-right">
                          <input type="number" value={d.venduti}
                            onChange={(e) => upd(d.id, { venduti: +e.target.value })}
                            className="w-16 border border-stone-300 rounded px-1 py-0.5 text-xs tabular-nums text-right" />
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-stone-500">
                          {d.mix != null ? (d.mix * 100).toFixed(1) + "%" : "—"}
                        </td>
                        <td className="py-2 px-3">
                          <span className={"px-2 py-0.5 rounded border text-xs " + badge(d.quad)}>{d.quad}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <div className="bg-white border border-stone-300 rounded p-4">
            <h3 className="text-sm mb-2" style={{ color: "#B8873F", fontWeight: 700 }}>Forbice dei prezzi</h3>
            <div className="space-y-1">
              {CATS.map((cat) => {
                const ps = analisi[cat].list.map((d) => d.prezzo).filter((p) => p > 0);
                if (!ps.length) return null;
                const min = Math.min(...ps), max = Math.max(...ps);
                const amp = ((max - min) / min) * 100;
                return (
                  <div key={cat} className="flex items-center gap-3 text-xs">
                    <span className="w-24 text-stone-600">{cat}</span>
                    <span className="tabular-nums text-stone-800">{eur(min)} → {eur(max)} €</span>
                    <span className="tabular-nums text-stone-400">+{amp.toFixed(0)}%</span>
                    <span className={amp < 30 ? "text-rose-700" : "text-stone-400"}>
                      {amp < 30 ? "forbice stretta: il prezzo non guida la scelta" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
