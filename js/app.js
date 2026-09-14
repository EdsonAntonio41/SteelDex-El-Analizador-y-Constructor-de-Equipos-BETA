/* js/app.js - Pokémon Team Builder & Analyzer Logic */

// lucide is loaded from a CDN and can be unavailable offline or blocked.
// Never let a missing icon library take down the whole app.
if (typeof window.lucide === "undefined") {
  window.lucide = { createIcons: function () {} };
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsStringForAttr(value) {
  return String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\x3C")
    .replace(/>/g, "\\x3E");
}

function safeHttpUrl(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/[\u0000-\u001f"'<>`\\]/g, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}

// Global App State
const BOX_SIZE = 30;
const MAX_BOXES = 1;
let pokemonBoxes = [new Array(BOX_SIZE).fill(null)];
let activeTeam = [];
let currentSlotIndex = -1;
let currentSearchTarget = 'team';
let dragState = null; // { source: 'team' | 'box', index: Number }
let activeTab = "builder";
let activeAnalysisSlide = 0; // 0: Eficaz, 1: Inmunes y Resistencias, 2: Débil
let activeBuildeoTabSlide = 0; // 0: Movimientos, 1: Habilidades/Stats, 2: Objetos
let buildeoSlides = [0, 0, 0, 0, 0, 0]; // Active slide for each slot in the buildeo tab

// --- CURRENT TEAMS SOURCE (meta local / feed automático) ---
const META_TEAMS_URL = "meta/teams.json";
const META_TEAMS_CACHE_KEY = "steeldex_meta_teams_v1";
const META_TEAMS_TTL = 12 * 60 * 60 * 1000; // 12 horas
let ACTIVE_PRESET_TEAMS = (typeof PRESET_TEAMS !== "undefined") ? PRESET_TEAMS : [];
let metaTeamsState = { inited: false, mode: "local", teams: null, updatedAt: null, fetchedAt: null };

// --- DYNAMIC DATA INJECTION ---
if (typeof POKEDEX !== 'undefined') {
  POKEDEX["girafarig"] = {
    "num": 203,
    "name": "Girafarig",
    "types": ["Normal", "Psychic"],
    "baseStats": {"hp": 70, "atk": 80, "def": 65, "spa": 90, "spd": 65, "spe": 85},
    "abilities": {"0": "Inner Focus", "1": "Early Bird", "H": "Sap Sipper"},
    "heightm": 1.5,
    "weightkg": 41.5,
    "color": "Yellow",
    "eggGroups": ["Field"],
    "tier": "ZU"
  };

  POKEDEX["farigiraf"] = {
    "num": 981,
    "name": "Farigiraf",
    "types": ["Normal", "Psychic"],
    "baseStats": {"hp": 120, "atk": 90, "def": 70, "spa": 110, "spd": 70, "spe": 60},
    "abilities": {"0": "Cud Chew", "1": "Armor Tail", "H": "Sap Sipper"},
    "heightm": 3.2,
    "weightkg": 160,
    "color": "Yellow",
    "prevo": "Girafarig",
    "eggGroups": ["Field"],
    "tier": "ZU"
  };

  POKEDEX["rillaboom"] = {
    "num": 812,
    "name": "Rillaboom",
    "types": ["Grass"],
    "genderRatio": {"M": 0.875, "F": 0.125},
    "baseStats": {"hp": 100, "atk": 125, "def": 90, "spa": 60, "spd": 70, "spe": 85},
    "abilities": {"0": "Overgrow", "H": "Grassy Surge"},
    "heightm": 2.1,
    "weightkg": 90,
    "color": "Green",
    "prevo": "Thwackey",
    "eggGroups": ["Grass", "Field"],
    "tier": "OU"
  };

  POKEDEX["annihilape"] = {
    "num": 979,
    "name": "Annihilape",
    "types": ["Fighting"],
    "genderRatio": {"M": 0.5, "F": 0.5},
    "baseStats": {"hp": 110, "atk": 115, "def": 80, "spa": 50, "spd": 90, "spe": 90},
    "abilities": {"0": "Vital Spirit", "1": "Inner Focus", "H": "Defiant"},
    "heightm": 1.2,
    "weightkg": 56,
    "color": "Gray",
    "prevo": "Primeape",
    "eggGroups": ["Field", "Human-Like"],
    "tier": "OU"
  };

  POKEDEX["indeedee"] = {
    "num": 876,
    "name": "Indeedee",
    "baseForme": "M",
    "types": ["Psychic", "Normal"],
    "gender": "M",
    "baseStats": {"hp": 60, "atk": 65, "def": 55, "spa": 105, "spd": 95, "spe": 95},
    "abilities": {"0": "Synchronize", "1": "Inner Focus", "H": "Psychic Surge"},
    "heightm": 0.9,
    "weightkg": 28,
    "color": "Purple",
    "eggGroups": ["Field"],
    "otherFormes": ["Indeedee-F"],
    "formeOrder": ["Indeedee", "Indeedee-F"],
    "tier": "NU"
  };

  POKEDEX["indeedeef"] = {
    "num": 876,
    "name": "Indeedee-F",
    "baseSpecies": "Indeedee",
    "forme": "F",
    "types": ["Psychic", "Normal"],
    "gender": "F",
    "baseStats": {"hp": 60, "atk": 65, "def": 55, "spa": 105, "spd": 95, "spe": 95},
    "abilities": {"0": "Synchronize", "H": "Psychic Surge"},
    "heightm": 0.9,
    "weightkg": 28,
    "color": "Purple",
    "eggGroups": ["Field"],
    "tier": "NU"
  };

  POKEDEX["salamence"] = {
    "num": 373,
    "name": "Salamence",
    "types": ["Dragon", "Flying"],
    "genderRatio": {"M": 0.5, "F": 0.5},
    "baseStats": {"hp": 95, "atk": 135, "def": 80, "spa": 110, "spd": 80, "spe": 100},
    "abilities": {"0": "Intimidate", "H": "Moxie"},
    "heightm": 1.5,
    "weightkg": 102.6,
    "color": "Blue",
    "prevo": "Shelgon",
    "evoLevel": 50,
    "eggGroups": ["Dragon"],
    "otherFormes": ["Salamence-Mega"],
    "formeOrder": ["Salamence", "Salamence-Mega"],
    "tier": "OU"
  };

  POKEDEX["salamencemega"] = {
    "num": 373,
    "name": "Salamence-Mega",
    "baseSpecies": "Salamence",
    "forme": "Mega",
    "types": ["Dragon", "Flying"],
    "genderRatio": {"M": 0.5, "F": 0.5},
    "baseStats": {"hp": 95, "atk": 145, "def": 130, "spa": 120, "spd": 90, "spe": 120},
    "abilities": ["Aerilate"],
    "heightm": 1.8,
    "weightkg": 112.5,
    "color": "Blue",
    "eggGroups": ["Dragon"],
    "requiredItem": "Salamencite",
    "tier": "Illegal",
    "isNonstandard": "Past"
  };

  POKEDEX["floetteeternalmega"] = {
    "num": 670,
    "name": "Floette-Eternal-Mega",
    "baseSpecies": "Floette-Eternal",
    "forme": "Mega",
    "types": ["Fairy"],
    "gender": "F",
    "baseStats": {"hp": 74, "atk": 85, "def": 87, "spa": 155, "spd": 148, "spe": 102},
    "abilities": ["Fairy Aura"],
    "heightm": 0.2,
    "weightkg": 100.0,
    "color": "White",
    "eggGroups": ["Undiscovered"],
    "requiredItem": "Floettite",
    "tier": "Illegal",
    "isNonstandard": "Future"
  };
}

if (typeof LEARNSETS !== 'undefined') {
  LEARNSETS["girafarig"] = [
    "astonish", "growl", "tackle", "confusion", "stomp", "agility", 
    "psybeam", "batonpass", "doublehit", "psychic", "nastyplot", 
    "shadowball", "thunderbolt", "dazzlinggleam", "energyball", "trick", "calmmind"
  ];

  LEARNSETS["farigiraf"] = [
    "tackle", "growl", "confusion", "stomp", "psybeam", "agility", 
    "psychic", "nastyplot", "shadowball", "thunderbolt", "dazzlinggleam", 
    "energyball", "trick", "calmmind", "hypervoice", "earthquake", "bodypress"
  ];

  LEARNSETS["rillaboom"] = [
    "woodhammer", "grassyglide", "highhorsepower", "knockoff", "fakeout", "protect",
    "uturn", "earthquake", "superpower", "encore", "growth", "swordsdance"
  ];

  LEARNSETS["annihilape"] = [
    "closecombat", "drainpunch", "earthquake", "rockslide", "bulkup", "protect",
    "finalgambit", "taunt", "gunkshot", "icespinner", "swordsdance", "bodyslam"
  ];

  LEARNSETS["indeedee"] = [
    "psychic", "psyshock", "hypervoice", "shadowball", "expandingforce", "protect",
    "dazzlinggleam", "followme", "helpinghand", "trickroom", "mysticalfire", "storedpower"
  ];

  LEARNSETS["indeedeef"] = [
    "psychic", "psyshock", "hypervoice", "shadowball", "expandingforce", "protect",
    "dazzlinggleam", "followme", "helpinghand", "trickroom", "mysticalfire", "storedpower"
  ];

  LEARNSETS["salamence"] = [
    "dragonclaw", "outrage", "earthquake", "rockslide", "fireblast", "protect",
    "hurricane", "tailwind", "doubleedge", "stoneedge", "bodyslam", "flamethrower"
  ];

  LEARNSETS["salamencemega"] = [
    "dragonclaw", "outrage", "earthquake", "rockslide", "fireblast", "protect",
    "hurricane", "tailwind", "doubleedge", "stoneedge", "bodyslam", "flamethrower"
  ];

  LEARNSETS["floetteeternalmega"] = [
    "lightofruin", "moonblast", "dazzlinggleam", "calmmind", "protect", "energyball",
    "shadowball", "psychic", "grassknot", "mistyterrain", "wish", "hiddenpower"
  ];
}

if (typeof ABILITIES_DB !== 'undefined') {
  ABILITIES_DB["Inner Focus"] = "Foco Interno";
  ABILITIES_DB["Early Bird"] = "Madrugar";
  ABILITIES_DB["Sap Sipper"] = "Herbívoro";
  ABILITIES_DB["Cud Chew"] = "Rumia";
  ABILITIES_DB["Armor Tail"] = "Cola Armadura";
  ABILITIES_DB["Grassy Surge"] = "Herbogénesis";
  ABILITIES_DB["Vital Spirit"] = "Espíritu Vital";
  ABILITIES_DB["Defiant"] = "Competitivo";
  ABILITIES_DB["Intimidate"] = "Intimidación";
  ABILITIES_DB["Moxie"] = "Autoestima";
  ABILITIES_DB["Synchronize"] = "Sincronía";
  ABILITIES_DB["Psychic Surge"] = "Psicogénesis";
  ABILITIES_DB["Aerilate"] = "Aerovelocidad";
  ABILITIES_DB["Fairy Aura"] = "Aura Feérica";
  ABILITIES_DB["Overgrow"] = "Espesura";
}

function getPokemonLearnset(key) {
  let learnset = LEARNSETS[key] || [];
  if (key && key.startsWith("rotom") && key !== "rotom") {
    const baseLearnset = LEARNSETS["rotom"] || [];
    learnset = [...new Set([...learnset, ...baseLearnset])];
  }
  return learnset;
}

const DEFAULT_COMPETITIVE_MOVES = {
  "charizard": ["weatherball", "protect", "heatwave", "solarbeam"],
  "charizardmegay": ["weatherball", "protect", "heatwave", "solarbeam"],
  "charizardmegax": ["flareblitz", "dragonclaw", "roost", "protect"],
  "floetteeternal": ["lightofruin", "moonblast", "dazzlinggleam", "protect"],
  "floetteeternalmega": ["lightofruin", "moonblast", "dazzlinggleam", "protect"],
  "rillaboom": ["woodhammer", "grassyglide", "fakeout", "protect"],
  "annihilape": ["closecombat", "drainpunch", "bulkup", "protect"],
  "indeedee": ["expandingforce", "psychic", "hypervoice", "protect"],
  "indeedeef": ["expandingforce", "psychic", "hypervoice", "protect"],
  "salamence": ["dragonclaw", "earthquake", "rockslide", "protect"],
  "salamencemega": ["dragonclaw", "earthquake", "rockslide", "protect"],
  "basculegion": ["wavecrash", "lastrespects", "aquajet", "protect"],
  "basculegionf": ["wavecrash", "lastrespects", "aquajet", "protect"],
  "whimsicott": ["tailwind", "moonblast", "encore", "protect"],
  "kingambit": ["kowtowcleave", "suckerpunch", "swordsdance", "protect"],
  "garchomp": ["earthquake", "dragonclaw", "rockslide", "protect"],
  "garchompmega": ["earthquake", "dragonclaw", "rockslide", "protect"],
  "aerodactyl": ["rockslide", "dualwingbeat", "tailwind", "protect"],
  "aerodactylmega": ["rockslide", "dualwingbeat", "tailwind", "protect"],
  "sneasler": ["direclaw", "closecombat", "fakeout", "protect"],
  "sylveon": ["hypervoice", "moonblast", "quickattack", "protect"],
  "incineroar": ["fakeout", "flareblitz", "knockoff", "partingshot"],
  "archaludon": ["electroshot", "flashcannon", "dracometeor", "bodypress"],
  "gengarmega": ["sludgebomb", "shadowball", "willowisp", "protect"],
  "gengar": ["sludgebomb", "shadowball", "willowisp", "protect"],
  "froslassmega": ["blizzard", "shadowball", "auroraveil", "protect"],
  "scovillainmega": ["overheat", "gigadrain", "ragepowder", "protect"],
  "sableye": ["willowisp", "raindance", "encore", "disable"],
  "milotic": ["scald", "icebeam", "recover", "protect"],
  "politoed": ["weatherball", "helpinghand", "icywind", "protect"],
  "sinistcha": ["matchagotcha", "strengthsap", "trickroom", "ragepowder"],
  "dragonitemega": ["outrage", "extremespeed", "earthquake", "protect"],
  "dragonite": ["outrage", "extremespeed", "earthquake", "protect"],
  "lycanrocdusk": ["rockslide", "accelerock", "closecombat", "protect"],
  "torkoal": ["eruption", "heatwave", "solarbeam", "protect"],
  "farigiraf": ["hypervoice", "psychic", "trickroom", "helpinghand"],
  "lopunnymega": ["fakeout", "closecombat", "return", "protect"],
  "meganiummega": ["energyball", "gigadrain", "toxic", "protect"],
  "glimmora": ["mortalspin", "sludgewave", "earthpower", "stealthrock"],
  "slowkinggalar": ["sludgebomb", "psychic", "chillyreception", "protect"],
  "blastoismega": ["waterpulse", "aurasphere", "flashcannon", "fakeout"],
  "cameruptmega": ["eruption", "earthpower", "heatwave", "protect"],
  "samurotthisui": ["sacredsword", "suckerpunch", "aquacutter", "nightslash"],
  "oranguru": ["instruct", "trickroom", "psychic", "protect"],
  "kleavor": ["stoneaxe", "xscissor", "closecombat", "protect"],
  "snorlax": ["bodyslam", "highhorsepower", "bellydrum", "protect"],
  "zoroarkhisui": ["bittermalice", "hypervoice", "nastyplot", "protect"],
  "maushold": ["populationbomb", "followme", "superfang", "protect"],
  "mausholdfour": ["populationbomb", "followme", "superfang", "protect"],
  "corviknight": ["bravebird", "bodypress", "tailwind", "roost"],
  "rotomwash": ["thunderbolt", "hydropump", "voltswitch", "protect"],
  "tyranitar": ["rockslide", "knockoff", "lowkick", "protect"],
  "tyranitarmega": ["rockslide", "knockoff", "lowkick", "protect"],
  "volcarona": ["heatwave", "bugbuzz", "quiverdance", "protect"],
  "excadrill": ["earthquake", "ironhead", "rockslide", "protect"],
  "excadrillmega": ["earthquake", "ironhead", "rockslide", "protect"],
  "ninetalesalola": ["blizzard", "moonblast", "auroraveil", "protect"],
  "primarina": ["hypervoice", "moonblast", "haze", "protect"],
  "aegislash": ["shadowball", "flashcannon", "kingsshield", "wideguard"],
  "audino": ["healpulse", "helpinghand", "dazzlinggleam", "protect"],
  "slowbromega": ["scald", "psyshock", "slackoff", "protect"],
  "klefki": ["foulplay", "thunderwave", "lightscreen", "reflect"],
  "wyrdeer": ["psyshieldbash", "hypervoice", "trickroom", "protect"],
  "altaria": ["hypervoice", "dracometeor", "tailwind", "roost"],
  "gyarados": ["waterfall", "bounce", "dragondance", "protect"],
  "delphoxmega": ["heatwave", "psychic", "willowisp", "protect"],
  "kommoo": ["clangoroussoul", "clangingscales", "bodypress", "protect"],
  "tinkaton": ["gigatonhammer", "fakeout", "knockoff", "playrough"]
};

function getPokemonDefaultMoves(key) {
  if (!key) return [null, null, null, null];
  const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (DEFAULT_COMPETITIVE_MOVES[cleanKey]) {
    return [...DEFAULT_COMPETITIVE_MOVES[cleanKey]];
  }
  
  const baseKey = cleanKey.replace(/mega[xy]?$/i, "").replace(/eternal$/i, "");
  if (DEFAULT_COMPETITIVE_MOVES[baseKey]) {
    return [...DEFAULT_COMPETITIVE_MOVES[baseKey]];
  }
  
  const learnset = getPokemonLearnset(key);
  if (!learnset || learnset.length === 0) return [null, null, null, null];
  
  const dbPoke = (typeof POKEDEX !== "undefined") ? (POKEDEX[key] || POKEDEX[baseKey]) : null;
  const types = dbPoke ? (dbPoke.types || []).map(t => t.toLowerCase()) : [];
  const selected = [];
  
  const utilityMoves = ["protect", "fakeout", "tailwind", "trickroom", "swordsdance", "nastyplot", "willowisp", "spore", "followme", "ragepowder"];
  for (const util of utilityMoves) {
    if (learnset.includes(util) && !selected.includes(util)) {
      selected.push(util);
      break;
    }
  }
  
  for (const moveId of learnset) {
    if (selected.length >= 4) break;
    if (selected.includes(moveId)) continue;
    const moveInfo = typeof MOVES_INFO !== "undefined" ? MOVES_INFO[moveId] : null;
    if (moveInfo && moveInfo.c !== "Status" && moveInfo.t) {
      if (types.includes(moveInfo.t.toLowerCase())) {
        selected.push(moveId);
      }
    }
  }
  
  for (const moveId of learnset) {
    if (selected.length >= 4) break;
    if (!selected.includes(moveId)) {
      selected.push(moveId);
    }
  }
  
  while (selected.length < 4) {
    selected.push(null);
  }
  
  return selected.slice(0, 4);
}

function getItemDisplayName(itemId) {
  if (!itemId) return "";
  if (itemId === "charizarpiedra" || itemId === "charizardite-y") return "Charizardita Y";
  if (itemId === "charizardite-x") return "Charizardita X";
  if (typeof COMPETITIVE_ITEMS !== "undefined") {
    const item = COMPETITIVE_ITEMS.find(i => i.id === itemId);
    if (item) {
      return item.name.split(" (")[0];
    }
  }
  return itemId;
}


// Search Filters State
let searchQuery = "";
let selectedGen = "all";
let selectedTypes = [];

// Type translations English -> Spanish
const typeTranslations = {
  normal: "Normal",
  fire: "Fuego",
  water: "Agua",
  grass: "Planta",
  electric: "Eléctrico",
  ice: "Hielo",
  fighting: "Lucha",
  poison: "Veneno",
  ground: "Tierra",
  flying: "Volador",
  psychic: "Psíquico",
  bug: "Bicho",
  rock: "Roca",
  ghost: "Fantasma",
  dragon: "Dragón",
  dark: "Siniestro",
  steel: "Acero",
  fairy: "Hada"
};

// Types list for UI
const allTypes = Object.keys(typeTranslations);

// Type Chart: defendingType -> attackingType -> multiplier
const typeChart = {
  normal: { fighting: 2, ghost: 0 },
  fire: { fire: 0.5, grass: 0.5, ice: 0.5, bug: 0.5, steel: 0.5, fairy: 0.5, water: 2, ground: 2, rock: 2 },
  water: { fire: 0.5, water: 0.5, ice: 0.5, steel: 0.5, grass: 2, electric: 2 },
  grass: { water: 0.5, grass: 0.5, electric: 0.5, ground: 0.5, fire: 2, ice: 2, poison: 2, flying: 2, bug: 2 },
  electric: { electric: 0.5, flying: 0.5, steel: 0.5, ground: 2 },
  ice: { ice: 0.5, fire: 2, fighting: 2, rock: 2, steel: 2 },
  fighting: { bug: 0.5, rock: 0.5, dark: 0.5, flying: 2, psychic: 2, fairy: 2 },
  poison: { grass: 0.5, fighting: 0.5, poison: 0.5, bug: 0.5, fairy: 0.5, ground: 2, psychic: 2 },
  ground: { poison: 0.5, rock: 0.5, electric: 0, water: 2, grass: 2, ice: 2 },
  flying: { grass: 0.5, fighting: 0.5, bug: 0.5, ground: 0, electric: 2, ice: 2, rock: 2 },
  psychic: { fighting: 0.5, psychic: 0.5, bug: 2, ghost: 2, dark: 2 },
  bug: { grass: 0.5, fighting: 0.5, ground: 0.5, fire: 2, flying: 2, rock: 2 },
  rock: { normal: 0.5, fire: 0.5, poison: 0.5, flying: 0.5, water: 2, grass: 2, fighting: 2, ground: 2, steel: 2 },
  ghost: { poison: 0.5, bug: 0.5, normal: 0, fighting: 0, ghost: 2, dark: 2 },
  dragon: { fire: 0.5, water: 0.5, grass: 0.5, electric: 0.5, ice: 2, dragon: 2, fairy: 2 },
  dark: { ghost: 0.5, dark: 0.5, psychic: 0, fighting: 2, bug: 2, fairy: 2 },
  steel: { normal: 0.5, grass: 0.5, ice: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 0.5, dragon: 0.5, steel: 0.5, fairy: 0.5, poison: 0, fire: 2, fighting: 2, ground: 2 },
  fairy: { fighting: 0.5, bug: 0.5, dark: 0.5, dragon: 0, poison: 2, steel: 2 }
};

// --- INITIALIZATION ---
window.addEventListener("DOMContentLoaded", () => {
  renderEmptySlots();
  renderTypeFiltersInModal();
  
  // Load team from Hash or LocalStorage
  if (!loadTeamFromHash()) {
    loadTeamFromLocalStorage();
  }
  
  updateUI();
  initMetaTeams(false);
});

// Returns the single Pokemon Box (array of 30 slots)
function getCurrentBox() {
  return pokemonBoxes[0];
}

// Collect all keys across the box (used for suggestions and validation)
function getAllBoxKeys() {
  const keys = [];
  pokemonBoxes[0].forEach(p => { if (p) keys.push(p.key); });
  return keys;
}

// --- CAROUSEL NAVIGATION ---
function changeAnalysisSlide(direction) {
  activeAnalysisSlide = (activeAnalysisSlide + direction + 4) % 4;
  updateAnalysisSlideUI();
}

function setAnalysisSlide(slideIndex) {
  activeAnalysisSlide = slideIndex;
  updateAnalysisSlideUI();
}

function updateAnalysisSlideUI() {
  const titles = [
    '<i class="lucide-icon" data-lucide="swords"></i> Eficaz Contra (Ofensivo)',
    '<i class="lucide-icon" data-lucide="shield-check"></i> Inmunidades y Resistencias (Defensivo)',
    '<i class="lucide-icon" data-lucide="shield-alert"></i> Débil Contra (Defensivo)',
    '<i class="lucide-icon" data-lucide="shield-alert"></i> Falta por cubrir'
  ];
  
  const titleEl = document.getElementById("analysis-section-title");
  if (titleEl) {
    titleEl.innerHTML = titles[activeAnalysisSlide];
  }
  
  const dots = document.querySelectorAll("#analysis-carousel-dots .dot");
  dots.forEach((dot, idx) => {
    if (idx === activeAnalysisSlide) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
  
  runCoverageAnalysis();
  lucide.createIcons();
}

// Global slide navigation for the entire Buildeo tab
function changeBuildeoTabSlide(direction) {
  activeBuildeoTabSlide = (activeBuildeoTabSlide + direction + 4) % 4;
  updateBuildeoTabSlideUI();
}

function setBuildeoTabSlide(slideIndex) {
  activeBuildeoTabSlide = slideIndex;
  updateBuildeoTabSlideUI();
}

function updateBuildeoTabSlideUI() {
  const titles = [
    '<i class="lucide-icon" data-lucide="swords"></i> Personalizar Movimientos (Paso 1 / 4)',
    '<i class="lucide-icon" data-lucide="zap"></i> Configurar Habilidad (Paso 2 / 4)',
    '<i class="lucide-icon" data-lucide="compass"></i> Estadísticas y Naturaleza (Paso 3 / 4)',
    '<i class="lucide-icon" data-lucide="package"></i> Equipar Objetos Competitivos (Paso 4 / 4)'
  ];
  
  const titleEl = document.getElementById("buildeo-section-title");
  if (titleEl) {
    titleEl.innerHTML = titles[activeBuildeoTabSlide];
  }
  
  const dots = document.querySelectorAll("#buildeo-carousel-dots .dot");
  dots.forEach((dot, idx) => {
    if (idx === activeBuildeoTabSlide) {
      dot.classList.add("active");
    } else {
      dot.classList.remove("active");
    }
  });
  
  // Update slide for all card tracks (width = 400%, shift = 25% per slide)
  for (let i = 0; i < 6; i++) {
    buildeoSlides[i] = activeBuildeoTabSlide;
    const card = document.querySelector(`.buildeo-card[data-slot="${i}"]`);
    if (card) {
      const track = card.querySelector('.buildeo-slider-track');
      if (track) {
        track.style.transform = `translateX(-${activeBuildeoTabSlide * 25}%)`;
      }
    }
  }
  if (typeof lucide !== "undefined") lucide.createIcons();
}


// Switch between tabs
function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".app-section").forEach(sec => sec.classList.remove("active"));
  
  if (tabId === "builder") {
    document.getElementById("tab-builder").classList.add("active");
    document.getElementById("section-builder").classList.add("active");
  } else if (tabId === "box") {
    document.getElementById("tab-box").classList.add("active");
    document.getElementById("section-box").classList.add("active");
    renderPokemonBox();
  } else if (tabId === "buildeo") {
    document.getElementById("tab-buildeo").classList.add("active");
    document.getElementById("section-buildeo").classList.add("active");
    renderBuildeoTab();
    updateBuildeoTabSlideUI();
  } else if (tabId === "estrategias") {
    document.getElementById("tab-estrategias").classList.add("active");
    document.getElementById("section-estrategias").classList.add("active");
    initMetaTeams(false);
  }
}

// --- TEAM MANAGEMENT ---

function renderEmptySlots() {
  const teamGrid = document.getElementById("active-team-grid");
  teamGrid.innerHTML = "";
  
  for (let i = 0; i < 6; i++) {
    const slot = document.createElement("div");
    slot.className = "pokemon-slot glass-card";
    slot.setAttribute("onclick", `openSearchModal(${i})`);
    
    if (activeTeam[i]) {
      const p = activeTeam[i];
      slot.classList.add("filled");
      slot.innerHTML = `
        <button class="btn-remove-pokemon" onclick="removePokemon(${i}, event)">
          <i data-lucide="x"></i>
        </button>
        <button class="btn-send-to-box" onclick="moveTeamPokemonToBox(${i}, event)" title="Enviar a la Caja Pokémon">
          <i data-lucide="package"></i>
        </button>
        <div class="slot-filled">
          <img class="poke-sprite" src="${getPokemonSpriteUrl(p)}" alt="${p.name}" onerror="handleImageError(this, '${p.key}')">
          <div class="poke-name">${p.name}</div>
          <div class="poke-types">${getPokemonTypes(p).map(t => `<span class="type-badge type-${t.toLowerCase()}">${typeTranslations[t.toLowerCase()]}</span>`).join("")}</div>
        </div>
      `;
    } else {
      // Predict teammate from PRESET_TEAMS and Box
      const currentNames = activeTeam.filter(p => p).map(p => p.key);
      let predictedPoke = null;
      let isFromBox = false;
      
      const boxKeys = getAllBoxKeys();
      
      if (currentNames.length > 0) {
        // Find matching teams
        const teamMatches = ACTIVE_PRESET_TEAMS.map(team => {
          let matchCount = 0;
          currentNames.forEach(name => {
            const matches = (team.pokemon || []).some(p => {
              const key1 = findPokedexKeyByName(p);
              const key2 = findPokedexKeyByName(name);
              return key1 && key2 && key1 === key2;
            });
            if (matches) matchCount++;
          });
          return { team, matchCount };
        }).filter(tm => tm.matchCount > 0);
        
        let sortedCandidates = [];
        if (teamMatches.length > 0) {
          teamMatches.sort((a, b) => b.matchCount - a.matchCount);
          
          const candidateCounts = {};
          teamMatches.forEach(tm => {
            const weight = tm.matchCount;
            (tm.team.pokemon || []).forEach(p => {
              const key = findPokedexKeyByName(p);
              if (key && !currentNames.some(name => findPokedexKeyByName(name) === key)) {
                // Give bonus weight if it's in the Box!
                const boxBonus = boxKeys.includes(key) ? 100 : 0;
                candidateCounts[key] = (candidateCounts[key] || 0) + weight + boxBonus;
              }
            });
          });
          
          sortedCandidates = Object.keys(candidateCounts).sort((a, b) => candidateCounts[b] - candidateCounts[a]);
        } else {
          // If no preset matches, just suggest from Box
          sortedCandidates = boxKeys.filter(k => !currentNames.some(name => findPokedexKeyByName(name) === k));
        }
        
        let emptySlotsBefore = 0;
        for (let prevIdx = 0; prevIdx < i; prevIdx++) {
          if (!activeTeam[prevIdx]) emptySlotsBefore++;
        }
        
        if (sortedCandidates[emptySlotsBefore]) {
          const candidateKey = sortedCandidates[emptySlotsBefore];
          predictedPoke = POKEDEX[candidateKey];
          if (predictedPoke) {
            predictedPoke.key = candidateKey;
            isFromBox = boxKeys.includes(candidateKey);
          }
        }
      }
      
      if (predictedPoke) {
        slot.className = "pokemon-slot glass-card slot-suggested";
        slot.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; position: relative;">
            ${isFromBox ? '<span class="suggested-box-badge">En tu Caja</span>' : '<span class="suggested-label">Recomendado</span>'}
            <img class="suggested-sprite" src="${getPokemonSpriteUrl(predictedPoke)}" alt="${predictedPoke.name}" onerror="handleImageError(this, '${predictedPoke.key}')">
            <span class="suggested-name">${predictedPoke.name}</span>
            <button class="btn-add-suggested" onclick="addSuggestedPokemon(${i}, '${predictedPoke.key}', event)">
              <i data-lucide="plus" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> Añadir
            </button>
          </div>
        `;
      } else {
        slot.innerHTML = `
          <div class="slot-empty">
            <i data-lucide="plus-circle"></i>
            <span style="font-family: var(--font-display); font-weight: 500; font-size: 0.9rem;">Añadir Pokémon</span>
          </div>
        `;
      }
    }
    teamGrid.appendChild(slot);
    
    // --- DRAG & DROP: TEAM SLOTS ---
    slot.setAttribute("draggable", activeTeam[i] ? "true" : "false");
    slot.addEventListener("dragstart", (e) => {
      if (!activeTeam[i]) { e.preventDefault(); return; }
      dragState = { source: "team", index: i };
      e.dataTransfer.setData("text/plain", "team:" + i);
      e.dataTransfer.effectAllowed = "move";
      slot.classList.add("dragging-source");
    });
    slot.addEventListener("dragend", () => clearDragVisuals());
    
    if (!activeTeam[i]) {
      // Empty slots accept Box -> Team drops
      slot.addEventListener("dragover", (e) => {
        if (dragState && dragState.source === "box" && !activeTeam[i]) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          slot.classList.add("drag-over-target");
        }
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over-target"));
      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        slot.classList.remove("drag-over-target");
        if (dragState && dragState.source === "box") {
          const boxIndex = dragState.index;
          dragState = null;
          moveBoxPokemonToTeam(boxIndex);
        }
      });
    }
  }
  lucide.createIcons();
}

function getPokemonSpriteUrl(p) {
  if (!p) return "";
  
  // Specific override for custom Mega Greninja asset
  if (p.key === "greninjamega" || p.name === "Greninja-Mega") {
    return "img/mega_greninja_square.webp";
  }
  
  let filename = (p.key || p.name).toLowerCase();
  
  if (p.baseSpecies && p.forme) {
    const base = p.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, "");
    const forme = p.forme.toLowerCase().replace(/[^a-z0-9]/g, "");
    filename = `${base}-${forme}`;
  } else {
    filename = filename.replace(/[^a-z0-9]/g, "");
  }
  
  // If it's custom, future, or CAP, look in local folder 'img/' first
  const isCustomOrNonstandard = p.isNonstandard && (p.isNonstandard === "Future" || p.isNonstandard === "Custom" || p.isNonstandard === "CAP");
  if (isCustomOrNonstandard) {
    return `img/${filename}.png`;
  }
  
  return `https://play.pokemonshowdown.com/sprites/dex/${filename}.png`;
}

function handleImageError(imgElement, key) {
  let p = POKEDEX[key];
  
  const step = parseInt(imgElement.dataset.fallbackStep || "0");
  
  if (step === 0) {
    imgElement.dataset.fallbackStep = "1";
    
    // Attempt internet showdown dex sprite
    let filename = key;
    if (p) {
      filename = (p.key || p.name).toLowerCase();
      if (p.baseSpecies && p.forme) {
        const base = p.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, "");
        const forme = p.forme.toLowerCase().replace(/[^a-z0-9]/g, "");
        filename = `${base}-${forme}`;
      } else {
        filename = filename.replace(/[^a-z0-9]/g, "");
      }
    }
    imgElement.src = `https://play.pokemonshowdown.com/sprites/dex/${filename}.png`;
  } else if (step === 1) {
    imgElement.dataset.fallbackStep = "2";
    
    // Fallback to base species Showdown sprite
    if (p && p.baseSpecies) {
      const base = p.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, "");
      imgElement.src = `https://play.pokemonshowdown.com/sprites/dex/${base}.png`;
    } else {
      // Fallback: if key ends with "mega" or "megax" or "megay", try without the suffix
      let baseKey = String(key || "");
      if (baseKey.endsWith("mega")) {
        baseKey = baseKey.slice(0, -4);
        imgElement.src = `https://play.pokemonshowdown.com/sprites/dex/${baseKey}.png`;
      } else if (baseKey.endsWith("megax") || baseKey.endsWith("megay")) {
        baseKey = baseKey.slice(0, -5);
        imgElement.src = `https://play.pokemonshowdown.com/sprites/dex/${baseKey}.png`;
      } else {
        // Fallback to PokeAPI sprite using database number if available
        if (p && p.num) {
          imgElement.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.num}.png`;
        } else {
          imgElement.src = "img/items/poke-ball.png";
        }
      }
    }
  } else if (step === 2) {
    imgElement.dataset.fallbackStep = "3";
    
    // Try PokeAPI as step 3
    if (p && p.num) {
      imgElement.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.num}.png`;
    } else {
      imgElement.src = "img/items/poke-ball.png";
    }
  } else {
    // Ultimate fallback to Pokéball
    imgElement.src = "img/items/poke-ball.png";
  }
}

function addPokemonToSlot(pKey) {
  const pData = POKEDEX[pKey];
  if (!pData) return;
  
  const defaultMoves = getPokemonDefaultMoves(pKey);
  const megaStoneId = getMegaStoneIdForPokemon({ ...pData, key: pKey });
  
  let equippedItem = megaStoneId || null;
  if (pKey.toLowerCase().includes("charizard")) {
    equippedItem = "charizardite-y";
  }
  
  const pokemonObj = {
    ...pData,
    key: pKey,
    selectedAbility: pData.abilities ? Object.values(pData.abilities)[0] : null,
    equippedItem: equippedItem,
    selectedMoves: defaultMoves
  };
  
  if (currentSearchTarget === 'box') {
    const box = getCurrentBox();
    if (currentSlotIndex >= 0 && currentSlotIndex < BOX_SIZE) {
      box[currentSlotIndex] = pokemonObj;
    } else {
      const emptyIndex = box.findIndex(p => !p);
      if (emptyIndex !== -1) {
        box[emptyIndex] = pokemonObj;
      } else {
        showToast("Tu caja Pokémon está llena (máximo 30)", "error");
        return;
      }
    }
    closeSearchModal();
    renderPokemonBox();
    saveTeamToLocalStorage();
    return;
  }
  
  if (currentSlotIndex >= 0 && currentSlotIndex < 6) {
    activeTeam[currentSlotIndex] = pokemonObj;
  } else {
    // Add to first empty slot
    const emptyIndex = activeTeam.findIndex(p => !p);
    if (emptyIndex !== -1) {
      activeTeam[emptyIndex] = pokemonObj;
    } else if (activeTeam.length < 6) {
      activeTeam.push(pokemonObj);
    } else {
      showToast("Tu equipo ya está lleno (máximo 6 Pokémon)", "error");
      return;
    }
  }
  
  closeSearchModal();
  saveTeamToLocalStorage();
  updateUI();
  showToast(`¡${pokemonObj.name} añadido al equipo!`, "success");
}

function removePokemon(index, event) {
  event.stopPropagation(); // Prevent opening modal
  const removedName = activeTeam[index] ? activeTeam[index].name : "";
  activeTeam[index] = null;
  
  // Clean up trailing nulls, but keep positions relative
  saveTeamToLocalStorage();
  updateUI();
  if (removedName) {
    showToast(`¡${removedName} eliminado del equipo!`, "success");
  }
}

function clearTeam() {
  activeTeam = [];
  saveTeamToLocalStorage();
  updateUI();
  showToast("Equipo limpiado", "success");
}



// --- UTILITIES & STORAGE ---

function saveTeamToLocalStorage() {
  const keys = activeTeam.map(p => p ? p.key : null);
  localStorage.setItem("pokemon_team", JSON.stringify(keys));
  
  const boxKeys = getCurrentBox().map(p => p ? p.key : null);
  localStorage.setItem("pokemon_box", JSON.stringify(boxKeys));
  
  const boxDetails = getCurrentBox().map(p => {
    if (!p) return null;
    return {
      key: p.key,
      selectedAbility: p.selectedAbility || (p.abilities ? Object.values(p.abilities)[0] : null),
      equippedItem: p.equippedItem || null,
      selectedMoves: p.selectedMoves || null,
      megaFormeKey: p.megaFormeKey || null,
      megaFormeName: p.megaFormeName || null
    };
  });
  localStorage.setItem("pokemon_box_details", JSON.stringify(boxDetails));
  
  const details = activeTeam.map(p => {
    if (!p) return null;
    return {
      key: p.key,
      selectedAbility: p.selectedAbility || (p.abilities ? Object.values(p.abilities)[0] : null),
      equippedItem: p.equippedItem || null,
      selectedMoves: p.selectedMoves || [null, null, null, null]
    };
  });
  localStorage.setItem("pokemon_team_details", JSON.stringify(details));
  updateUrlHash();
}

function loadTeamFromLocalStorage() {
  try {
    const keysData = localStorage.getItem("pokemon_team");
    const detailsData = localStorage.getItem("pokemon_team_details");
    
    let keys = [];
    let details = [];
    
    if (keysData) keys = JSON.parse(keysData);
    if (detailsData) details = JSON.parse(detailsData);
    
    activeTeam = [];
    for (let i = 0; i < 6; i++) {
      try {
        const key = keys[i];
        if (key && POKEDEX[key]) {
          const detail = details[i] && details[i].key === key ? details[i] : (details.find(d => d && d.key === key) || {});
          const defaultMoves = getPokemonDefaultMoves(key);
          const megaStoneId = getMegaStoneIdForPokemon({ ...POKEDEX[key], key });
          let equippedItem = megaStoneId || detail.equippedItem || null;
          if (key.toLowerCase().includes("charizard") && !equippedItem) {
            equippedItem = "charizardite-y";
          }
          activeTeam[i] = {
            ...POKEDEX[key],
            key: key,
            selectedAbility: detail.selectedAbility || (POKEDEX[key].abilities ? Object.values(POKEDEX[key].abilities)[0] : null),
            equippedItem: equippedItem,
            selectedMoves: detail.selectedMoves || defaultMoves
          };
        } else {
          activeTeam[i] = null;
        }
      } catch (memberErr) {
        activeTeam[i] = null;
      }
    }
    
    const boxKeysData = localStorage.getItem("pokemon_box");
    let boxKeys = [];
    if (boxKeysData) boxKeys = JSON.parse(boxKeysData);

    let boxDetails = [];
    try {
      const boxDetailsData = localStorage.getItem("pokemon_box_details");
      if (boxDetailsData) boxDetails = JSON.parse(boxDetailsData);
    } catch (e) {
      console.error("Error loading box details from local storage", e);
    }

    pokemonBoxes = [new Array(BOX_SIZE).fill(null)];

    const buildBoxPokemon = (key, detail) => {
      const info = detail || {};
      const base = POKEDEX[key] || {};
      return {
        ...base,
        key: key,
        selectedAbility: info.selectedAbility || (base.abilities ? Object.values(base.abilities)[0] : null),
        equippedItem: info.equippedItem || null,
        selectedMoves: info.selectedMoves || getPokemonDefaultMoves(key),
        megaFormeKey: info.megaFormeKey || null,
        megaFormeName: info.megaFormeName || null
      };
    };

    // Handle flat array (single box) or nested array (legacy multi-box)
    if (!Array.isArray(boxKeys) || boxKeys.length === 0) {
      // empty box, nothing to load
    } else if (!Array.isArray(boxKeys[0])) {
      // Flat array: direct single-box format
      for (let i = 0; i < BOX_SIZE; i++) {
        try {
          const key = boxKeys[i];
          if (key && POKEDEX[key]) {
            const detail = Array.isArray(boxDetails) && !Array.isArray(boxDetails[0]) ? boxDetails[i] : (boxDetails[0] && boxDetails[0][i]);
            pokemonBoxes[0][i] = buildBoxPokemon(key, detail);
          }
        } catch (memberErr) {
          pokemonBoxes[0][i] = null;
        }
      }
    } else {
      // Nested array from legacy multi-box: only take box 0
      for (let i = 0; i < BOX_SIZE; i++) {
        try {
          const key = boxKeys[0] && boxKeys[0][i];
          if (key && POKEDEX[key]) {
            const detail = Array.isArray(boxDetails) && Array.isArray(boxDetails[0]) ? boxDetails[0][i] : boxDetails[i];
            pokemonBoxes[0][i] = buildBoxPokemon(key, detail);
          }
        } catch (memberErr) {
          pokemonBoxes[0][i] = null;
        }
      }
    }
  } catch (e) {
    console.error("Error loading team from local storage", e);
  }
}

function updateUrlHash() {
  const keys = activeTeam.filter(p => p).map(p => p.key).join(",");
  if (keys) {
    window.location.hash = `team=${keys}`;
  } else {
    window.location.hash = "";
  }
}

function loadTeamFromHash() {
  const hash = window.location.hash;
  if (hash.startsWith("#team=")) {
    const keysStr = hash.replace("#team=", "");
    if (keysStr) {
      const keys = keysStr.split(",");
      
      // Load details from localStorage to preserve moves/items/abilities
      let details = [];
      try {
        const detailsData = localStorage.getItem("pokemon_team_details");
        if (detailsData) details = JSON.parse(detailsData);
      } catch (e) {
        console.error(e);
      }
      
      activeTeam = [];
      keys.forEach((key, index) => {
        if (key && POKEDEX[key]) {
          // Find detail by index matching key, or fallback to find first matching key in details
          const detail = details[index] && details[index].key === key ? details[index] : (details.find(d => d && d.key === key) || {});
          
          const defaultMoves = getPokemonDefaultMoves(key);
          const megaStoneId = getMegaStoneIdForPokemon({ ...POKEDEX[key], key });
          let equippedItem = megaStoneId || detail.equippedItem || null;
          if (key.toLowerCase().includes("charizard") && !equippedItem) {
            equippedItem = "charizardite-y";
          }
          activeTeam[index] = {
            ...POKEDEX[key],
            key: key,
            selectedAbility: detail.selectedAbility || (POKEDEX[key].abilities ? Object.values(POKEDEX[key].abilities)[0] : null),
            equippedItem: equippedItem,
            selectedMoves: detail.selectedMoves || defaultMoves
          };
        }
      });
      return true;
    }
  }
  return false;
}

function shareTeam() {
  const keys = activeTeam.filter(p => p).map(p => p.key).join(",");
  if (!keys) {
    showToast("Añade Pokémon a tu equipo antes de compartir", "error");
    return;
  }
  
  const shareUrl = `${window.location.origin}${window.location.pathname}#team=${keys}`;
  navigator.clipboard.writeText(shareUrl).then(() => {
    showToast("¡Enlace de equipo copiado al portapapeles!", "success");
  }).catch(() => {
    showToast("No se pudo copiar el enlace automáticamente", "error");
  });
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = type === "success" ? "check-circle" : "alert-circle";
  const iconEl = document.createElement("i");
  iconEl.setAttribute("data-lucide", icon);
  const msgEl = document.createElement("span");
  msgEl.textContent = message == null ? "" : String(message);
  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  
  container.appendChild(toast);
  if (typeof lucide !== "undefined") lucide.createIcons();
  
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- UPDATE INTERFACE ---

function updateUI() {
  renderEmptySlots();
  
  // Count active team members
  const count = activeTeam.filter(p => p).length;
  document.getElementById("team-counter").innerText = `${count} / 6 Pokémon`;
  
  // Run coverage diagnostics
  updateAnalysisSlideUI();
  
  if (activeTab === "buildeo") {
    renderBuildeoTab();
  }
}

// --- DEFENSIVE COVERAGE CALCULATOR ---

function getEffectiveness(attacker, defender) {
  const atk = attacker.toLowerCase();
  const def = defender.toLowerCase();
  if (typeChart[def] && typeChart[def][atk] !== undefined) {
    return typeChart[def][atk];
  }
  return 1.0;
}

function getPokemonEffectiveness(attacker, defendingTypes) {
  let mult = 1.0;
  for (const type of defendingTypes) {
    mult *= getEffectiveness(attacker, type);
  }
  return mult;
}

function getPokemonActiveAbility(p) {
  if (!p) return "Ninguna";
  const abilities = p.abilities || {};
  return p.selectedAbility || Object.values(abilities)[0] || "Ninguna";
}

function getModifiedPokemonEffectiveness(attacker, p) {
  let mult = getPokemonEffectiveness(attacker, getPokemonTypes(p));
  if (!p) return mult;
  
  const selectedAbilityName = getPokemonActiveAbility(p);
  const atkType = attacker.toLowerCase();
  
  if (selectedAbilityName === "Levitate" && atkType === "ground") {
    mult = 0;
  } else if ((selectedAbilityName === "Volt Absorb" || selectedAbilityName === "Lightning Rod" || selectedAbilityName === "Motor Drive") && atkType === "electric") {
    mult = 0;
  } else if ((selectedAbilityName === "Water Absorb" || selectedAbilityName === "Storm Drain" || selectedAbilityName === "Dry Skin") && atkType === "water") {
    mult = 0;
  } else if (selectedAbilityName === "Flash Fire" && atkType === "fire") {
    mult = 0;
  } else if (selectedAbilityName === "Sap Sipper" && atkType === "grass") {
    mult = 0;
  } else if (selectedAbilityName === "Earth Eater" && atkType === "ground") {
    mult = 0;
  } else if (selectedAbilityName === "Well-Baked Body" && atkType === "fire") {
    mult = 0;
  } else if (selectedAbilityName === "Thick Fat" && (atkType === "fire" || atkType === "ice")) {
    mult *= 0.5;
  }
  
  return mult;
}


// --- PURE ANALYSIS METRICS (shared by rendering and the internal scenario engine) ---

function computeStrongAgainst(p) {
  const strongAgainst = [];
  getPokemonTypes(p).forEach(t => {
    const atkType = t.toLowerCase();
    allTypes.forEach(defType => {
      if (typeChart[defType] && typeChart[defType][atkType] === 2) {
        if (!strongAgainst.includes(defType)) strongAgainst.push(defType);
      }
    });
  });
  if (p && p.selectedMoves) {
    p.selectedMoves.forEach(moveId => {
      if (moveId) {
        const moveInfo = MOVES_INFO[moveId];
        if (moveInfo && moveInfo.c !== "Status" && moveInfo.t) {
          const atkType = moveInfo.t.toLowerCase();
          allTypes.forEach(defType => {
            if (typeChart[defType] && typeChart[defType][atkType] === 2) {
              if (!strongAgainst.includes(defType)) strongAgainst.push(defType);
            }
          });
        }
      }
    });
  }
  return strongAgainst;
}

function computeDefense(p) {
  const immunities = [];
  const resistances = [];
  allTypes.forEach(atkType => {
    const mult = getModifiedPokemonEffectiveness(atkType, p);
    if (mult === 0) {
      immunities.push(atkType);
    } else if (mult < 1) {
      resistances.push({ type: atkType, mult });
    }
  });
  return { immunities, resistances };
}

function computePokemonWeaknesses(p) {
  const weaknesses = [];
  allTypes.forEach(atkType => {
    const mult = getModifiedPokemonEffectiveness(atkType, p);
    if (mult > 1) weaknesses.push({ type: atkType, mult });
  });
  return weaknesses;
}

function computeTeamGaps(team) {
  const defensiveGaps = [];
  const offensiveGaps = [];
  const filledTeam = team.filter(p => p);
  
  allTypes.forEach(type => {
    let weakCount = 0;
    let resistCount = 0;
    
    filledTeam.forEach(p => {
      const mult = getModifiedPokemonEffectiveness(type, p);
      if (mult > 1) {
        weakCount++;
      } else if (mult < 1) {
        resistCount++;
      }
    });
    
    if (weakCount >= 2 && resistCount === 0) {
      defensiveGaps.push({
        type: type,
        weakCount: weakCount,
        reason: `Tienes ${weakCount} Pokémon débiles a este tipo y ninguna resistencia o inmunidad en el equipo para compensarlo.`
      });
    }
    
    let hasSuperEffective = false;
    filledTeam.forEach(p => {
      getPokemonTypes(p).forEach(t => {
        const atkType = t.toLowerCase();
        if (typeChart[type] && typeChart[type][atkType] === 2) {
          hasSuperEffective = true;
        }
      });
      
      if (p.selectedMoves) {
        p.selectedMoves.forEach(moveId => {
          if (moveId) {
            const moveInfo = MOVES_INFO[moveId];
            if (moveInfo && moveInfo.c !== "Status" && moveInfo.t) {
              const atkType = moveInfo.t.toLowerCase();
              if (typeChart[type] && typeChart[type][atkType] === 2) {
                hasSuperEffective = true;
              }
            }
          }
        });
      }
    });
    
    if (!hasSuperEffective) {
      offensiveGaps.push({
        type: type,
        reason: `No tienes movimientos de ataque ni tipos de tu equipo eficaces (2x) contra oponentes de este tipo.`
      });
    }
  });
  
  return { defensiveGaps, offensiveGaps };
}

// --- MULTI-MEGA ANALYSIS ENGINE (internal, never touches the real team) ---
// A real battle only allows ONE active Mega. When the team holds several
// potential Megas the current coverage engine is evaluated once per legal
// Mega choice over temporary team clones, and a single representative
// scenario is returned. The user always sees the existing evaluation UI.

let MEGA_INDEX = null;

function getMegaIndex() {
  if (MEGA_INDEX) return MEGA_INDEX;
  MEGA_INDEX = { byStone: {}, byBase: {} };
  if (typeof POKEDEX === "undefined" || typeof COMPETITIVE_ITEMS === "undefined") return MEGA_INDEX;
  for (const k in POKEDEX) {
    const entry = POKEDEX[k];
    if (!entry || typeof entry !== "object") continue;
    if (!isMegaPokemon({ ...entry, key: k })) continue;
    const baseKey = getBaseFormKeyForMega({ ...entry, key: k });
    const stoneId = getMegaStoneIdForPokemon({ ...entry, key: k }) || null;
    if (baseKey) {
      if (!MEGA_INDEX.byBase[baseKey]) MEGA_INDEX.byBase[baseKey] = [];
      MEGA_INDEX.byBase[baseKey].push(k);
    }
    if (stoneId) {
      if (!MEGA_INDEX.byStone[stoneId]) MEGA_INDEX.byStone[stoneId] = [];
      MEGA_INDEX.byStone[stoneId].push(k);
    }
  }
  return MEGA_INDEX;
}

function getMemberBaseKey(p) {
  if (!p) return null;
  const key = String(p.key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const baseFromMega = getBaseFormKeyForMega(p);
  if (baseFromMega && baseFromMega !== key) return baseFromMega;
  return key || null;
}

function getPotentialMegaSpecs(team) {
  const specs = [];
  (team || []).forEach((p, idx) => {
    if (!p) return;
    if (isMegaPokemon(p)) {
      const ownKey = String(p.key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const baseKey = getBaseFormKeyForMega(p);
      const baseData = (baseKey && typeof POKEDEX !== "undefined" && POKEDEX[baseKey]) || null;
      if (baseData && baseKey !== ownKey && Array.isArray(baseData.types) && baseData.types.length > 0) {
        specs.push({ idx, kind: "mega-member", ownKey, baseKey, megaKey: ownKey, label: p.name || ownKey });
      }
      return;
    }
    const stoneId = p.equippedItem;
    if (!stoneId) return;
    const index = getMegaIndex();
    const candidates = index.byStone[stoneId] || [];
    const memberBaseKey = getMemberBaseKey(p);
    const megaKey = candidates.find(mk => {
      const entry = POKEDEX[mk];
      if (!entry) return false;
      return getMemberBaseKey({ ...entry, key: mk }) === memberBaseKey;
    }) || null;
    if (megaKey && POKEDEX[megaKey]) {
      specs.push({ idx, kind: "base-stone", ownKey: memberBaseKey, baseKey: memberBaseKey, megaKey, label: POKEDEX[megaKey].name || megaKey });
    }
  });
  return specs;
}

function buildBaseFormMember(member, baseKey) {
  const baseData = (typeof POKEDEX !== "undefined" && POKEDEX[baseKey]) || member;
  const abilityValues = Array.isArray(baseData.abilities) ? baseData.abilities : Object.values(baseData.abilities || {});
  const chosenAbility = (member.selectedAbility && abilityValues.includes(member.selectedAbility))
    ? member.selectedAbility
    : (abilityValues[0] || member.selectedAbility);
  return {
    ...baseData,
    key: baseKey,
    selectedMoves: Array.isArray(member.selectedMoves) ? member.selectedMoves.slice() : getPokemonDefaultMoves(baseKey),
    selectedAbility: chosenAbility,
    equippedItem: null
  };
}

function buildMegaFormMember(member, megaKey) {
  const megaData = (typeof POKEDEX !== "undefined" && POKEDEX[megaKey]) || member;
  const abilityValues = Array.isArray(megaData.abilities) ? megaData.abilities : Object.values(megaData.abilities || {});
  const chosenAbility = (member.selectedAbility && abilityValues.includes(member.selectedAbility))
    ? member.selectedAbility
    : (abilityValues[0] || member.selectedAbility);
  return {
    ...megaData,
    key: megaKey,
    selectedMoves: Array.isArray(member.selectedMoves) ? member.selectedMoves.slice() : getPokemonDefaultMoves(megaKey),
    selectedAbility: chosenAbility,
    equippedItem: member.equippedItem || (getMegaStoneIdForPokemon({ ...megaData, key: megaKey }) || null)
  };
}

function buildScenarioTeam(specs, activeIdx) {
  const team = activeTeam.map(p => (p ? { ...p } : null));
  specs.forEach(spec => {
    const member = team[spec.idx];
    if (!member) return;
    if (spec.idx === specs[activeIdx].idx) {
      if (spec.kind === "base-stone") {
        team[spec.idx] = buildMegaFormMember(member, spec.megaKey);
      }
    } else {
      team[spec.idx] = buildBaseFormMember(member, spec.baseKey);
    }
  });
  return team;
}

function computeScenarioSummary(team) {
  const filledTeam = team.filter(p => p);
  const teamGaps = computeTeamGaps(filledTeam);
  let totalStrong = 0;
  let totalResist = 0;
  let totalImmunities = 0;
  let totalWeak2x = 0;
  let totalWeak4x = 0;
  filledTeam.forEach(p => {
    totalStrong += computeStrongAgainst(p).length;
    const defense = computeDefense(p);
    totalImmunities += defense.immunities.length;
    totalResist += defense.resistances.length;
    computePokemonWeaknesses(p).forEach(w => {
      if (w.mult >= 4) totalWeak4x++;
      else if (w.mult > 1) totalWeak2x++;
    });
  });
  const score = Math.max(0, Math.min(100,
    100
    - teamGaps.defensiveGaps.length * 10
    - teamGaps.offensiveGaps.length * 8
    - totalWeak4x * 3
    - totalWeak2x * 1
    + totalImmunities * 2
    + totalResist * 0.5
    + totalStrong * 0.25
  ));
  return { teamGaps, totalStrong, totalResist, totalImmunities, totalWeak2x, totalWeak4x, score };
}

function resolveAnalysisTeam() {
  const specs = getPotentialMegaSpecs(activeTeam);
  const megaCount = specs.length;
  if (megaCount < 2) return activeTeam;
  let worstScore = Infinity;
  let bestScore = -Infinity;
  let worstIdx = 0;
  let bestIdx = 0;
  for (let i = 0; i < megaCount; i++) {
    const scenarioTeam = buildScenarioTeam(specs, i);
    const summary = computeScenarioSummary(scenarioTeam);
    if (summary.score < worstScore) {
      worstScore = summary.score;
      worstIdx = i;
    }
    if (summary.score > bestScore) {
      bestScore = summary.score;
      bestIdx = i;
    }
  }
  const scenarioSpread = bestScore - worstScore;
  const representativeIdx = scenarioSpread <= 0.5 ? bestIdx : worstIdx;
  return buildScenarioTeam(specs, representativeIdx);
}

function runCoverageAnalysis() {
  const container = document.getElementById("individual-coverage-container");
  container.innerHTML = "";
  
  const team = resolveAnalysisTeam();
  const filledTeam = team.filter(p => p);
  
  if (filledTeam.length === 0) {
    container.className = "individual-coverage-grid";
    container.style.display = "";
    container.innerHTML = `
      <div class="glass-card" style="text-align: center; color: var(--color-text-muted); padding: 3rem; width: 100%;">
        <i data-lucide="help-circle" style="font-size: 3rem; margin-bottom: 1rem; color: var(--primary);"></i>
        <p style="font-family: var(--font-display); font-size: 1.1rem;">Agrega Pokémon a tu equipo para ver su análisis.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  if (activeAnalysisSlide === 3) {
    container.style.display = "block";
    
    const { defensiveGaps, offensiveGaps } = computeTeamGaps(filledTeam);
    
    let html = `
      <div class="glass-card" style="padding: 1.75rem; border-radius: var(--radius-lg); background: rgba(30, 41, 59, 0.45); border: 1px solid rgba(255,255,255,0.06); width: 100%;">
    `;
    
    if (defensiveGaps.length === 0 && offensiveGaps.length === 0) {
      html += `
        <div style="display: flex; align-items: center; gap: 0.5rem; color: #10b981; font-size: 0.95rem; padding: 0.5rem;">
          <i data-lucide="check-circle" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
          <span>¡Tu equipo tiene una cobertura excelente! No se detectaron debilidades críticas sin compensar ni faltas de ofensiva.</span>
        </div>
      `;
    } else {
      // Render Defensive Gaps
      if (defensiveGaps.length > 0) {
        html += `
          <div style="margin-bottom: 1.5rem;">
            <h4 style="margin: 0 0 0.8rem 0; font-size: 0.85rem; color: #f43f5e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Debilidades sin cubrir (Defensivo):</h4>
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              ${defensiveGaps.map(g => `
                <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(244, 63, 94, 0.08); padding: 0.6rem 0.75rem; border-radius: var(--radius-md); border-left: 4px solid #f43f5e;">
                  <span class="type-badge type-${g.type}" style="font-size: 0.7rem; min-width: 80px; text-align: center; font-weight: 600; flex-shrink: 0;">${typeTranslations[g.type].toUpperCase()}</span>
                  <span style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.4;">${g.reason}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }
      
      // Render Offensive Gaps
      if (offensiveGaps.length > 0) {
        html += `
          <div>
            <h4 style="margin: 0 0 0.8rem 0; font-size: 0.85rem; color: #3b82f6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Falta de daño súper eficaz (Ofensivo):</h4>
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              ${offensiveGaps.map(g => `
                <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(59, 130, 246, 0.08); padding: 0.6rem 0.75rem; border-radius: var(--radius-md); border-left: 4px solid #3b82f6;">
                  <span class="type-badge type-${g.type}" style="font-size: 0.7rem; min-width: 80px; text-align: center; font-weight: 600; flex-shrink: 0;">${typeTranslations[g.type].toUpperCase()}</span>
                  <span style="font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.4;">${g.reason}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }
    }
    
    html += `</div>`;
    container.innerHTML = html;
    lucide.createIcons();
    return;
  }

  container.className = "individual-coverage-grid";
  container.style.display = "";
  
  team.forEach((p, idx) => {
    if (!p) return;
    
    const row = document.createElement("div");
    row.className = "pokemon-coverage-row glass-card";
    
    // Build HTML for the 4 moves slots
    const movesHTML = Array.from({ length: 4 }).map((_, i) => {
      const moveId = p.selectedMoves && p.selectedMoves[i];
      const moveName = moveId ? (MOVES_DB[moveId] || moveId) : "-- Seleccionar --";
      const selectedClass = moveId ? "selected" : "";
      const moveDesc = moveId ? (MOVES_DESC[moveId] || "Sin descripción disponible.") : "Selecciona un ataque para este slot.";
      return `
        <button class="pcr-move-btn ${selectedClass}" onclick="openMovesModal(${idx}, ${i})" title="${moveDesc}">
          <span>${moveName}</span>
          <i data-lucide="chevron-right" style="width: 12px; height: 12px; opacity: 0.5;"></i>
        </button>
      `;
    }).join("");
    
    let middleLabel = "";
    let middleHTML = "";
    
    if (activeAnalysisSlide === 0) {
      // --- SLIDE 0: EFICAZ CONTRA (FUERTE CONTRA) ---
      middleLabel = "Fuerte Contra";
      
      const strongAgainst = computeStrongAgainst(p);
      
      if (strongAgainst.length === 0) {
        middleHTML = '<span style="font-size: 0.8rem; color: var(--color-text-muted); font-style: italic;">Ninguno</span>';
      } else {
        middleHTML = strongAgainst.map(t => `
          <div class="multiplier-badge">
            <span class="mb-type type-${t}">${typeTranslations[t]}</span>
            <span class="mb-val val-2x">2x</span>
          </div>
        `).join("");
      }
      
    } else if (activeAnalysisSlide === 1) {
      // --- SLIDE 1: INMUNIDADES Y RESISTENCIAS ---
      middleLabel = "";
      
      const { immunities, resistances } = computeDefense(p);
      resistances.sort((a, b) => a.mult - b.mult);
      
      let immunitiesHTML = "";
      if (immunities.length === 0) {
        immunitiesHTML = '<span style="font-size: 0.8rem; color: var(--color-text-muted); font-style: italic; margin-right: 0.5rem;">Ninguna</span>';
      } else {
        immunitiesHTML = immunities.map(t => `
          <div class="multiplier-badge" style="margin-bottom: 0.2rem;">
            <span class="mb-type type-${t}">${typeTranslations[t]}</span>
            <span class="mb-val val-immune">0x</span>
          </div>
        `).join("");
      }

      let resistancesHTML = "";
      if (resistances.length === 0) {
        resistancesHTML = '<span style="font-size: 0.8rem; color: var(--color-text-muted); font-style: italic; margin-right: 0.5rem;">Ninguna</span>';
      } else {
        resistancesHTML = resistances.map(r => {
          const valClass = r.mult === 0.25 ? "val-quarter" : "val-half";
          const label = r.mult === 0.25 ? "1/4x" : "1/2x";
          return `
            <div class="multiplier-badge" style="margin-bottom: 0.2rem;">
              <span class="mb-type type-${r.type}">${typeTranslations[r.type]}</span>
              <span class="mb-val ${valClass}">${label}</span>
            </div>
          `;
        }).join("");
      }
      
      middleHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.85rem; width: 100%; padding-top: 0.25rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted); width: 95px; flex-shrink: 0;">Inmunidades:</span>
            <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; flex-grow: 1;">${immunitiesHTML}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-text-muted); width: 95px; flex-shrink: 0;">Resistencias:</span>
            <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; flex-grow: 1;">${resistancesHTML}</div>
          </div>
        </div>
      `;
      
    } else if (activeAnalysisSlide === 2) {
      // --- SLIDE 2: DEBILIDADES ---
      middleLabel = "Debilidades";
      
      const weaknesses = computePokemonWeaknesses(p);
      weaknesses.sort((a, b) => b.mult - a.mult);
      
      if (weaknesses.length === 0) {
        middleHTML = '<span style="font-size: 0.8rem; color: var(--color-text-muted); font-style: italic;">Ninguna</span>';
      } else {
        middleHTML = weaknesses.map(w => {
          const valClass = w.mult === 4 ? "val-4x" : "val-2x";
          const label = w.mult === 4 ? "4x" : "2x";
          return `
            <div class="multiplier-badge">
              <span class="mb-type type-${w.type}">${typeTranslations[w.type]}</span>
              <span class="mb-val ${valClass}">${label}</span>
            </div>
          `;
        }).join("");
      }
    }
    
    row.innerHTML = `
      <div class="pcr-pokemon-info">
        <div class="pcr-poke-header" style="display: flex; align-items: center; gap: 0.6rem; width: 100%;">
          <img class="pcc-sprite" src="${getPokemonSpriteUrl(p)}" alt="${p.name}" onerror="handleImageError(this, '${p.key}')" style="width: 38px; height: 38px; flex-shrink: 0;">
          <div style="text-align: left;">
            <h4 style="margin: 0 0 0.1rem 0; font-size: 0.95rem; line-height: 1.2;">${p.name}</h4>
            <div class="poke-types" style="display: flex; gap: 0.15rem; flex-wrap: wrap;">
              ${getPokemonTypes(p).map(t => `<span class="type-badge type-${t.toLowerCase()}" style="font-size: 0.65rem; padding: 0.05rem 0.35rem;">${typeTranslations[t.toLowerCase()]}</span>`).join("")}
            </div>
          </div>
        </div>
        <div class="pcr-moves-container">
          ${movesHTML}
        </div>
      </div>
      
      <div class="pcr-tables">
        <div class="pcr-table-row">
          ${middleLabel ? `<div class="pcr-table-label">${middleLabel}</div>` : ''}
          <div class="pcr-table-content">
            ${middleHTML}
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(row);
  });
  
  lucide.createIcons();
}

// --- SEARCH MODAL FILTERING & RENDERING ---

function openSearchModal(slotIndex = -1, target = 'team') {
  currentSlotIndex = slotIndex;
  currentSearchTarget = target;
  document.getElementById("search-modal").classList.add("active");
  
  // Clear search input and filters
  document.getElementById("pokemon-search-input").value = "";
  searchQuery = "";
  selectedGen = "all";
  selectedTypes = [];
  
  // Reset filter badge actives
  document.querySelectorAll("#generation-filters .filter-badge").forEach(b => {
    b.classList.remove("active");
    if (b.getAttribute("data-gen") === "all") b.classList.add("active");
  });
  
  document.querySelectorAll("#type-filters .filter-badge").forEach(b => {
    b.classList.remove("active");
  });
  
  filterPokemonResults();
  document.getElementById("pokemon-search-input").focus();
}

function closeSearchModal(event) {
  if (event) event.stopPropagation();
  document.getElementById("search-modal").classList.remove("active");
  currentSlotIndex = -1;
}

function renderTypeFiltersInModal() {
  const container = document.getElementById("type-filters");
  container.innerHTML = "";
  
  const sortedTypes = [...allTypes].sort((a, b) => 
    typeTranslations[a].localeCompare(typeTranslations[b], 'es', { sensitivity: 'base' })
  );

  sortedTypes.forEach(type => {
    const badge = document.createElement("span");
    badge.className = `filter-badge type-filter-badge type-${type}`;
    badge.setAttribute("data-type", type);
    badge.innerText = typeTranslations[type];
    badge.setAttribute("onclick", `toggleTypeFilter('${type}', this)`);
    container.appendChild(badge);
  });
}

function toggleTypeFilter(type, element) {
  const index = selectedTypes.indexOf(type);
  if (index === -1) {
    if (selectedTypes.length >= 2) {
      showToast("Solamente puedes elegir hasta 2 tipos", "error");
      return;
    }
    selectedTypes.push(type);
    element.classList.add("active");
  } else {
    selectedTypes.splice(index, 1);
    element.classList.remove("active");
  }
  filterPokemonResults();
}

function filterByGen(gen) {
  selectedGen = gen;
  
  document.querySelectorAll("#generation-filters .filter-badge").forEach(b => {
    b.classList.remove("active");
    if (b.getAttribute("data-gen") == gen) {
      b.classList.add("active");
    }
  });
  
  filterPokemonResults();
}

// Helper to get types safely (inheriting from baseSpecies for cosmetic forms)
function getPokemonTypes(p) {
  if (!p) return [];
  if (p.types && Array.isArray(p.types) && p.types.length > 0) return p.types;
  if (p.baseSpecies) {
    const baseKey = p.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (typeof POKEDEX !== "undefined" && POKEDEX[baseKey] && POKEDEX[baseKey].types) {
      return POKEDEX[baseKey].types;
    }
  }
  return [];
}

// Helper to determine the generation of a Pokémon or its form
function determinePokemonGen(p, key) {
  if (!p) return 10;
  let num = p.num;
  if (!num && p.baseSpecies) {
    const baseKey = p.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (typeof POKEDEX !== "undefined" && POKEDEX[baseKey] && POKEDEX[baseKey].num) {
      num = POKEDEX[baseKey].num;
    }
  }
  if (!num || num <= 0 || num > 1025) return 10; // Custom/CAP/New at the bottom
  
  if (num >= 1 && num <= 151) return 1;
  if (num >= 152 && num <= 251) return 2;
  if (num >= 252 && num <= 386) return 3;
  if (num >= 387 && num <= 493) return 4;
  if (num >= 494 && num <= 649) return 5;
  if (num >= 650 && num <= 721) return 6;
  if (num >= 722 && num <= 809) return 7;
  if (num >= 810 && num <= 905) return 8;
  if (num >= 906 && num <= 1025) return 9;
  
  return 10;
}

function filterPokemonResults() {
  const container = document.getElementById("search-results-container");
  container.innerHTML = "";
  
  searchQuery = document.getElementById("pokemon-search-input").value.toLowerCase().trim();
  
  const results = [];
  
  Object.keys(POKEDEX).forEach(key => {
    const p = POKEDEX[key];
    
    // Check if matching query
    const matchName = p.name.toLowerCase().includes(searchQuery) || key.includes(searchQuery);
    if (!matchName) return;
    
    // Check if matching types
    if (selectedTypes.length > 0) {
      const pTypes = getPokemonTypes(p).map(t => t.toLowerCase());
      const matchType = selectedTypes.every(t => pTypes.includes(t.toLowerCase()));
      if (!matchType) return;
    }
    
    // Check if matching generation
    if (selectedGen !== "all") {
      const genNum = parseInt(selectedGen);
      const pGen = determinePokemonGen(p, key);
      if (pGen !== genNum) return;
    }
    
    // Exclude custom non-standard forms (Keep "Past" standard forms like Megas!)
    const isNonstandard = p.isNonstandard && (p.isNonstandard === "LGPE" || p.isNonstandard === "Cap" || p.isNonstandard === "Custom");
    const isGmax = p.forme && p.forme.includes("Gmax");
    const isCosplay = p.forme && p.forme.includes("Cosplay");
    
    let pNum = p.num;
    if (!pNum && p.baseSpecies) {
      const baseKey = p.baseSpecies.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (POKEDEX[baseKey] && POKEDEX[baseKey].num) {
        pNum = POKEDEX[baseKey].num;
      }
    }
    
    if (!isNonstandard && !isGmax && !isCosplay && (pNum || 9999) <= 1025) {
      results.push({ ...p, key });
    }
  });
  
  // Sort results by Generation, then by Pokédex Number, then alphabetically by key
  results.sort((a, b) => {
    const genA = determinePokemonGen(a, a.key);
    const genB = determinePokemonGen(b, b.key);
    
    if (genA !== genB) {
      return genA - genB;
    }
    if (a.num !== b.num) {
      return a.num - b.num;
    }
    return a.key.localeCompare(b.key);
  });
  
  // Show message if empty
  if (results.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 2rem 0; text-align: center; color: var(--color-text-muted);">
        No se encontraron Pokémon con los filtros actuales.
      </div>
    `;
    return;
  }
  
  // Render results (Limit to 100 to prevent DOM lag)
  const slicedResults = results.slice(0, 100);
  
  slicedResults.forEach(p => {
    const card = document.createElement("div");
    card.className = "search-result-item";
    card.setAttribute("onclick", `addPokemonToSlot('${p.key}')`);
    
    card.innerHTML = `
      <img class="sri-sprite" src="${getPokemonSpriteUrl(p)}" alt="${p.name}" onerror="handleImageError(this, '${p.key}')">
      <div class="sri-name">${p.name}</div>
      <div class="sri-types">
        ${getPokemonTypes(p).map(t => `<span class="type-badge type-${t.toLowerCase()}">${typeTranslations[t.toLowerCase()]}</span>`).join("")}
      </div>
    `;
    container.appendChild(card);
  });
}

// --- ESCAPE KEY & KEYBOARD LISTENERS ---
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.key === "Esc") {
    const searchModal = document.getElementById("search-modal");
    if (searchModal && searchModal.classList.contains("active")) {
      closeSearchModal();
    }
    const itemModal = document.getElementById("item-modal");
    if (itemModal && itemModal.classList.contains("active")) {
      closeItemModal();
    }
  }
});

// --- SIMULADOR DE BUILDEO LOGIC & STATE ---

const COMPETITIVE_ITEMS = [
  // 1. Objetos de Potenciación de Tipo (Fijos +20%)
  {
    id: "dragon-fang",
    name: "Colmillo Dragón (Dragon Fang)",
    description: "Potencia los movimientos de tipo Dragón un 20%.",
    sprite: "img/items/dragon-fang.png"
  },
  {
    id: "charcoal",
    name: "Carbón (Charcoal)",
    description: "Potencia los movimientos de tipo Fuego un 20%.",
    sprite: "img/items/charcoal.png"
  },
  {
    id: "mystic-water",
    name: "Agua Mística (Mystic Water)",
    description: "Potencia los movimientos de tipo Agua un 20%.",
    sprite: "img/items/mystic-water.png"
  },
  {
    id: "miracle-seed",
    name: "Semilla Milagro (Miracle Seed)",
    description: "Potencia los movimientos de tipo Planta un 20%.",
    sprite: "img/items/miracle-seed.png"
  },
  {
    id: "magnet",
    name: "Imán (Magnet)",
    description: "Potencia los movimientos de tipo Eléctrico un 20%.",
    sprite: "img/items/magnet.png"
  },
  {
    id: "spell-tag",
    name: "Hechizo (Spell Tag)",
    description: "Potencia los movimientos de tipo Fantasma un 20%.",
    sprite: "img/items/spell-tag.png"
  },
  {
    id: "twisted-spoon",
    name: "Cuchara Torcida (Twisted Spoon)",
    description: "Potencia los movimientos de tipo Psíquico un 20%.",
    sprite: "img/items/twisted-spoon.png"
  },
  {
    id: "black-belt",
    name: "Cinturón Negro (Black Belt)",
    description: "Potencia los movimientos de tipo Lucha un 20%.",
    sprite: "img/items/black-belt.png"
  },
  {
    id: "sharp-beak",
    name: "Pico Afilado (Sharp Beak)",
    description: "Potencia los movimientos de tipo Volador un 20%.",
    sprite: "img/items/sharp-beak.png"
  },
  {
    id: "poison-barb",
    name: "Flecha Venenosa (Poison Barb)",
    description: "Potencia los movimientos de tipo Veneno un 20%.",
    sprite: "img/items/poison-barb.png"
  },
  {
    id: "soft-sand",
    name: "Arena Fina (Soft Sand)",
    description: "Potencia los movimientos de tipo Tierra un 20%.",
    sprite: "img/items/soft-sand.png"
  },
  {
    id: "hard-stone",
    name: "Piedra Dura (Hard Stone)",
    description: "Potencia los movimientos de tipo Roca un 20%.",
    sprite: "img/items/hard-stone.png"
  },
  {
    id: "silk-scarf",
    name: "Pañuelo Seda (Silk Scarf)",
    description: "Potencia los movimientos de tipo Normal un 20%.",
    sprite: "img/items/silk-scarf.png"
  },
  {
    id: "silver-powder",
    name: "Plata Alada (Silver Powder)",
    description: "Potencia los movimientos de tipo Bicho un 20%.",
    sprite: "img/items/silver-powder.png"
  },
  {
    id: "black-glasses",
    name: "Gafas de Sol (Black Glasses)",
    description: "Potencia los movimientos de tipo Siniestro un 20%.",
    sprite: "img/items/black-glasses.png"
  },
  {
    id: "metal-coat",
    name: "Revestimiento Metálico (Metal Coat)",
    description: "Potencia los movimientos de tipo Acero un 20%.",
    sprite: "img/items/metal-coat.png"
  },
  {
    id: "never-melt-ice",
    name: "Nevera (Never-Melt Ice)",
    description: "Potencia los movimientos de tipo Hielo un 20%.",
    sprite: "img/items/never-melt-ice.png"
  },
  {
    id: "destiny-knot",
    name: "Lazo Destino (Destiny Knot)",
    description: "Ajustado para potenciar los movimientos de tipo Hada un 20%.",
    sprite: "img/items/destiny-knot.png"
  },

  // 2. Objetos de Elección e Intercambio (Stats +50%)
  {
    id: "choice-band",
    name: "Cinta Elección (Choice Band)",
    description: "Aumenta el Ataque un 50%, pero te bloquea en el primer movimiento usado.",
    sprite: "img/items/choice-band.png"
  },
  {
    id: "choice-specs",
    name: "Gafas Elección (Choice Specs)",
    description: "Aumenta el Ataque Especial un 50%, pero te bloquea en el primer movimiento usado.",
    sprite: "img/items/choice-specs.png"
  },
  {
    id: "choice-scarf",
    name: "Pañuelo Elección (Choice Scarf)",
    description: "Aumenta la Velocidad un 50%, pero te bloquea en el primer movimiento usado.",
    sprite: "img/items/choice-scarf.png"
  },

  // 3. Objetos de Modificación de Daño y Daño Recibido
  {
    id: "life-orb",
    name: "Vidasfera (Life Orb)",
    description: "Daño infligido +30%, consumo de 10% de PS por golpe.",
    sprite: "img/items/life-orb.png"
  },
  {
    id: "expert-belt",
    name: "Cinta Experto (Expert Belt)",
    description: "Aumenta el daño de los ataques súper efectivos en un 20%.",
    sprite: "img/items/expert-belt.png"
  },
  {
    id: "metronome",
    name: "Metrónomo (Metronome)",
    description: "Aumenta la potencia consecutiva un 20% por cada uso consecutivo del mismo movimiento (máximo 100%).",
    sprite: "img/items/metronome.png"
  },
  {
    id: "assault-vest",
    name: "Chaleco Asalto (Assault Vest)",
    description: "Aumenta la Defensa Especial un 50%, pero impide usar movimientos de estado.",
    sprite: "img/items/assault-vest.png"
  },
  {
    id: "weakness-policy",
    name: "Seguro Debilidad (Weakness Policy)",
    description: "Si es golpeado por un ataque súper efectivo, aumenta el Ataque y el Ataque Especial 2 niveles (+100%). Se consume.",
    sprite: "img/items/weakness-policy.png"
  },


  // 4. Objetos de Probabilidad Matemática (RNG)
  {
    id: "quick-claw",
    name: "Garra Rápida (Quick Claw)",
    description: "Otorga un 20% de probabilidad de moverte primero dentro de tu misma prioridad.",
    sprite: "img/items/quick-claw.png"
  },
  {
    id: "kings-rock",
    name: "Roca del Rey (King's Rock)",
    description: "Otorga un 10% de probabilidad de hacer retroceder (flinch) al rival al golpear.",
    sprite: "img/items/kings-rock.png"
  },
  {
    id: "focus-band",
    name: "Cinta Focus (Focus Band)",
    description: "Si el Pokémon va a ser debilitado, hay un 10% de probabilidad de resistir con 1 PS (reutilizable).",
    sprite: "img/items/focus-band.png"
  },
  {
    id: "bright-powder",
    name: "Polvo Brillo (Bright Powder)",
    description: "Reduce la precisión de los movimientos del rival en un 10%.",
    sprite: "img/items/bright-powder.png"
  },
  {
    id: "scope-lens",
    name: "Periscopio (Scope Lens)",
    description: "Aumenta el ratio de golpes críticos del portador en 1 nivel (pasa de 4.17% a 12.5%).",
    sprite: "img/items/scope-lens.png"
  },
  {
    id: "razor-claw",
    name: "Garra Afilada (Razor Claw)",
    description: "Mismo efecto que el Periscopio (+1 nivel de crítico).",
    sprite: "img/items/razor-claw.png"
  },

  // 5. Objetos de Precisión y Turnos
  {
    id: "wide-lens",
    name: "Lente Amplia (Wide Lens)",
    description: "Aumenta la precisión general un 10% multiplicativo.",
    sprite: "img/items/wide-lens.png"
  },
  {
    id: "zoom-lens",
    name: "Lente Zoom (Zoom Lens)",
    description: "Aumenta la precisión un 20% si el portador se mueve de último.",
    sprite: "img/items/zoom-lens.png"
  },
  {
    id: "light-clay",
    name: "Reflejaluz (Light Clay)",
    description: "Extiende la duración de Pantalla de Luz, Reflejo y Velo Aurora de 5 a 8 turnos.",
    sprite: "img/items/light-clay.png"
  },
  {
    id: "damp-rock",
    name: "Roca Lluvia (Damp Rock)",
    description: "Extiende la duración de la Lluvia invocada de 5 a 8 turnos.",
    sprite: "img/items/damp-rock.png"
  },
  {
    id: "heat-rock",
    name: "Roca Calor (Heat Rock)",
    description: "Extiende la duración del Sol invocado de 5 a 8 turnos.",
    sprite: "img/items/heat-rock.png"
  },
  {
    id: "smooth-rock",
    name: "Roca Suave (Smooth Rock)",
    description: "Extiende la duración de la Tormenta de Arena invocada de 5 a 8 turnos.",
    sprite: "img/items/smooth-rock.png"
  },
  {
    id: "icy-rock",
    name: "Roca Helada (Icy Rock)",
    description: "Extiende la duración de la Nieve invocada de 5 a 8 turnos.",
    sprite: "img/items/icy-rock.png"
  },

  // 6. Objetos de Recuperación Pasiva y Curación
  {
    id: "leftovers",
    name: "Restos (Leftovers)",
    description: "Cura 1/16 (6.25%) de los PS máximos al final de cada turno.",
    sprite: "img/items/leftovers.png"
  },
  {
    id: "black-sludge",
    name: "Lodo Negro (Black Sludge)",
    description: "Cura 1/16 de los PS a los tipo Veneno al final de cada turno; daña 1/8 a los demás tipos.",
    sprite: "img/items/black-sludge.png"
  },
  {
    id: "shell-bell",
    name: "Campana Concha (Shell Bell)",
    description: "Recupera en PS el 12.5% del daño provocado al rival.",
    sprite: "img/items/shell-bell.png"
  },
  {
    id: "big-root",
    name: "Raíz Grande (Big Root)",
    description: "Aumenta la curación por drenaje un 30%.",
    sprite: "img/items/big-root.png"
  },
  {
    id: "sitrus-berry",
    name: "Baya Cidra (Sitrus Berry)",
    description: "Cura un 25% de los PS máximos al bajar del 50% de vida. Se consume.",
    sprite: "img/items/sitrus-berry.png"
  },
  {
    id: "lum-berry",
    name: "Baya Ziuela (Lum Berry)",
    description: "Cura cualquier problema de estado al instante. Se consume.",
    sprite: "img/items/lum-berry.png"
  },

  // 7. Objetos de Control y Estado Fijo
  {
    id: "flame-orb",
    name: "Llamasfera (Flame Orb)",
    description: "Quema al portador al final del primer turno.",
    sprite: "img/items/flame-orb.png"
  },
  {
    id: "toxic-orb",
    name: "Toxisfera (Toxic Orb)",
    description: "Envenena gravemente al portador al final del primer turno.",
    sprite: "img/items/toxic-orb.png"
  },
  {
    id: "mental-herb",
    name: "Hierba Mental (Mental Herb)",
    description: "Cura inmediatamente al portador de mofa, atracción u otros efectos mentales. Se consume.",
    sprite: "img/items/mental-herb.png"
  },
  {
    id: "white-herb",
    name: "Hierba Blanca (White Herb)",
    description: "Restaura al instante cualquier estadística que haya sido bajada. Se consume.",
    sprite: "img/items/white-herb.png"
  },
  {
    id: "mirror-herb",
    name: "Hierba Copia (Mirror Herb)",
    description: "Copia los aumentos de estadísticas del rival una sola vez. Se consume.",
    sprite: "img/items/mirror-herb.png"
  },
  {
    id: "clear-amulet",
    name: "Amuleto Puro (Clear Amulet)",
    description: "Protege al portador de que el rival le baje las estadísticas (Inmune a Intimidación, etc.).",
    sprite: "img/items/clear-amulet.png"
  },
  {
    id: "focus-sash",
    name: "Banda Focus (Focus Sash)",
    description: "Resiste con 1 PS si tenías el 100% de vida al recibir un golpe fulminante. Se consume.",
    sprite: "img/items/focus-sash.png"
  },
  {
    id: "eviolite",
    name: "Mineral Evolutivo (Eviolite)",
    description: "Aumenta la Defensa y Defensa Especial en un 50% si el portador aún puede evolucionar.",
    sprite: "img/items/eviolite.png"
  },

  // 7b. Bayas de Protección y Reducción de Daño por Tipo (VGC & Competitivo)
  {
    id: "occa-berry",
    name: "Baya Caqui (Occa Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Fuego. Se consume.",
    sprite: "img/items/occa-berry.png"
  },
  {
    id: "passho-berry",
    name: "Baya Pasho (Passho Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Agua. Se consume.",
    sprite: "img/items/passho-berry.png"
  },
  {
    id: "wacan-berry",
    name: "Baya Gualda (Wacan Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Eléctrico. Se consume.",
    sprite: "img/items/wacan-berry.png"
  },
  {
    id: "rindo-berry",
    name: "Baya Frambu (Rindo Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Planta. Se consume.",
    sprite: "img/items/rindo-berry.png"
  },
  {
    id: "yache-berry",
    name: "Baya Yache (Yache Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Hielo. Se consume.",
    sprite: "img/items/yache-berry.png"
  },
  {
    id: "chople-berry",
    name: "Baya Chople (Chople Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Lucha. Se consume.",
    sprite: "img/items/chople-berry.png"
  },
  {
    id: "kebia-berry",
    name: "Baya Kebia (Kebia Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Veneno. Se consume.",
    sprite: "img/items/kebia-berry.png"
  },
  {
    id: "shuca-berry",
    name: "Baya Shuca (Shuca Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Tierra. Se consume.",
    sprite: "img/items/shuca-berry.png"
  },
  {
    id: "coba-berry",
    name: "Baya Coba (Coba Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Volador. Se consume.",
    sprite: "img/items/coba-berry.png"
  },
  {
    id: "payapa-berry",
    name: "Baya Payapa (Payapa Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Psíquico. Se consume.",
    sprite: "img/items/payapa-berry.png"
  },
  {
    id: "tanga-berry",
    name: "Baya Tanga (Tanga Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Bicho. Se consume.",
    sprite: "img/items/tanga-berry.png"
  },
  {
    id: "charti-berry",
    name: "Baya Charti (Charti Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Roca. Se consume.",
    sprite: "img/items/charti-berry.png"
  },
  {
    id: "kasib-berry",
    name: "Baya Kasib (Kasib Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Fantasma. Se consume.",
    sprite: "img/items/kasib-berry.png"
  },
  {
    id: "haban-berry",
    name: "Baya Haban (Haban Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Dragón. Se consume.",
    sprite: "img/items/haban-berry.png"
  },
  {
    id: "colbur-berry",
    name: "Baya Colbur (Colbur Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Siniestro. Se consume.",
    sprite: "img/items/colbur-berry.png"
  },
  {
    id: "babiri-berry",
    name: "Baya Babiri (Babiri Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Acero. Se consume.",
    sprite: "img/items/babiri-berry.png"
  },
  {
    id: "roseli-berry",
    name: "Baya Roseli (Roseli Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque superefectivo de tipo Hada. Se consume.",
    sprite: "img/items/roseli-berry.png"
  },
  {
    id: "chilan-berry",
    name: "Baya Chilan (Chilan Berry)",
    description: "Reduce a la mitad el daño recibido de un ataque de tipo Normal. Se consume.",
    sprite: "img/items/chilan-berry.png"
  },
  {
    id: "fairy-feather",
    name: "Pluma Hada (Fairy Feather)",
    description: "Potencia los movimientos de tipo Hada un 20%.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "booster-energy",
    name: "Energía Potenciadora (Booster Energy)",
    description: "Activa la habilidad Carga Cuark o Paleosíntesis aumentando la estadística más alta.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "covert-cloak",
    name: "Capa Furtiva (Covert Cloak)",
    description: "Protege al portador de sufrir efectos secundarios de los movimientos del rival.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "loaded-dice",
    name: "Dado Trucado (Loaded Dice)",
    description: "Garantiza que los movimientos de ataque múltiple golpeen 4 o 5 veces.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "punching-glove",
    name: "Guante de Boxeo (Punching Glove)",
    description: "Aumenta la potencia de movimientos de puñetazo un 10% e impide contacto directo.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "ability-shield",
    name: "Escudo Habilidad (Ability Shield)",
    description: "Protege la habilidad del portador contra ser eliminada, modificada o neutralizada.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "safety-goggles",
    name: "Gafas Protectoras (Safety Goggles)",
    description: "Otorga inmunidad a los efectos del clima y a movimientos de polvo o esporas.",
    sprite: "img/items/safety-goggles.png"
  },
  {
    id: "heavy-duty-boots",
    name: "Botas Gruesas (Heavy-Duty Boots)",
    description: "Protege al portador de sufrir daños por trampas de entrada al salir a combate.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "rocky-helmet",
    name: "Casco Dentado (Rocky Helmet)",
    description: "Infringe 1/6 de los PS máximos al rival si realiza un ataque de contacto.",
    sprite: "img/items/rocky-helmet.png"
  },
  {
    id: "air-balloon",
    name: "Globo Helio (Air Balloon)",
    description: "Hace al portador inmune a los ataques de tipo Tierra hasta recibir daño.",
    sprite: "img/items/air-balloon.png"
  },
  {
    id: "eject-pack",
    name: "Mochila Escape (Eject Pack)",
    description: "Hace cambiar al portador si alguna de sus estadísticas disminuye. Se consume.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "throat-spray",
    name: "Spray Bucal (Throat Spray)",
    description: "Aumenta el Ataque Especial 1 nivel tras usar un movimiento de sonido. Se consume.",
    sprite: "img/items/poke-ball.png"
  },
  {
    id: "blastoisinite",
    name: "Blastoisita (Blastoisinite)",
    description: "Permite megaevolucionar a Blastoise en Mega-Blastoise en combate.",
    sprite: "img/items/blastoisite.png"
  },
  {
    id: "scovillainite",
    name: "Scovillainita (Scovillainite)",
    description: "Permite megaevolucionar a Scovillain en Mega-Scovillain en combate.",
    sprite: "img/items/default-mega.png"
  },

  // 8. Bloque Especial: Megapiedras de Champions (Oficiales)
  {
    id: "charizardite-x",
    name: "Charizardita X (Charizardite X)",
    description: "Permite megaevolucionar a Charizard en Mega-Charizard X en combate.",
    sprite: "img/items/charizardite-x.png"
  },
  {
    id: "charizardite-y",
    name: "Charizardita Y (Charizardite Y)",
    description: "Permite megaevolucionar a Charizard en Mega-Charizard Y en combate.",
    sprite: "img/items/charizardite-y.png"
  },
  {
    id: "venusaurite",
    name: "Venusaurita (Venusaurite)",
    description: "Permite megaevolucionar a Venusaur en Mega-Venusaur en combate.",
    sprite: "img/items/venusaurite.png"
  },
  {
    id: "blastoisite",
    name: "Blastoisita (Blastoisite)",
    description: "Permite megaevolucionar a Blastoise en Mega-Blastoise en combate.",
    sprite: "img/items/blastoisite.png"
  },
  {
    id: "beedrillite",
    name: "Beedrillita (Beedrillite)",
    description: "Permite megaevolucionar a Beedrill en Mega-Beedrill en combate.",
    sprite: "img/items/beedrillite.png"
  },
  {
    id: "pidgeotite",
    name: "Pidgeotita (Pidgeotite)",
    description: "Permite megaevolucionar a Pidgeot en Mega-Pidgeot en combate.",
    sprite: "img/items/pidgeotite.png"
  },
  {
    id: "alakazite",
    name: "Alakazamita (Alakazite)",
    description: "Permite megaevolucionar a Alakazam en Mega-Alakazam en combate.",
    sprite: "img/items/alakazite.png"
  },
  {
    id: "gengarite",
    name: "Gengarita (Gengarite)",
    description: "Permite megaevolucionar a Gengar en Mega-Gengar en combate.",
    sprite: "img/items/gengarite.png"
  },
  {
    id: "gyaradosite",
    name: "Gyaradosita (Gyaradosite)",
    description: "Permite megaevolucionar a Gyarados en Mega-Gyarados en combate.",
    sprite: "img/items/gyaradosite.png"
  },
  {
    id: "aerodactylite",
    name: "Aerodactylita (Aerodactylite)",
    description: "Permite megaevolucionar a Aerodactyl en Mega-Aerodactyl en combate.",
    sprite: "img/items/aerodactylite.png"
  },
  {
    id: "ampharosite",
    name: "Ampharosita (Ampharosite)",
    description: "Permite megaevolucionar a Ampharos en Mega-Ampharos en combate.",
    sprite: "img/items/ampharosite.png"
  },
  {
    id: "scizorite",
    name: "Scizorita (Scizorite)",
    description: "Permite megaevolucionar a Scizor en Mega-Scizor en combate.",
    sprite: "img/items/scizorite.png"
  },
  {
    id: "heracronite",
    name: "Heracrossita (Heracronite)",
    description: "Permite megaevolucionar a Heracross en Mega-Heracross en combate.",
    sprite: "img/items/heracronite.png"
  },
  {
    id: "houndoominite",
    name: "Houndoomita (Houndoominite)",
    description: "Permite megaevolucionar a Houndoom en Mega-Houndoom en combate.",
    sprite: "img/items/houndoominite.png"
  },
  {
    id: "tyranitarite",
    name: "Tyranitarita (Tyranitarite)",
    description: "Permite megaevolucionar a Tyranitar en Mega-Tyranitar en combate.",
    sprite: "img/items/tyranitarite.png"
  },
  {
    id: "sceptilite",
    name: "Sceptilita (Sceptilite)",
    description: "Permite megaevolucionar a Sceptile en Mega-Sceptile en combate.",
    sprite: "img/items/sceptilite.png"
  },
  {
    id: "blazikenite",
    name: "Blazikenita (Blazikenite)",
    description: "Permite megaevolucionar a Blaziken en Mega-Blaziken en combate.",
    sprite: "img/items/blazikenite.png"
  },
  {
    id: "swampertite",
    name: "Swampertita (Swampertita)",
    description: "Permite megaevolucionar a Swampert en Mega-Swampert en combate.",
    sprite: "img/items/swampertite.png"
  },
  {
    id: "gardevoirite",
    name: "Gardevoirita (Gardevoirite)",
    description: "Permite megaevolucionar a Gardevoir en Mega-Gardevoir en combate.",
    sprite: "img/items/gardevoirite.png"
  },
  {
    id: "sablenite",
    name: "Sableyeita (Sablenite)",
    description: "Permite megaevolucionar a Sableye en Mega-Sableye en combate.",
    sprite: "img/items/sablenite.png"
  },
  {
    id: "mawilite",
    name: "Mawilita (Mawilite)",
    description: "Permite megaevolucionar a Mawile en Mega-Mawile en combate.",
    sprite: "img/items/mawilite.png"
  },
  {
    id: "aggronite",
    name: "Aggronita (Aggronite)",
    description: "Permite megaevolucionar a Aggron en Mega-Aggron en combate.",
    sprite: "img/items/aggronite.png"
  },
  {
    id: "medichamite",
    name: "Medichamita (Medichamite)",
    description: "Permite megaevolucionar a Medicham en Mega-Medicham en combate.",
    sprite: "img/items/medichamite.png"
  },
  {
    id: "manectrite",
    name: "Manectricita (Manectrite)",
    description: "Permite megaevolucionar a Manectric en Mega-Manectric en combate.",
    sprite: "img/items/manectrite.png"
  },
  {
    id: "sharpedonite",
    name: "Sharpedonita (Sharpedonite)",
    description: "Permite megaevolucionar a Sharpedo en Mega-Sharpedo en combate.",
    sprite: "img/items/sharpedonite.png"
  },
  {
    id: "cameruptite",
    name: "Cameruptita (Cameruptite)",
    description: "Permite megaevolucionar a Camerupt en Mega-Camerupt en combate.",
    sprite: "img/items/cameruptite.png"
  },
  {
    id: "altarianite",
    name: "Altarianita (Altarianite)",
    description: "Permite megaevolucionar a Altaria en Mega-Altaria en combate.",
    sprite: "img/items/altarianite.png"
  },
  {
    id: "banettite",
    name: "Banettita (Banettite)",
    description: "Permite megaevolucionar a Banette en Mega-Banette en combate.",
    sprite: "img/items/banettite.png"
  },
  {
    id: "absolite",
    name: "Absolita (Absolite)",
    description: "Permite megaevolucionar a Absol en Mega-Absol en combate.",
    sprite: "img/items/absolite.png"
  },
  {
    id: "glalitite",
    name: "Glalita (Glalitite)",
    description: "Permite megaevolucionar a Glalie en Mega-Glalie en combate.",
    sprite: "img/items/glalitite.png"
  },
  {
    id: "salamencite",
    name: "Salamencita (Salamencite)",
    description: "Permite megaevolucionar a Salamence en Mega-Salamence en combate.",
    sprite: "img/items/salamencite.png"
  },
  {
    id: "metagrossite",
    name: "Metagrossita (Metagrossite)",
    description: "Permite megaevolucionar a Metagross en Mega-Metagross en combate.",
    sprite: "img/items/metagrossite.png"
  },
  {
    id: "pinsirite",
    name: "Pinsirita (Pinsirite)",
    description: "Permite megaevolucionar a Pinsir en Mega-Pinsir en combate.",
    sprite: "img/items/pinsirite.png"
  },
  {
    id: "garchompite",
    name: "Garchompita (Garchompite)",
    description: "Permite megaevolucionar a Garchomp en Mega-Garchomp en combate.",
    sprite: "img/items/garchompite.png"
  },
  {
    id: "lucarinite",
    name: "Lucarita (Lucarinite)",
    description: "Permite megaevolucionar a Lucario en Mega-Lucario en combate.",
    sprite: "img/items/lucarinite.png"
  },
  {
    id: "lopunnite",
    name: "Lopunnita (Lopunnite)",
    description: "Permite megaevolucionar a Lopunny en Mega-Lopunny en combate.",
    sprite: "img/items/lopunnite.png"
  },
  {
    id: "abomasnowite",
    name: "Abomasnowita (Abomasnowite)",
    description: "Permite megaevolucionar a Abomasnow en Mega-Abomasnow en combate.",
    sprite: "img/items/abomasnowite.png"
  },
  {
    id: "galladite",
    name: "Galladita (Galladite)",
    description: "Permite megaevolucionar a Gallade en Mega-Gallade en combate.",
    sprite: "img/items/galladite.png"
  },
  {
    id: "audinite",
    name: "Audinita (Audinite)",
    description: "Permite megaevolucionar a Audino en Mega-Audino en combate.",
    sprite: "img/items/audinite.png"
  },

  // 9. Bloque Especial: Megapiedras de Champions (Exclusivas Custom)
  {
    id: "raichuite-x",
    name: "Raichuita X (Raichuite X)",
    description: "Permite megaevolucionar a Raichu en Mega-Raichu X en combate.",
    sprite: "img/items/raichuite-x.png"
  },
  {
    id: "raichuite-y",
    name: "Raichuita Y (Raichuite Y)",
    description: "Permite megaevolucionar a Raichu en Mega-Raichu Y en combate.",
    sprite: "img/items/raichuite-y.png"
  },
  {
    id: "dragonitite",
    name: "Dragonitita (Dragonitite)",
    description: "Permite megaevolucionar a Dragonite en Mega-Dragonite en combate.",
    sprite: "img/items/dragonitite.png"
  },
  {
    id: "meganiumite",
    name: "Meganiumita (Meganiumite)",
    description: "Permite megaevolucionar a Meganium en Mega-Meganium en combate.",
    sprite: "img/items/meganiumite.png"
  },
  {
    id: "feraligatrite",
    name: "Feraligatrita (Feraligatrite)",
    description: "Permite megaevolucionar a Feraligatr en Mega-Feraligatr en combate.",
    sprite: "img/items/feraligatrite.png"
  },
  {
    id: "typhlosite",
    name: "Typhlosita (Typhlosite)",
    description: "Permite megaevolucionar a Typhlosion en Mega-Typhlosion en combate.",
    sprite: "img/items/typhlosite.png"
  },
  {
    id: "serperiorite",
    name: "Serperiorita (Serperiorite)",
    description: "Permite megaevolucionar a Serperior en Mega-Serperior en combate.",
    sprite: "img/items/serperiorite.png"
  },
  {
    id: "emboarite",
    name: "Emboarita (Emboarite)",
    description: "Permite megaevolucionar a Emboar en Mega-Emboar en combate.",
    sprite: "img/items/emboarite.png"
  },
  {
    id: "samurottite",
    name: "Samurottita (Samurottite)",
    description: "Permite megaevolucionar a Samurott en Mega-Samurott en combate.",
    sprite: "img/items/samurottite.png"
  },
  {
    id: "greninjite",
    name: "Greninjita (Greninjite)",
    description: "Permite megaevolucionar a Greninja en Mega-Greninja en combate.",
    sprite: "img/items/greninjite.png"
  },
  {
    id: "chesnaughtite",
    name: "Chesnaughtita (Chesnaughtite)",
    description: "Permite megaevolucionar a Chesnaught en Mega-Chesnaught en combate.",
    sprite: "img/items/chesnaughtite.png"
  },
  {
    id: "delphoxite",
    name: "Delphoxita (Delphoxite)",
    description: "Permite megaevolucionar a Delphox en Mega-Delphox en combate.",
    sprite: "img/items/delphoxite.png"
  },
  {
    id: "meowsticite",
    name: "Meowsticita (Meowsticite)",
    description: "Permite megaevolucionar a Meowstic en Mega-Meowstic en combate.",
    sprite: "img/items/meowsticite.png"
  },
  {
    id: "floettite",
    name: "Floettite (Floettite)",
    description: "Permite megaevolucionar a Floette en Mega-Floette en combate.",
    sprite: "img/items/floettite.png"
  },
  {
    id: "garganaclita",
    name: "Garganaclita (Garganaclita)",
    description: "Permite megaevolucionar a Garganacl en Mega-Garganacl en combate.",
    sprite: "img/items/garganaclita.png"
  },
  {
    id: "scovillainita",
    name: "Scovillainita (Scovillainita)",
    description: "Permite megaevolucionar a Scovillain en Mega-Scovillain en combate.",
    sprite: "img/items/scovillainita.png"
  },
  {
    id: "falinksita",
    name: "Falinksita (Falinksita)",
    description: "Permite megaevolucionar a Falinks en Mega-Falinks en combate.",
    sprite: "img/items/falinksita.png"
  },

  // 10. Bloque Especial: Piedras Mega adicionales
  {
    id: "blastoisite",
    name: "Blastoisita (Blastoisite)",
    description: "Permite megaevolucionar a Blastoise en Mega-Blastoise en combate.",
    sprite: "img/items/blastoisite.png"
  },
  {
    id: "clefablite",
    name: "Clefablita (Clefablite)",
    description: "Permite megaevolucionar a Clefable en Mega-Clefable en combate.",
    sprite: "img/items/clefablite.png"
  },
  {
    id: "victreebelite",
    name: "Victreebelita (Victreebelite)",
    description: "Permite megaevolucionar a Victreebel en Mega-Victreebel en combate.",
    sprite: "img/items/victreebelite.png"
  },
  {
    id: "slowbronite",
    name: "Slowbronita (Slowbronite)",
    description: "Permite megaevolucionar a Slowbro en Mega-Slowbro en combate.",
    sprite: "img/items/slowbronite.png"
  },
  {
    id: "kangaskhanite",
    name: "Kangaskhanita (Kangaskhanite)",
    description: "Permite megaevolucionar a Kangaskhan en Mega-Kangaskhan en combate.",
    sprite: "img/items/kangaskhanite.png"
  },
  {
    id: "starminite",
    name: "Starminita (Starminite)",
    description: "Permite megaevolucionar a Starmie en Mega-Starmie en combate.",
    sprite: "img/items/starminite.png"
  },
  {
    id: "dragoninite",
    name: "Dragonitita (Dragonitite)",
    description: "Permite megaevolucionar a Dragonite en Mega-Dragonite en combate.",
    sprite: "img/items/dragoninite.png"
  },
  {
    id: "steelixite",
    name: "Steelixita (Steelixite)",
    description: "Permite megaevolucionar a Steelix en Mega-Steelix en combate.",
    sprite: "img/items/steelixite.png"
  },
  {
    id: "skarmorite",
    name: "Skarmorita (Skarmorite)",
    description: "Permite megaevolucionar a Skarmory en Mega-Skarmory en combate.",
    sprite: "img/items/skarmorite.png"
  },
  {
    id: "chimechite",
    name: "Chimechita (Chimechite)",
    description: "Permite megaevolucionar a Chimecho en Mega-Chimecho en combate.",
    sprite: "img/items/chimechite.png"
  },
  {
    id: "staraptite",
    name: "Staraptita (Staraptite)",
    description: "Permite megaevolucionar a Staraptor en Mega-Staraptor en combate.",
    sprite: "img/items/staraptite.png"
  },
  {
    id: "froslassite",
    name: "Froslassita (Froslassite)",
    description: "Permite megaevolucionar a Froslass en Mega-Froslass en combate.",
    sprite: "img/items/froslassite.png"
  },
  {
    id: "excadrite",
    name: "Excadrillita (Excadrite)",
    description: "Permite megaevolucionar a Excadrill en Mega-Excadrill en combate.",
    sprite: "img/items/excadrite.png"
  },
  {
    id: "scolipite",
    name: "Scolipedita (Scolipite)",
    description: "Permite megaevolucionar a Scolipede en Mega-Scolipede en combate.",
    sprite: "img/items/scolipite.png"
  },
  {
    id: "scraftinite",
    name: "Scraftita (Scraftinite)",
    description: "Permite megaevolucionar a Scrafty en Mega-Scrafty en combate.",
    sprite: "img/items/scraftinite.png"
  },
  {
    id: "eelektrossite",
    name: "Eelektrossita (Eelektrossite)",
    description: "Permite megaevolucionar a Eelektross en Mega-Eelektross en combate.",
    sprite: "img/items/eelektrossite.png"
  },
  {
    id: "chandelurite",
    name: "Chandelurita (Chandelurite)",
    description: "Permite megaevolucionar a Chandelure en Mega-Chandelure en combate.",
    sprite: "img/items/chandelurite.png"
  },
  {
    id: "golurkite",
    name: "Golurkita (Golurkite)",
    description: "Permite megaevolucionar a Golurk en Mega-Golurk en combate.",
    sprite: "img/items/golurkite.png"
  },
  {
    id: "malamarite",
    name: "Malamarita (Malamarite)",
    description: "Permite megaevolucionar a Malamar en Mega-Malamar en combate.",
    sprite: "img/items/malamarite.png"
  },
  {
    id: "barbaracite",
    name: "Barbaraclita (Barbaracite)",
    description: "Permite megaevolucionar a Barbaracle en Mega-Barbaracle en combate.",
    sprite: "img/items/barbaracite.png"
  },
  {
    id: "dragalgite",
    name: "Dragalgita (Dragalgite)",
    description: "Permite megaevolucionar a Dragalge en Mega-Dragalge en combate.",
    sprite: "img/items/dragalgite.png"
  },
  {
    id: "hawluchanite",
    name: "Hawluchanita (Hawluchanite)",
    description: "Permite megaevolucionar a Hawlucha en Mega-Hawlucha en combate.",
    sprite: "img/items/hawluchanite.png"
  },
  {
    id: "crabominite",
    name: "Crabominita (Crabominite)",
    description: "Permite megaevolucionar a Crabominable en Mega-Crabominable en combate.",
    sprite: "img/items/crabominite.png"
  },
  {
    id: "drampanite",
    name: "Drampanita (Drampanite)",
    description: "Permite megaevolucionar a Drampa en Mega-Drampa en combate.",
    sprite: "img/items/drampanite.png"
  },
  {
    id: "glimmoranite",
    name: "Glimmoranita (Glimmoranite)",
    description: "Permite megaevolucionar a Glimmora en Mega-Glimmora en combate.",
    sprite: "img/items/glimmoranite.png"
  }
];

// --- MEGA EVOLUTION HELPERS ---
function isMegaPokemon(p) {
  if (!p) return false;
  const name = p.name || "";
  const key = p.key || "";
  return (p.forme && p.forme.includes("Mega")) || 
         name.includes("-Mega") || 
         key.includes("mega") || 
         !!p.requiredItem;
}

function getMegaStoneIdForPokemon(p) {
  if (!isMegaPokemon(p)) return null;
  
  const req = p.requiredItem ? p.requiredItem.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const name = (p.name || "").toLowerCase();
  const baseName = (p.baseSpecies || p.name || "").toLowerCase().replace(/-mega(-[xyz])?/g, "").replace(/[^a-z0-9]/g, "");
  
  let suffix = "";
  if (name.includes("-mega-x") || name.includes("-x")) suffix = "x";
  if (name.includes("-mega-y") || name.includes("-y")) suffix = "y";
  if (name.includes("-mega-z") || name.includes("-z")) suffix = "z";
  
  // 1. Direct or partial requiredItem match
  if (req) {
    const cleanReq = req.replace(/ite$|ita$|nite$/g, "");
    const directMatch = COMPETITIVE_ITEMS.find(item => {
      const cleanId = item.id.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanIdNoIte = cleanId.replace(/ite$|ita$|nite$/g, "");
      if (cleanId === req || cleanId.includes(cleanReq) || cleanReq.includes(cleanIdNoIte) || cleanIdNoIte.includes(cleanReq)) {
        if (suffix && !cleanId.endsWith(suffix)) return false;
        return true;
      }
      return false;
    });
    if (directMatch) return directMatch.id;
  }
  
  // 2. Base species match
  const cleanBase = baseName.length > 4 ? baseName.substring(0, 5) : baseName;
  const matched = COMPETITIVE_ITEMS.find(item => {
    const cleanId = item.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanId.includes(cleanBase) || baseName.includes(cleanId.replace(/ite$|ita$/g, ""))) {
      if (suffix) {
        return cleanId.endsWith(suffix);
      } else {
        return !cleanId.match(/[xyz]$/);
      }
    }
    return false;
  });
  
  if (matched) return matched.id;
  
  // 3. Fallback search item name
  const fallback = COMPETITIVE_ITEMS.find(item => {
    const itemName = item.name.toLowerCase();
    return itemName.includes(baseName);
  });
  
  if (fallback) return fallback.id;
  
  return null;
}

// Returns the base form key of a Mega Pokémon (e.g. "charizardmegax" -> "charizard")
function getBaseFormKeyForMega(p) {
  if (!p) return null;
  // 1. Prefer a real base species entry in the database
  if (p.baseSpecies && typeof POKEDEX !== "undefined") {
    const base = String(p.baseSpecies).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (POKEDEX[base]) return base;
  }
  // 2. Fallback: strip the "mega"/"megax"/"megay" suffix from the key
  const key = String(p.key || p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stripped = key.replace(/mega[xyz]?$/i, "");
  if (stripped) {
    if (typeof POKEDEX !== "undefined" && POKEDEX[stripped]) return stripped;
    return stripped;
  }
  return key;
}

// Returns the mega form key that a box Pokémon should recover (if any)
function getMegaFormKey(p) {
  if (p && p.megaFormeKey && typeof POKEDEX !== "undefined" && POKEDEX[p.megaFormeKey]) {
    return p.megaFormeKey;
  }
  return null;
}

// Base-form identity used to detect duplicates (a species + its Mega share identity)
function getSpeciesIdentityKey(p) {
  if (!p) return null;
  const hiddenMega = getMegaFormKey(p);
  if (hiddenMega) {
    return getBaseFormKeyForMega(POKEDEX[hiddenMega]);
  }
  return getBaseFormKeyForMega(p) || String(p.key || p.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Object to store in the box when a team Pokémon moves there.
// Megas are stored in their BASE form, keeping the mega key internally.
function buildBoxPokemonFromTeam(p) {
  if (!p) return null;
  if (isMegaPokemon(p)) {
    const baseKey = getBaseFormKeyForMega(p);
    const baseData = (baseKey && typeof POKEDEX !== "undefined" && POKEDEX[baseKey]) || p;
    return {
      ...baseData,
      key: baseKey || p.key,
      selectedAbility: p.selectedAbility || (baseData.abilities ? Object.values(baseData.abilities)[0] : null),
      equippedItem: null,
      selectedMoves: p.selectedMoves || getPokemonDefaultMoves(baseKey || p.key),
      megaFormeKey: (baseKey && baseKey !== p.key) ? p.key : null,
      megaFormeName: p.name
    };
  }
  return { ...p, key: p.key, equippedItem: p.equippedItem || null };
}

// Team object recovered from a box Pokémon, restoring its Mega form when applicable
function resolveTeamPokemonFromBoxPoke(p) {
  if (!p) return null;
  const megKey = getMegaFormKey(p);
  const targetKey = megKey || p.key;
  const targetData = (typeof POKEDEX !== "undefined" && POKEDEX[targetKey]) || p;
  const isMegaTarget = isMegaPokemon({ ...targetData, key: targetKey });
  let equippedItem = p.equippedItem || null;
  if (isMegaTarget) {
    equippedItem = getMegaStoneIdForPokemon({ ...targetData, key: targetKey }) || equippedItem;
  }
  return {
    ...targetData,
    key: targetKey,
    selectedAbility: p.selectedAbility || (targetData.abilities ? Object.values(targetData.abilities)[0] : null),
    equippedItem: equippedItem,
    selectedMoves: p.selectedMoves || getPokemonDefaultMoves(targetKey)
  };
}

// Small symbolic Mega Stone for the box indicator, reusing project item sprites
function getMegaStoneSpriteUrl(p) {
  const megKey = getMegaFormKey(p) || (isMegaPokemon(p) ? p.key : null);
  if (megKey && typeof POKEDEX !== "undefined" && POKEDEX[megKey]) {
    const stoneId = getMegaStoneIdForPokemon({ ...POKEDEX[megKey], key: megKey });
    if (stoneId && typeof COMPETITIVE_ITEMS !== "undefined") {
      const item = COMPETITIVE_ITEMS.find(i => i.id === stoneId);
      if (item && item.sprite) {
        // Always use the local copy so the badge works without internet
        if (item.sprite.startsWith("img/")) return item.sprite;
        const remoteMatch = String(item.sprite).match(/sprites\/items\/([a-z0-9-]+\.png)$/i);
        if (remoteMatch) return "img/items/" + remoteMatch[1];
      }
    }
  }
  return "img/items/default-mega.png";
}

// Whether a box Pokémon has a Mega evolution associated (hidden or direct)
function boxPokemonHasMega(p) {
  if (!p) return false;
  return isMegaPokemon(p) || !!getMegaFormKey(p);
}

// Cleans up all drag & drop visual state
function clearDragVisuals() {
  dragState = null;
  document.querySelectorAll(".dragging-source").forEach(el => el.classList.remove("dragging-source"));
  document.querySelectorAll(".drag-over-target").forEach(el => el.classList.remove("drag-over-target"));
}

/* --- POKÉMON NATURES DATABASE & MATRIX MODAL SYSTEM --- */
const NATURES_DB = {
  // Subir Ataque (+Atk)
  "hardy": { key: "hardy", name: "Seria", EnglishName: "Hardy", plus: null, minus: null },
  "lonely": { key: "lonely", name: "Huraña", EnglishName: "Lonely", plus: "atk", minus: "def" },
  "adamant": { key: "adamant", name: "Firme", EnglishName: "Adamant", plus: "atk", minus: "spa" },
  "naughty": { key: "naughty", name: "Pícara", EnglishName: "Naughty", plus: "atk", minus: "spd" },
  "brave": { key: "brave", name: "Audaz", EnglishName: "Brave", plus: "atk", minus: "spe" },

  // Subir Defensa (+Def)
  "bold": { key: "bold", name: "Osada", EnglishName: "Bold", plus: "def", minus: "atk" },
  "docile": { key: "docile", name: "Dócil", EnglishName: "Docile", plus: null, minus: null },
  "impish": { key: "impish", name: "Agitada", EnglishName: "Impish", plus: "def", minus: "spa" },
  "lax": { key: "lax", name: "Floja", EnglishName: "Lax", plus: "def", minus: "spd" },
  "relaxed": { key: "relaxed", name: "Plácida", EnglishName: "Relaxed", plus: "def", minus: "spe" },

  // Subir At. Esp. (+SpA)
  "modest": { key: "modest", name: "Modesta", EnglishName: "Modest", plus: "spa", minus: "atk" },
  "mild": { key: "mild", name: "Afable", EnglishName: "Mild", plus: "spa", minus: "def" },
  "bashful": { key: "bashful", name: "Rara", EnglishName: "Bashful", plus: null, minus: null },
  "rash": { key: "rash", name: "Alocada", EnglishName: "Rash", plus: "spa", minus: "spd" },
  "quiet": { key: "quiet", name: "Mansa", EnglishName: "Quiet", plus: "spa", minus: "spe" },

  // Subir Def. Esp. (+SpD)
  "calm": { key: "calm", name: "Serena", EnglishName: "Calm", plus: "spd", minus: "atk" },
  "gentle": { key: "gentle", name: "Amable", EnglishName: "Gentle", plus: "spd", minus: "def" },
  "careful": { key: "careful", name: "Cauta", EnglishName: "Careful", plus: "spd", minus: "spa" },
  "quirky": { key: "quirky", name: "Rara", EnglishName: "Quirky", plus: null, minus: null },
  "sassy": { key: "sassy", name: "Grosera", EnglishName: "Sassy", plus: "spd", minus: "spe" },

  // Subir Velocidad (+Spe)
  "timid": { key: "timid", name: "Miedosa", EnglishName: "Timid", plus: "spe", minus: "atk" },
  "hasty": { key: "hasty", name: "Activa", EnglishName: "Hasty", plus: "spe", minus: "def" },
  "jolly": { key: "jolly", name: "Alegre", EnglishName: "Jolly", plus: "spe", minus: "spa" },
  "naive": { key: "naive", name: "Ingenua", EnglishName: "Naive", plus: "spe", minus: "spd" },
  "serious": { key: "serious", name: "Seria", EnglishName: "Serious", plus: null, minus: null }
};

const NATURE_MATRIX_ROWS = [
  { statKey: "atk", label: "Ataque ⇡" },
  { statKey: "def", label: "Defensa ⇡" },
  { statKey: "spa", label: "At. Esp. ⇡" },
  { statKey: "spd", label: "Def. Esp. ⇡" },
  { statKey: "spe", label: "Velocidad ⇡" }
];

const NATURE_MATRIX_COLS = [
  { statKey: "atk", label: "Ataque ⇣" },
  { statKey: "def", label: "Defensa ⇣" },
  { statKey: "spa", label: "At. Esp. ⇣" },
  { statKey: "spd", label: "Def. Esp. ⇣" },
  { statKey: "spe", label: "Velocidad ⇣" }
];

const NATURE_GRID_KEYS = [
  ["hardy",   "lonely",  "adamant", "naughty", "brave"],
  ["bold",    "docile",  "impish",  "lax",     "relaxed"],
  ["modest",  "mild",    "bashful", "rash",    "quiet"],
  ["calm",    "gentle",  "careful", "quirky",  "sassy"],
  ["timid",   "hasty",   "jolly",   "naive",   "serious"]
];

function findNatureKeyByName(nameStr) {
  if (!nameStr) return "hardy";
  const clean = nameStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!clean) return "hardy";

  // 1. Direct match with key, EnglishName, or Spanish name
  for (const [key, info] of Object.entries(NATURES_DB)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanEn = info.EnglishName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanEs = info.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanKey === clean || cleanEn === clean || cleanEs === clean) {
      return key;
    }
  }

  // 2. Partial search match
  for (const [key, info] of Object.entries(NATURES_DB)) {
    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanEn = info.EnglishName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanEs = info.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.includes(cleanKey) || clean.includes(cleanEn) || clean.includes(cleanEs) || cleanEn.includes(clean) || cleanEs.includes(clean)) {
      return key;
    }
  }

  return "hardy";
}

let activeNatureSelectSlotIndex = -1;

function openNatureModal(slotIndex) {
  activeNatureSelectSlotIndex = slotIndex;
  const modal = document.getElementById("nature-modal");
  if (!modal) return;
  
  renderNatureMatrix();
  modal.classList.add("active");
}

function closeNatureModal(event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById("nature-modal");
  if (modal) modal.classList.remove("active");
  activeNatureSelectSlotIndex = -1;
}

function selectNature(natureKey) {
  if (activeNatureSelectSlotIndex < 0 || activeNatureSelectSlotIndex >= 6) return;
  const p = activeTeam[activeNatureSelectSlotIndex];
  if (!p) return;
  
  p.selectedNature = natureKey;
  saveTeamToLocalStorage();
  renderBuildeoTab();
  renderNatureMatrix();
  if (typeof lucide !== "undefined") lucide.createIcons();
  showToast(`Naturaleza cambiada a ${NATURES_DB[natureKey].name} (${NATURES_DB[natureKey].EnglishName})`, "info");
}

function renderNatureMatrix() {
  const container = document.getElementById("nature-matrix-body");
  if (!container) return;
  
  const currentPoke = activeTeam[activeNatureSelectSlotIndex];
  const currentNatureKey = currentPoke ? (currentPoke.selectedNature || "hardy") : "hardy";
  
  let html = "";
  
  NATURE_MATRIX_ROWS.forEach((row, rIdx) => {
    html += `
      <div class="nature-matrix-row">
        <div class="nature-row-label">${row.label}</div>
    `;
    
    NATURE_MATRIX_COLS.forEach((col, cIdx) => {
      const nKey = NATURE_GRID_KEYS[rIdx][cIdx];
      const nInfo = NATURES_DB[nKey];
      const isActive = (nKey === currentNatureKey);
      
      html += `
        <button 
          class="nature-cell-btn ${isActive ? 'active' : ''}" 
          onclick="selectNature('${nKey}')"
          title="${nInfo.name} (${nInfo.EnglishName}): +${row.statKey.toUpperCase()} / -${col.statKey.toUpperCase()}"
        >
          ${nInfo.name}
        </button>
      `;
    });
    
    html += `</div>`;
  });
  
  container.innerHTML = html;
}

let activeItemSelectSlotIndex = -1;
let selectedItemCategory = "all";

function getItemCategory(item) {
  if (!item) return "otros";
  const id = item.id.toLowerCase();
  const name = item.name.toLowerCase();
  
  // MegaPiedras
  if (id.includes("ite") || id.includes("stone") || name.includes("ita") || name.includes("ite")) {
    return "megapiedras";
  }
  
  // Bayas
  if (id.includes("berry") || name.includes("baya")) {
    return "bayas";
  }

  // Prol.Efectos (Clima y Pantallas)
  if (["light-clay", "damp-rock", "heat-rock", "smooth-rock", "icy-rock"].includes(id)) {
    return "prolungacion";
  }

  // Curación
  if (["leftovers", "black-sludge", "shell-bell", "big-root"].includes(id)) {
    return "curacion";
  }

  // Defensa
  if (["focus-sash", "eviolite", "assault-vest", "covert-cloak", "safety-goggles", "heavy-duty-boots", "rocky-helmet", "air-balloon", "ability-shield", "focus-band", "clear-amulet"].includes(id)) {
    return "defensa";
  }

  // Características (Stats, Elección, Modificadores de Estado/Turno)
  if (["choice-band", "choice-specs", "choice-scarf", "white-herb", "mental-herb", "mirror-herb", "weakness-policy", "booster-energy", "eject-pack", "eject-button", "blunder-policy", "throat-spray", "flame-orb", "toxic-orb"].includes(id)) {
    return "caracteristicas";
  }

  // Potencia (Daño o potenciadores de tipo)
  if (["life-orb", "expert-belt", "metronome", "dragon-fang", "charcoal", "mystic-water", "miracle-seed", "magnet", "spell-tag", "twisted-spoon", "black-belt", "sharp-beak", "poison-barb", "soft-sand", "hard-stone", "silk-scarf", "silver-powder", "black-glasses", "metal-coat", "never-melt-ice", "destiny-knot", "fairy-feather", "punching-glove", "loaded-dice"].includes(id)) {
    return "potencia";
  }

  return "otros";
}

function filterItemsByCategory(category) {
  selectedItemCategory = category;
  
  // Actualizar clase activa en los badges de categorías
  const badges = document.querySelectorAll("#item-category-filters .filter-badge");
  badges.forEach(b => {
    if (b.getAttribute("data-category") === category) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });
  
  filterItemsResults();
}

function openItemModal(slotIndex) {
  activeItemSelectSlotIndex = slotIndex;
  document.getElementById("item-modal").classList.add("active");
  
  // Limpiar búsqueda y resetear a categoría 'all'
  document.getElementById("item-search-input").value = "";
  filterItemsByCategory("all");
  
  document.getElementById("item-search-input").focus();
}

function closeItemModal(event) {
  if (event) event.stopPropagation();
  document.getElementById("item-modal").classList.remove("active");
  activeItemSelectSlotIndex = -1;
}

function filterItemsResults() {
  const query = document.getElementById("item-search-input") ? document.getElementById("item-search-input").value.toLowerCase().trim() : "";
  const container = document.getElementById("items-selection-container");
  if (!container) return;
  container.innerHTML = "";
  
  // Get all equipped item IDs on other team members (exclude current editing slot)
  const equippedElsewhere = activeTeam
    .filter((p, idx) => p && idx !== activeItemSelectSlotIndex && p.equippedItem)
    .map(p => p.equippedItem);
  
  const filtered = COMPETITIVE_ITEMS.filter(item => {
    const isEquippedElsewhere = equippedElsewhere.includes(item.id);
    const matchesQuery = item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
    const itemCat = getItemCategory(item);
    const matchesCategory = (selectedItemCategory === "all") || (itemCat === selectedItemCategory);
    
    return !isEquippedElsewhere && matchesQuery && matchesCategory;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 2rem 0; text-align: center; color: var(--color-text-muted);">
        No se encontraron objetos competitivos en esta categoría.
      </div>
    `;
    return;
  }
  
  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "item-select-card";
    card.setAttribute("onclick", `equipItem(${activeItemSelectSlotIndex}, '${item.id}')`);
    card.innerHTML = `
      <img class="item-select-sprite" src="${item.sprite}" alt="${item.name}" onerror="this.src='img/items/poke-ball.png'">
      <div class="item-select-info">
        <div class="item-select-name">${item.name}</div>
        <div class="item-select-desc">${item.description}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

function equipItem(slotIndex, itemId) {
  if (slotIndex < 0 || slotIndex >= 6 || !activeTeam[slotIndex]) return;
  const p = activeTeam[slotIndex];
  if (isMegaPokemon(p)) {
    const megaStoneId = getMegaStoneIdForPokemon(p);
    activeTeam[slotIndex].equippedItem = megaStoneId;
    saveTeamToLocalStorage();
    renderBuildeoTab();
    closeItemModal();
    showToast(`${p.name} combate con su Megapiedra obligatoria`, "info");
    return;
  }
  const item = COMPETITIVE_ITEMS.find(i => i.id === itemId);
  if (item) {
    activeTeam[slotIndex].equippedItem = item.id;
    saveTeamToLocalStorage();
    renderBuildeoTab();
    closeItemModal();
    showToast(`¡${item.name} equipado a ${activeTeam[slotIndex].name}!`, "success");
  }
}

function unequipItem(slotIndex, event) {
  if (event) event.stopPropagation();
  if (slotIndex < 0 || slotIndex >= 6 || !activeTeam[slotIndex]) return;
  const p = activeTeam[slotIndex];
  if (isMegaPokemon(p)) {
    showToast(`Las Megaevoluciones no pueden desequipar su Megapiedra`, "error");
    return;
  }
  
  const oldItemName = activeTeam[slotIndex].equippedItem;
  activeTeam[slotIndex].equippedItem = null;
  saveTeamToLocalStorage();
  renderBuildeoTab();
  
  if (oldItemName) {
    showToast(`Objeto desequipado de ${activeTeam[slotIndex].name}`, "success");
  }
}

function selectAbility(slotIndex, abilityKey) {
  if (slotIndex < 0 || slotIndex >= 6 || !activeTeam[slotIndex]) return;
  
  const p = activeTeam[slotIndex];
  const abilityName = p.abilities[abilityKey];
  p.selectedAbility = abilityName;
  saveTeamToLocalStorage();
  updateUI();
  
  const esAbilityName = ABILITIES_DB[abilityName] || abilityName;
  showToast(`Habilidad '${esAbilityName}' seleccionada para ${p.name}`, "success");
}

function getRecommendedItems(p, slotIndex) {
  if (!p) return [];
  const recs = [];
  
  // Required Item (like Megas)
  if (p.requiredItem) {
    const item = COMPETITIVE_ITEMS.find(i => i.name.toLowerCase().includes(p.requiredItem.toLowerCase()));
    if (item) {
      recs.push(item);
    } else {
      recs.push({
        id: p.requiredItem.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        name: p.requiredItem,
        description: `Objeto necesario para activar la forma de ${p.name}.`,
        sprite: "img/items/mega-ring.png"
      });
    }
  }
  
  // Eviolite for non-fully evolved
  const isNFE = p.evos && p.evos.length > 0;
  if (isNFE || p.tier === "NFE" || p.tier === "LC") {
    const eviolite = COMPETITIVE_ITEMS.find(i => i.id === "eviolite");
    if (eviolite) recs.push(eviolite);
  }
  
  // Black Sludge for Poison
  const pTypes = getPokemonTypes(p);
  const isPoison = pTypes.some(t => t.toLowerCase() === "poison");
  if (isPoison) {
    const sludge = COMPETITIVE_ITEMS.find(i => i.id === "black-sludge");
    if (sludge) recs.push(sludge);
  }
  
  const hp = p.baseStats.hp;
  const def = p.baseStats.def;
  const spd = p.baseStats.spd;
  const atk = p.baseStats.atk;
  const spa = p.baseStats.spa;
  const spe = p.baseStats.spe;
  
  const isBulky = hp >= 80 || def >= 90 || spd >= 90;
  
  if (isBulky) {
    const leftovers = COMPETITIVE_ITEMS.find(i => i.id === "leftovers");
    if (leftovers && !recs.includes(leftovers)) recs.push(leftovers);

  }
  
  const isFastAttacker = spe >= 90 && (atk >= 95 || spa >= 95);
  const isFragile = hp < 75 && def < 75 && spd < 75;
  
  if (isFastAttacker && isFragile) {
    const sash = COMPETITIVE_ITEMS.find(i => i.id === "focus-sash");
    if (sash && !recs.includes(sash)) recs.push(sash);
  }
  
  if (isFastAttacker || spe >= 85) {
    const lifeOrb = COMPETITIVE_ITEMS.find(i => i.id === "life-orb");
    if (lifeOrb && !recs.includes(lifeOrb)) recs.push(lifeOrb);
    
    const scarf = COMPETITIVE_ITEMS.find(i => i.id === "choice-scarf");
    if (scarf && !recs.includes(scarf)) recs.push(scarf);
    
    if (atk > spa) {
      const band = COMPETITIVE_ITEMS.find(i => i.id === "choice-band");
      if (band && !recs.includes(band)) recs.push(band);
    } else {
      const specs = COMPETITIVE_ITEMS.find(i => i.id === "choice-specs");
      if (specs && !recs.includes(specs)) recs.push(specs);
    }
  }
  
  if (atk >= 90 || spa >= 90) {
    const belt = COMPETITIVE_ITEMS.find(i => i.id === "expert-belt");
    if (belt && !recs.includes(belt)) recs.push(belt);
    
    const policy = COMPETITIVE_ITEMS.find(i => i.id === "weakness-policy");
    if (policy && !recs.includes(policy) && isBulky) recs.push(policy);
  }
  
  const lum = COMPETITIVE_ITEMS.find(i => i.id === "lum-berry");
  if (lum && !recs.includes(lum)) recs.push(lum);
  
  const leftovers = COMPETITIVE_ITEMS.find(i => i.id === "leftovers");
  if (leftovers && !recs.includes(leftovers)) recs.push(leftovers);
  
  const vest = COMPETITIVE_ITEMS.find(i => i.id === "assault-vest");
  if (vest && !recs.includes(vest) && (hp >= 70 || spd >= 70)) recs.push(vest);
  
  // Filter out any recommended items that are already equipped by ANOTHER Pokémon on the active team
  const equippedElsewhere = activeTeam
    .filter((member, idx) => member && idx !== slotIndex && member.equippedItem)
    .map(member => member.equippedItem);
    
  let availableRecs = recs.filter(item => !equippedElsewhere.includes(item.id));
  
  // If we have less than 3 recommendations, add type-boosting items matching the Pokémon's types (e.g. Carbón for Fire)
  if (availableRecs.length < 3) {
    const typeBoosters = {
      "fire": "charcoal",
      "water": "mystic-water",
      "grass": "miracle-seed",
      "electric": "magnet",
      "ice": "never-melt-ice",
      "fighting": "black-belt",
      "poison": "poison-barb",
      "ground": "soft-sand",
      "flying": "sharp-beak",
      "psychic": "twisted-spoon",
      "bug": "silver-powder",
      "rock": "hard-stone",
      "ghost": "spell-tag",
      "dragon": "dragon-fang",
      "dark": "black-glasses",
      "steel": "metal-coat",
      "fairy": "destiny-knot"
    };
    
    getPokemonTypes(p).forEach(t => {
      const typeKey = t.toLowerCase();
      const boosterId = typeBoosters[typeKey];
      if (boosterId && !equippedElsewhere.includes(boosterId)) {
        const boosterItem = COMPETITIVE_ITEMS.find(item => item.id === boosterId);
        if (boosterItem && !availableRecs.some(r => r.id === boosterId)) {
          availableRecs.push(boosterItem);
        }
      }
    });
  }
  
  // If we still have less than 3, add general backup fillers (e.g. Metrónomo)
  if (availableRecs.length < 3) {
    const backupFillers = ["metronome", "expert-belt", "life-orb", "leftovers", "lum-berry", "focus-sash", "choice-scarf", "weakness-policy"];
    for (const fillerId of backupFillers) {
      if (availableRecs.length >= 3) break;
      if (!equippedElsewhere.includes(fillerId)) {
        const fillerItem = COMPETITIVE_ITEMS.find(item => item.id === fillerId);
        if (fillerItem && !availableRecs.some(r => r.id === fillerId)) {
          availableRecs.push(fillerItem);
        }
      }
    }
  }
  
  return availableRecs.slice(0, 3);
}

function renderBuildeoTab() {
  const container = document.getElementById("buildeo-grid-container");
  container.innerHTML = "";
  
  for (let i = 0; i < 6; i++) {
    const p = activeTeam[i];
    const card = document.createElement("div");
    card.className = "buildeo-card glass-card";
    card.setAttribute("data-slot", i);
    
    if (p) {
      const isMega = isMegaPokemon(p);
      const megaStoneId = isMega ? getMegaStoneIdForPokemon(p) : null;
      if (isMega && megaStoneId) {
        p.equippedItem = megaStoneId;
      }
      const equippedItemId = p.equippedItem;
      const equippedItem = COMPETITIVE_ITEMS.find(item => item.id === equippedItemId);
      
      const abilities = p.abilities || {};
      const selectedAbilityName = getPokemonActiveAbility(p);
      
      const recommended = getRecommendedItems(p, i);
      
      const stats = p.baseStats || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      const natureKey = p.selectedNature || "hardy";
      const natureInfo = NATURES_DB[natureKey] || NATURES_DB["hardy"];
      
      let atkVal = stats.atk;
      let atkExtra = "";
      if (natureInfo.plus === "atk") {
        atkVal = Math.floor(stats.atk * 1.1);
        atkExtra = `<span style="color: #4ade80; font-size: 0.65rem; font-weight: bold;">(▲)</span>`;
      } else if (natureInfo.minus === "atk") {
        atkVal = Math.floor(stats.atk * 0.9);
        atkExtra = `<span style="color: #f87171; font-size: 0.65rem; font-weight: bold;">(▼)</span>`;
      }

      let defVal = stats.def;
      let defExtra = "";
      if (natureInfo.plus === "def") {
        defVal = Math.floor(stats.def * 1.1);
        defExtra = `<span style="color: #4ade80; font-size: 0.65rem; font-weight: bold;">(▲)</span>`;
      } else if (natureInfo.minus === "def") {
        defVal = Math.floor(stats.def * 0.9);
        defExtra = `<span style="color: #f87171; font-size: 0.65rem; font-weight: bold;">(▼)</span>`;
      }
      if (equippedItemId === "eviolite" && (p.evos && p.evos.length > 0 || p.tier === "NFE" || p.tier === "LC")) {
        defVal = Math.floor(defVal * 1.5);
        defExtra += `<span style="color: var(--accent-green); font-size: 0.65rem;">(+50%)</span>`;
      }

      let spaVal = stats.spa;
      let spaExtra = "";
      if (natureInfo.plus === "spa") {
        spaVal = Math.floor(stats.spa * 1.1);
        spaExtra = `<span style="color: #4ade80; font-size: 0.65rem; font-weight: bold;">(▲)</span>`;
      } else if (natureInfo.minus === "spa") {
        spaVal = Math.floor(stats.spa * 0.9);
        spaExtra = `<span style="color: #f87171; font-size: 0.65rem; font-weight: bold;">(▼)</span>`;
      }

      let spdVal = stats.spd;
      let spdExtra = "";
      if (natureInfo.plus === "spd") {
        spdVal = Math.floor(stats.spd * 1.1);
        spdExtra = `<span style="color: #4ade80; font-size: 0.65rem; font-weight: bold;">(▲)</span>`;
      } else if (natureInfo.minus === "spd") {
        spdVal = Math.floor(stats.spd * 0.9);
        spdExtra = `<span style="color: #f87171; font-size: 0.65rem; font-weight: bold;">(▼)</span>`;
      }
      if (equippedItemId === "assault-vest") {
        spdVal = Math.floor(spdVal * 1.5);
        spdExtra += `<span style="color: var(--accent-green); font-size: 0.65rem;">(+50% Chaleco)</span>`;
      } else if (equippedItemId === "eviolite" && (p.evos && p.evos.length > 0 || p.tier === "NFE" || p.tier === "LC")) {
        spdVal = Math.floor(spdVal * 1.5);
        spdExtra += `<span style="color: var(--accent-green); font-size: 0.65rem;">(+50% Mineral)</span>`;
      }

      let speVal = stats.spe;
      let speExtra = "";
      if (natureInfo.plus === "spe") {
        speVal = Math.floor(stats.spe * 1.1);
        speExtra = `<span style="color: #4ade80; font-size: 0.65rem; font-weight: bold;">(▲)</span>`;
      } else if (natureInfo.minus === "spe") {
        speVal = Math.floor(stats.spe * 0.9);
        speExtra = `<span style="color: #f87171; font-size: 0.65rem; font-weight: bold;">(▼)</span>`;
      }
      if (equippedItemId === "choice-scarf") {
        speVal = Math.floor(speVal * 1.5);
        speExtra += `<span style="color: var(--accent-green); font-size: 0.65rem;">(+50% Pañuelo)</span>`;
      }
      
      card.innerHTML = `
        <div class="buildeo-card-header">
          <div class="buildeo-poke-header-left">
            <img class="buildeo-poke-sprite" src="${getPokemonSpriteUrl(p)}" alt="${p.name}" onerror="handleImageError(this, '${p.key}')">
            <div class="buildeo-poke-info">
              <h3>${p.name}</h3>
              <div class="poke-types">
                ${getPokemonTypes(p).map(t => `<span class="type-badge type-${t.toLowerCase()}">${typeTranslations[t.toLowerCase()]}</span>`).join("")}
              </div>
            </div>
          </div>
        </div>
        
        <div class="buildeo-slider-viewport">
          <div class="buildeo-slider-track" style="transform: translateX(-${activeBuildeoTabSlide * 25}%); width: 400%;">
            
            <!-- DIAPOSITIVA 0 (1/4): MOVIMIENTOS -->
            <div class="buildeo-slide" style="width: 25%;">
              <div class="buildeo-ability-section">
                <span class="buildeo-section-label">Movimientos Pokémon</span>
                <div class="buildeo-moves-list">
                  ${Array.from({ length: 4 }).map((_, moveIdx) => {
                    const moveId = p.selectedMoves && p.selectedMoves[moveIdx];
                    const moveName = moveId ? (MOVES_DB[moveId] || moveId) : "-- Seleccionar --";
                    const selectedClass = moveId ? "selected" : "";
                    const moveDesc = moveId ? (MOVES_DESC[moveId] || "Sin descripción disponible.") : "Selecciona un ataque para este slot.";
                    return `
                      <button class="pcr-move-btn ${selectedClass}" onclick="openMovesModal(${i}, ${moveIdx})" title="${moveDesc}">
                        <span>${moveName}</span>
                        <i data-lucide="chevron-right" style="width: 12px; height: 12px; opacity: 0.5; flex-shrink: 0;"></i>
                      </button>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
            
            <!-- DIAPOSITIVA 1 (2/4): HABILIDADES -->
            <div class="buildeo-slide" style="width: 25%;">
              <div class="buildeo-ability-section">
                <span class="buildeo-section-label">Habilidad Pokémon</span>
                <div class="ability-selector-group" style="display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.4rem;">
                  ${Object.entries(abilities).map(([key, name]) => {
                    const isActive = name === selectedAbilityName;
                    const isHidden = key === "H";
                    const esName = ABILITIES_DB[name] || name;
                    return `
                      <button 
                        class="ability-badge-btn ${isActive ? "active" : ""}" 
                        data-ability-key="${key}"
                        onclick="selectAbility(${i}, '${key}')"
                        style="width: 100%; justify-content: space-between; display: flex; align-items: center; padding: 0.45rem 0.65rem;"
                      >
                        <span style="font-weight: 600;">${esName}</span>
                        ${isHidden ? `<span class="ability-hidden-badge">Oculta</span>` : ""}
                      </button>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>

            <!-- DIAPOSITIVA 2 (3/4): ESTADÍSTICAS Y NATURALEZA -->
            <div class="buildeo-slide" style="width: 25%;">
              <div class="buildeo-stats">
                <div class="stat-item">
                  <span class="stat-label">PS</span>
                  <span class="stat-value">${stats.hp}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Atk</span>
                  <span class="stat-value">${atkVal} ${atkExtra}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Def</span>
                  <span class="stat-value">${defVal} ${defExtra}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Atk Sp</span>
                  <span class="stat-value">${spaVal} ${spaExtra}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Def Sp</span>
                  <span class="stat-value">${spdVal} ${spdExtra}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Vel</span>
                  <span class="stat-value">${speVal} ${speExtra}</span>
                </div>
              </div>

              <div class="buildeo-ability-section" style="margin-top: 0.5rem;">
                <span class="buildeo-section-label">Naturaleza</span>
                <button 
                  class="ability-badge-btn active" 
                  onclick="openNatureModal(${i})"
                  style="width: 100%; justify-content: space-between; display: flex; align-items: center; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.3); padding: 0.45rem 0.65rem;"
                >
                  <span style="font-weight: 700; color: #a5b4fc; display: flex; align-items: center; gap: 0.3rem;"><i data-lucide="compass" style="width: 13px; height: 13px;"></i> ${natureInfo.name} <span style="font-weight: normal; opacity: 0.75; font-size: 0.75rem;">(${natureInfo.EnglishName})</span></span>
                  <span style="font-size: 0.7rem;">
                    ${natureInfo.plus ? `<span style="color:#4ade80; font-weight: bold;">+${natureInfo.plus.toUpperCase()}</span> / <span style="color:#f87171; font-weight: bold;">-${natureInfo.minus.toUpperCase()}</span>` : '<span style="color: var(--color-text-muted);">Neutra</span>'}
                  </span>
                </button>
              </div>
            </div>
            
            <!-- DIAPOSITIVA 3 (4/4): OBJETOS -->
            <div class="buildeo-slide" style="width: 25%;">
              <div class="buildeo-ability-section">
                <span class="buildeo-section-label">Objeto Equipado</span>
                ${isMega ? `
                  <div class="equipped-item-box filled mega-locked-box" onclick="showToast('${p.name} combate con su Megapiedra obligatoria', 'info')" style="cursor: default; border-color: rgba(99, 102, 241, 0.4); background: rgba(99, 102, 241, 0.08);">
                    <div class="item-slot-icon">
                      <img src="${equippedItem ? equippedItem.sprite : 'img/items/mega-ring.png'}" alt="" onerror="this.src='img/items/mega-ring.png'">
                    </div>
                    <div class="item-slot-info">
                      <div class="item-slot-name" style="display: flex; align-items: center; gap: 0.4rem;">
                        ${equippedItem ? equippedItem.name : 'Megapiedra'}
                        <span style="font-size: 0.65rem; background: var(--primary); color: #fff; padding: 0.1rem 0.35rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.2rem;">
                          <i data-lucide="lock" style="width: 10px; height: 10px;"></i> Obligatorio
                        </span>
                      </div>
                      <div class="item-slot-desc">${equippedItem ? equippedItem.description : 'Objeto necesario para megaevolucionar en combate.'}</div>
                    </div>
                  </div>
                ` : equippedItem ? `
                  <div class="equipped-item-box filled" onclick="openItemModal(${i})">
                    <div class="item-slot-icon">
                      <img src="${equippedItem.sprite}" alt="" onerror="this.src='img/items/mega-ring.png'">
                    </div>
                    <div class="item-slot-info">
                      <div class="item-slot-name">${equippedItem.name}</div>
                      <div class="item-slot-desc">${equippedItem.description}</div>
                    </div>
                    <button class="btn-unequip-item" onclick="unequipItem(${i}, event)">
                      <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                  </div>
                ` : `
                  <div class="equipped-item-box" onclick="openItemModal(${i})">
                    <div class="item-slot-icon">
                      <i data-lucide="plus" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div class="item-slot-info">
                      <div class="item-slot-name" style="color: var(--color-text-muted); font-weight: 500;">Sin Objeto</div>
                      <div class="item-slot-desc">Haz clic para equipar un objeto competitivo</div>
                    </div>
                  </div>
                `}
              </div>
              
              <div class="recommended-items-row">
                <span class="buildeo-section-label">Recomendados</span>
                <div class="rec-items-list">
                  ${isMega ? `
                    <div class="rec-item-badge active-mega-badge" style="cursor: default; background: rgba(99, 102, 241, 0.15); border-color: var(--primary);">
                      <img src="${equippedItem ? equippedItem.sprite : 'img/items/mega-ring.png'}" alt="" onerror="this.src='img/items/mega-ring.png'">
                      <span>${equippedItem ? equippedItem.name : 'Megapiedra'}</span>
                    </div>
                  ` : recommended.map(item => `
                    <div class="rec-item-badge" onclick="equipItem(${i}, '${item.id}')">
                      <img src="${item.sprite}" alt="" onerror="this.src='img/items/mega-ring.png'">
                      <span>${item.name.split(" (")[0]}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--color-text-muted); min-height: 250px; border: 2px dashed rgba(255, 255, 255, 0.05); border-radius: var(--radius-lg); cursor: pointer;" onclick="switchTab('builder')">
          <i data-lucide="plus-circle" style="width: 40px; height: 40px; margin-bottom: 0.75rem; color: rgba(255, 255, 255, 0.2);"></i>
          <div style="font-family: var(--font-display); font-weight: 600;">Ranura vacía</div>
          <div style="font-size: 0.8rem; max-width: 200px; margin-top: 0.25rem;">Añade un Pokémon desde el Creador de Equipos</div>
        </div>
      `;
    }
    container.appendChild(card);
  }
  lucide.createIcons();
}

// --- META TEAMS (feed automático meta/teams.json) ---

function getMetaCache() {
  try {
    const raw = localStorage.getItem(META_TEAMS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.teams) || data.teams.length === 0) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function setMetaCache(data) {
  if (!data) return;
  try {
    data.fetchedAt = Date.now();
    localStorage.setItem(META_TEAMS_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("No se pudo guardar la caché del meta", e);
  }
}

function isValidMetaTeam(t) {
  if (!t || typeof t !== "object") return false;
  const hasPokemon = Array.isArray(t.pokemon) && t.pokemon.length >= 4 && t.pokemon.length <= 6;
  if (!hasPokemon) return false;
  return true;
}

function normalizeMetaTeams(teams) {
  const valid = (teams || []).filter(isValidMetaTeam);
  const str = v => (typeof v === "string" ? v : (typeof v === "number" || typeof v === "boolean" ? String(v) : ""));
  return valid.map((t, i) => {
    const hasDetails = Array.isArray(t.details) && t.details.length > 0;
    const hasText = typeof t.pokepasteText === "string" && t.pokepasteText.trim().length > 0;
    return {
      id: str(t.id) || ("META-" + String(i + 1).padStart(4, "0")),
      description: str(t.description) || str(t.event) || str(t.creator) || "Equipo del meta",
      creator: str(t.creator) || "Desconocido",
      pokemon: (t.pokemon || []).slice(0, 6),
      details: hasDetails ? t.details.slice(0, 6) : [],
      pokepasteText: hasText ? t.pokepasteText : "",
      pokepaste: str(t.pokepaste) || "",
      sourceUrl: str(t.sourceUrl) || "",
      event: str(t.event) || "",
      placement: t.placement != null ? t.placement : null,
      stats: t.stats && typeof t.stats === "object" ? t.stats : null,
      hasFullTeam: hasDetails || hasText
    };
  });
}

function getMetaTeamBadges(team) {
  const badges = [];
  if (team.placement && Number(team.placement) > 0) {
    const place = Number(team.placement);
    badges.push(place === 1 ? "🏆 Campeón" : `🏆 Top ${place}`);
  }
  if (team.stats && typeof team.stats.usage === "number") {
    if (team.stats.usage >= 15) badges.push("🔥 Meta actual");
    else if (team.stats.usage > 0) badges.push("📈 Popular");
  }
  if (team.placement == null && team.stats == null) badges.push("🆕 Reciente");
  if (!team.hasFullTeam) badges.push("📝 Solo especies");
  return badges;
}

function timeAgoLabel(ts) {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  if (diffMs < 60000) return "hace <1 min";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function updateMetaBadge(mode, ts) {
  const el = document.getElementById("meta-status-badge");
  if (!el) return;
  let text = "";
  if (mode === "loading") text = "Actualizando meta... ⏳";
  else if (mode === "remote") text = `Meta actualizado ${timeAgoLabel(ts)}`;
  else if (mode === "cache") text = "Meta en caché";
  else text = "Modo offline";
  el.textContent = text;
}

let metaFetchInFlight = false;

async function initMetaTeams(force) {
  if (metaTeamsState.inited && !force) {
    updateMetaBadge(metaTeamsState.mode, metaTeamsState.updatedAt);
    renderPresetsPage(ACTIVE_PRESET_TEAMS);
    return;
  }
  if (metaFetchInFlight) return;

  metaFetchInFlight = true;
  updateMetaBadge("loading");

  const cache = getMetaCache();
  let remote = null;

  try {
    const res = await fetch(META_TEAMS_URL, { cache: "no-store" });
    if (res.ok) {
      const raw = await res.text();
      const data = JSON.parse(raw);
      const teams = normalizeMetaTeams(data.teams);
      if (Array.isArray(data.teams) && teams.length > 0) {
        remote = { data, teams };
      }
    }
  } catch (e) {
    console.warn("No se pudo cargar el meta remoto:", e);
  }

  metaFetchInFlight = false;

  if (remote) {
    setMetaCache(remote.data);
    ACTIVE_PRESET_TEAMS = remote.teams;
    metaTeamsState = { inited: true, mode: "remote", teams: ACTIVE_PRESET_TEAMS, updatedAt: Date.now() };
    updateMetaBadge("remote", Date.now());
    showToast(`Meta actualizado: ${ACTIVE_PRESET_TEAMS.length} equipos desde el feed`, "success");
  } else {
    // Cache válida: nunca se descarta por un fallo de red
    const cachedTeams = cache ? normalizeMetaTeams(cache.teams) : [];
    if (cachedTeams.length > 0) {
      ACTIVE_PRESET_TEAMS = cachedTeams;
      metaTeamsState = { inited: true, mode: "cache", teams: ACTIVE_PRESET_TEAMS, updatedAt: cache.fetchedAt || Date.now() };
      updateMetaBadge("cache");
    } else {
      ACTIVE_PRESET_TEAMS = (typeof PRESET_TEAMS !== "undefined") ? PRESET_TEAMS : [];
      metaTeamsState = { inited: true, mode: "local", teams: ACTIVE_PRESET_TEAMS, updatedAt: null };
      updateMetaBadge("local");
    }
  }

  renderPresetsPage(ACTIVE_PRESET_TEAMS);
  if (!metaTeamsState || (metaTeamsState.mode === "local")) {
    showToast("Sin datos remotos. Mostrando plantillas locales.", "info");
  }
}

async function refreshMetaNow() {
  metaTeamsState.inited = false;
  await initMetaTeams(true);
}

// --- VGC PRESET TEAMS PAGE SYSTEM ---

function renderPresetsPage(teamsList) {
  const container = document.getElementById("presets-page-container");
  if (!container) return;
  container.innerHTML = "";
  
  if (teamsList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--color-text-muted); padding: 2rem; font-style: italic;">
        No se encontraron plantillas coincidentes.
      </div>
    `;
    return;
  }
  
  teamsList.forEach(team => {
    const card = document.createElement("div");
    card.className = "preset-select-card";
    card.setAttribute("onclick", `loadPresetTeam('${jsStringForAttr(team.id)}')`);
    
    // Process mini sprites list
    const pokesHTML = (team.pokemon || []).map(name => {
      const nameStr = String(name || "");
      const key = findPokedexKeyByName(nameStr);
      let matchedData = POKEDEX[key];
      if (!matchedData) {
        matchedData = { name: nameStr, key: nameStr.toLowerCase().replace(/[^a-z0-9]/g, "") };
      } else {
        matchedData = { ...matchedData, key: key };
      }
      return `
        <div class="preset-poke-mini" title="${escapeHtml(nameStr)}">
          <img src="${getPokemonSpriteUrl(matchedData)}" alt="${escapeHtml(nameStr)}" onerror="handleImageError(this, '${matchedData.key}')">
          <span class="preset-poke-mini-name">${escapeHtml(String(matchedData.name || "").split("-")[0])}</span>
        </div>
      `;
    }).join("");
    
    const badges = getMetaTeamBadges(team);
    
    const description = escapeHtml(team.description || "Equipo del meta");
    const creator = escapeHtml(team.creator || "Desconocido");
    const sourceUrl = safeHttpUrl(team.sourceUrl);
    const pokepasteUrl = safeHttpUrl(team.pokepaste);
    
    card.innerHTML = `
      <div class="preset-card-header">
        <span class="preset-card-title">${description}</span>
        ${badges.length ? `<div class="preset-card-badges">${badges.map(b => `<span class="preset-card-badge">${b}</span>`).join("")}</div>` : ""}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: -0.25rem;">
        <span class="preset-card-creator">Creador: <strong>${creator}</strong></span>
        <span>
          ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="font-size: 0.7rem; color: var(--color-text-highlight); text-decoration: none;">Fuente <i data-lucide="external-link" style="width: 10px; height: 10px; display: inline-block;"></i></a>` : ""}
          ${pokepasteUrl ? `<a href="${escapeHtml(pokepasteUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="font-size: 0.7rem; color: var(--color-text-highlight); text-decoration: none; margin-left: 0.5rem;">Pokepaste <i data-lucide="external-link" style="width: 10px; height: 10px; display: inline-block;"></i></a>` : ""}
        </span>
      </div>
      <div class="preset-card-pokes">
        ${pokesHTML}
      </div>
    `;
    container.appendChild(card);
  });
  
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function filterPresetsPageResults() {
  const query = document.getElementById("presets-page-search-input").value.toLowerCase().trim();
  if (!query) {
    renderPresetsPage(ACTIVE_PRESET_TEAMS);
    return;
  }
  
  const filtered = ACTIVE_PRESET_TEAMS.filter(team => {
    const matchDesc = (team.description || "").toLowerCase().includes(query);
    const matchCreator = (team.creator || "").toLowerCase().includes(query);
    const matchPoke = (team.pokemon || []).some(p => String(p || "").toLowerCase().includes(query));
    return matchDesc || matchCreator || matchPoke;
  });
  
  renderPresetsPage(filtered);
}

// --- SHOWDOWN TEXT / PASTE IMPORT SYSTEM ---

function openImportModal() {
  document.getElementById("import-modal").classList.add("active");
  document.getElementById("import-team-textarea").value = "";
  document.getElementById("import-team-textarea").focus();
}

function closeImportModal(event) {
  if (event) event.stopPropagation();
  document.getElementById("import-modal").classList.remove("active");
}

function parseShowdownPaste(pasteText) {
  if (!pasteText || !pasteText.trim()) return [];
  
  const pokemonBlocks = pasteText.split(/\n\s*\n/);
  const parsedTeam = [];
  
  for (const block of pokemonBlocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;
    
    let speciesName = "";
    let itemName = "";
    let abilityName = "";
    let natureName = "";
    const moves = [];
    
    const firstLine = lines[0];
    const atSplit = firstLine.split('@');
    
    let namePart = atSplit[0].trim();
    if (atSplit.length > 1) {
      itemName = atSplit[1].trim();
    }
    
    const parenMatch = namePart.match(/\(([^)]+)\)/);
    if (parenMatch) {
      const inside = parenMatch[1].trim();
      if (inside === 'M' || inside === 'F') {
        speciesName = namePart.replace(/\((M|F)\)/, '').trim();
      } else {
        speciesName = inside;
      }
    } else {
      speciesName = namePart;
    }
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().startsWith('ability:') || line.toLowerCase().startsWith('habilidad:')) {
        abilityName = line.replace(/ability:/i, '').replace(/habilidad:/i, '').trim();
      } else if (line.toLowerCase().includes('nature') || line.toLowerCase().includes('naturaleza')) {
        natureName = line.replace(/nature/i, '').replace(/naturaleza/i, '').replace(/[:\-]/g, '').trim();
      } else if (line.startsWith('-')) {
        const moveName = line.replace(/^-+\s*/, '').trim();
        if (moveName && moves.length < 4) {
          moves.push(moveName);
        }
      }
    }
    
    if (speciesName) {
      parsedTeam.push({
        speciesName,
        itemName,
        abilityName,
        natureName,
        moves
      });
    }
  }
  
  return parsedTeam;
}

function findMoveIdByName(moveNameStr) {
  if (!moveNameStr) return null;
  const clean = moveNameStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  if (typeof MOVES_DB !== "undefined" && MOVES_DB[clean]) return clean;
  
  if (typeof MOVES_DB !== "undefined") {
    for (const [id, name] of Object.entries(MOVES_DB)) {
      const cleanDbName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanDbName === clean || id === clean) {
        return id;
      }
    }
  }
  return clean;
}

function findItemKeyByName(itemStr) {
  if (!itemStr) return null;
  const clean = itemStr.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  const found = COMPETITIVE_ITEMS.find(item => {
    const cleanId = item.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanName = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return cleanId === clean || cleanName.includes(clean) || clean.includes(cleanId);
  });
  
  return found ? found.id : null;
}

async function fetchPokepasteUrl(pokepasteUrl) {
  if (!pokepasteUrl) return null;
  
  let cleanUrl = pokepasteUrl.trim();
  if (!cleanUrl.startsWith("http")) {
    cleanUrl = `https://pokepast.es/${cleanUrl}`;
  }
  
  try {
    let htmlText = "";
    
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(cleanUrl, { signal: controller.signal });
        if (response.ok) {
          htmlText = await response.text();
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      console.warn("Direct Poképaste fetch failed, trying CORS proxy...", e);
    }
    
    if (!htmlText) {
      const proxyController = new AbortController();
      const proxyTimer = setTimeout(() => proxyController.abort(), 20000);
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
        const proxyResponse = await fetch(proxyUrl, { signal: proxyController.signal });
        if (proxyResponse.ok) {
          htmlText = await proxyResponse.text();
        }
      } finally {
        clearTimeout(proxyTimer);
      }
    }
    
    if (!htmlText) return null;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const preElements = doc.querySelectorAll("article pre");
    
    if (!preElements || preElements.length === 0) return null;
    
    const pasteBlocks = [];
    preElements.forEach(pre => {
      let text = pre.innerText || pre.textContent || "";
      text = text.trim();
      if (text) pasteBlocks.push(text);
    });
    
    return parseShowdownPaste(pasteBlocks.join("\n\n"));
  } catch (err) {
    console.error("Error fetching Poképaste from URL:", err);
    return null;
  }
}

async function importTeamFromPokepasteUrl() {
  const urlInput = document.getElementById("import-pokepaste-url");
  if (!urlInput || !urlInput.value.trim()) {
    showToast("Por favor ingresa una URL de Poképaste válida", "error");
    return;
  }
  
  showToast("Obteniendo equipo de Poképaste... ⏳", "info");
  const parsed = await fetchPokepasteUrl(urlInput.value.trim());
  
  if (!parsed || parsed.length === 0) {
    showToast("No se pudo descargar o extraer la lista de Poképaste", "error");
    return;
  }
  
  activeTeam = [null, null, null, null, null, null];
  let importedCount = 0;
  
  parsed.forEach((item, index) => {
    if (index >= 6) return;
    let key = findPokedexKeyByName(item.speciesName);
    if (item.itemName && (item.itemName.toLowerCase().includes("ite") || item.itemName.toLowerCase().includes("ita"))) {
      const cleanKey = key ? key.replace(/mega$/i, "") : "";
      if (cleanKey && POKEDEX[cleanKey + "mega"]) {
        key = cleanKey + "mega";
      }
    }
    
    if (key && POKEDEX[key]) {
      const dbPoke = POKEDEX[key];
      const isMega = isMegaPokemon(dbPoke);
      
      let equippedItem = isMega ? getMegaStoneIdForPokemon(dbPoke) : (findItemKeyByName(item.itemName) || null);
      if (key.toLowerCase().includes("charizard") && !equippedItem) {
        equippedItem = "charizardite-y";
      }
      
      let selectedAbility = dbPoke.abilities ? (dbPoke.abilities["0"] || dbPoke.abilities["H"] || "") : "";
      if (item.abilityName && dbPoke.abilities) {
        const cleanAbility = item.abilityName.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const [aKey, aName] of Object.entries(dbPoke.abilities)) {
          const cleanAName = aName.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanAName === cleanAbility || cleanAName.includes(cleanAbility)) {
            selectedAbility = aName;
            break;
          }
        }
      }
      
      const defaultMoves = getPokemonDefaultMoves(key);
      const selectedMoves = [null, null, null, null];
      if (Array.isArray(item.moves)) {
        item.moves.forEach((mName, mIdx) => {
          if (mIdx < 4) {
            selectedMoves[mIdx] = findMoveIdByName(mName);
          }
        });
      }
      for (let mIdx = 0; mIdx < 4; mIdx++) {
        if (!selectedMoves[mIdx]) {
          selectedMoves[mIdx] = defaultMoves[mIdx] || null;
        }
      }
      
      const selectedNature = item.natureName ? findNatureKeyByName(item.natureName) : "hardy";
      
      activeTeam[index] = {
        ...dbPoke,
        key: key,
        selectedAbility: selectedAbility,
        selectedNature: selectedNature,
        equippedItem: equippedItem,
        selectedMoves: selectedMoves
      };
      importedCount++;
    }
  });
  
  if (importedCount > 0) {
    closeImportModal();
    saveTeamToLocalStorage();
    updateUI();
    showToast(`¡Se importaron ${importedCount} Pokémon desde Poképaste con sus Objetos, Naturalezas y Movimientos! 🚀`, "success");
  } else {
    showToast("No se pudo procesar la información del equipo", "error");
  }
}

function importTeamFromText() {
  const text = document.getElementById("import-team-textarea").value;
  const parsed = parseShowdownPaste(text);
  
  if (!parsed || parsed.length === 0) {
    showToast("No se detectaron Pokémon válidos en el texto", "error");
    return;
  }
  
  activeTeam = [null, null, null, null, null, null];
  let importedCount = 0;
  
  parsed.forEach((item, index) => {
    if (index >= 6) return;
    
    let key = findPokedexKeyByName(item.speciesName);
    
    if (item.itemName && (item.itemName.toLowerCase().includes("ite") || item.itemName.toLowerCase().includes("ita"))) {
      const cleanKey = key ? key.replace(/mega$/i, "") : "";
      if (cleanKey && POKEDEX[cleanKey + "mega"]) {
        key = cleanKey + "mega";
      }
    }
    
    if (key && POKEDEX[key]) {
      const dbPoke = POKEDEX[key];
      const isMega = isMegaPokemon(dbPoke);
      
      let equippedItem = isMega ? getMegaStoneIdForPokemon(dbPoke) : (findItemKeyByName(item.itemName) || null);
      if (key.toLowerCase().includes("charizard") && !equippedItem) {
        equippedItem = "charizardite-y";
      }
      
      let selectedAbility = dbPoke.abilities ? (dbPoke.abilities["0"] || dbPoke.abilities["H"] || "") : "";
      if (item.abilityName && dbPoke.abilities) {
        const cleanAbility = item.abilityName.toLowerCase().replace(/[^a-z0-9]/g, "");
        for (const [aKey, aName] of Object.entries(dbPoke.abilities)) {
          const cleanAName = aName.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cleanEsName = (typeof ABILITIES_DB !== "undefined" && ABILITIES_DB[aName] ? ABILITIES_DB[aName] : "").toLowerCase().replace(/[^a-z0-9]/g, "");
          if (cleanAName === cleanAbility || cleanEsName === cleanAbility || cleanAName.includes(cleanAbility)) {
            selectedAbility = aName;
            break;
          }
        }
      }
      
      const defaultMoves = getPokemonDefaultMoves(key);
      const selectedMoves = [null, null, null, null];
      if (Array.isArray(item.moves)) {
        item.moves.forEach((mName, mIdx) => {
          if (mIdx < 4) {
            selectedMoves[mIdx] = findMoveIdByName(mName);
          }
        });
      }
      for (let mIdx = 0; mIdx < 4; mIdx++) {
        if (!selectedMoves[mIdx]) {
          selectedMoves[mIdx] = defaultMoves[mIdx] || null;
        }
      }
      
      const selectedNature = item.natureName ? findNatureKeyByName(item.natureName) : "hardy";
      
      activeTeam[index] = {
        ...dbPoke,
        key: key,
        selectedAbility: selectedAbility,
        selectedNature: selectedNature,
        equippedItem: equippedItem,
        selectedMoves: selectedMoves
      };
      importedCount++;
    }
  });
  
  if (importedCount > 0) {
    closeImportModal();
    saveTeamToLocalStorage();
    updateUI();
    showToast(`¡Se importaron ${importedCount} Pokémon con sus Movimientos, Habilidades y Objetos! 🚀`, "success");
  } else {
    showToast("No se pudo coincidir ningún Pokémon de la lista", "error");
  }
}

let LOCAL_ALL_TEAMS_CACHE = null;

async function fetchLocalRepositoryText() {
  if (LOCAL_ALL_TEAMS_CACHE !== null) return LOCAL_ALL_TEAMS_CACHE;
  try {
    const res = await fetch("AllTeams.txt");
    if (res.ok) {
      LOCAL_ALL_TEAMS_CACHE = await res.text();
      return LOCAL_ALL_TEAMS_CACHE;
    }
  } catch (e) {
    console.warn("No se pudo cargar AllTeams.txt local", e);
  }
  return "";
}

async function getLocalTeamPokepasteText(team) {
  const repo = await fetchLocalRepositoryText();
  if (repo && repo.trim().length > 0) {
    const searchTitle = team.description || team.name || team.id;
    const lines = repo.split(/\r?\n/);
    let capturing = false;
    let textLines = [];

    for (let line of lines) {
      if (line.startsWith("===")) {
        if (capturing) break;
        if (line.includes(searchTitle) || (team.creator && line.includes(team.creator))) {
          capturing = true;
          continue;
        }
      } else if (capturing) {
        textLines.push(line);
      }
    }

    const result = textLines.join("\n").trim();
    if (result.length > 20) return result;
  }

  // Fallback a team.details si no estuviera en AllTeams.txt
  if (team.details && team.details.length > 0) {
    return team.details.map(mon => {
      let line = `${mon.species}${mon.item ? ' @ ' + mon.item : ''}\n`;
      if (mon.ability) line += `Ability: ${mon.ability}\n`;
      if (mon.teraType) line += `Tera Type: ${mon.teraType}\n`;
      if (mon.nature) line += `${mon.nature} Nature\n`;
      if (mon.evs) line += `EVs: ${mon.evs}\n`;
      if (mon.ivs) line += `IVs: ${mon.ivs}\n`;
      if (Array.isArray(mon.moves)) {
        mon.moves.forEach(m => line += `- ${m}\n`);
      }
      return line;
    }).join("\n");
  }

  return null;
}

async function loadPresetTeam(teamId) {
  const team = ACTIVE_PRESET_TEAMS.find(t => t.id === teamId);
  if (!team) return;
  try {
  
  activeTeam = [null, null, null, null, null, null];
  let parsed = null;
  
  showToast("Cargando equipo... ⏳", "info");
  
  // 1. Texto completo incrustado en el propio equipo (meta/teams.json o plantilla)
  if (team.pokepasteText) {
    parsed = parseShowdownPaste(team.pokepasteText);
    if (!parsed) parsed = [];
  }
  
  // 2. Fallback al repositorio local AllTeams.txt
  if (!parsed || parsed.length === 0) {
    const localText = await getLocalTeamPokepasteText(team);
    if (localText) {
      parsed = parseShowdownPaste(localText);
      if (!parsed) parsed = [];
    }
  }
  
  if (parsed && parsed.length > 0) {
    let importedCount = 0;
    parsed.forEach((item, index) => {
      if (index >= 6) return;
      
      let key = findPokedexKeyByName(item.speciesName);
      if (item.itemName && (item.itemName.toLowerCase().includes("ite") || item.itemName.toLowerCase().includes("ita"))) {
        const cleanKey = key ? key.replace(/mega$/i, "") : "";
        if (cleanKey && POKEDEX[cleanKey + "mega"]) {
          key = cleanKey + "mega";
        }
      }
      
      if (key && POKEDEX[key]) {
        const dbPoke = POKEDEX[key];
        const isMega = isMegaPokemon(dbPoke);
        
        let equippedItem = isMega ? getMegaStoneIdForPokemon(dbPoke) : (findItemKeyByName(item.itemName) || null);
        if (key.toLowerCase().includes("charizard") && !equippedItem) {
          equippedItem = "charizardite-y";
        }
        
        let selectedAbility = dbPoke.abilities ? (dbPoke.abilities["0"] || dbPoke.abilities["H"] || "") : "";
        if (item.abilityName && dbPoke.abilities) {
          const cleanAbility = item.abilityName.toLowerCase().replace(/[^a-z0-9]/g, "");
          for (const [aKey, aName] of Object.entries(dbPoke.abilities)) {
            const cleanAName = aName.toLowerCase().replace(/[^a-z0-9]/g, "");
            const cleanEsName = (typeof ABILITIES_DB !== "undefined" && ABILITIES_DB[aName] ? ABILITIES_DB[aName] : "").toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanAName === cleanAbility || cleanEsName === cleanAbility || cleanAName.includes(cleanAbility)) {
              selectedAbility = aName;
              break;
            }
          }
        }
        
        const defaultMoves = getPokemonDefaultMoves(key);
        const selectedMoves = [null, null, null, null];
        if (item.moves) {
          item.moves.forEach((mName, mIdx) => {
            if (mIdx < 4) {
              selectedMoves[mIdx] = findMoveIdByName(mName);
            }
          });
        }
        for (let mIdx = 0; mIdx < 4; mIdx++) {
          if (!selectedMoves[mIdx]) {
            selectedMoves[mIdx] = defaultMoves[mIdx] || null;
          }
        }
        
        const selectedNature = item.natureName ? findNatureKeyByName(item.natureName) : "hardy";
        
        activeTeam[index] = {
          ...dbPoke,
          key: key,
          selectedAbility: selectedAbility,
          selectedNature: selectedNature,
          equippedItem: equippedItem,
          selectedMoves: selectedMoves
        };
        importedCount++;
      }
    });
    
    if (importedCount > 0) {
      saveTeamToLocalStorage();
      updateUI();
      switchTab('builder');
      showToast(`¡Equipo VGC ${team.creator ? "de " + team.creator + " " : ""}cargado! 🚀`, "success");
      return;
    }
  }
  
  if (team.details && team.details.length > 0) {
    team.details.forEach((detail, index) => {
      if (index >= 6) return;
      const key = findPokedexKeyByName(detail.species);
      if (key && POKEDEX[key]) {
        const dbPoke = POKEDEX[key];
        const isMega = isMegaPokemon(dbPoke);
        
        let equippedItem = isMega ? getMegaStoneIdForPokemon(dbPoke) : (findItemKeyByName(detail.item) || null);
        if (key.toLowerCase().includes("charizard") && !equippedItem) {
          equippedItem = "charizardite-y";
        }
        
        let selectedAbility = dbPoke.abilities ? (dbPoke.abilities["0"] || dbPoke.abilities["H"] || "") : "";
        if (detail.ability && dbPoke.abilities) {
          const cleanAbility = detail.ability.toLowerCase().replace(/[^a-z0-9]/g, "");
          for (const [aKey, aName] of Object.entries(dbPoke.abilities)) {
            const cleanAName = aName.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (cleanAName === cleanAbility || cleanAName.includes(cleanAbility)) {
              selectedAbility = aName;
              break;
            }
          }
        }
        
        const defaultMoves = getPokemonDefaultMoves(key);
        const selectedMoves = [null, null, null, null];
        if (Array.isArray(detail.moves)) {
          detail.moves.forEach((mName, mIdx) => {
            if (mIdx < 4) {
              selectedMoves[mIdx] = findMoveIdByName(mName);
            }
          });
        }
        for (let mIdx = 0; mIdx < 4; mIdx++) {
          if (!selectedMoves[mIdx]) {
            selectedMoves[mIdx] = defaultMoves[mIdx] || null;
          }
        }
        
        const selectedNature = detail.nature ? findNatureKeyByName(detail.nature) : "hardy";
        
        activeTeam[index] = {
          ...dbPoke,
          key: key,
          selectedAbility: selectedAbility,
          selectedNature: selectedNature,
          equippedItem: equippedItem,
          selectedMoves: selectedMoves
        };
      }
    });
  } else {
    team.pokemon.forEach((name, index) => {
      if (index >= 6) return;
      const key = findPokedexKeyByName(name);
      if (key && POKEDEX[key]) {
        const dbPoke = POKEDEX[key];
        const isMega = isMegaPokemon(dbPoke);
        let equippedItem = isMega ? getMegaStoneIdForPokemon(dbPoke) : null;
        if (key.toLowerCase().includes("charizard") && !equippedItem) {
          equippedItem = "charizardite-y";
        }
        const defaultMoves = getPokemonDefaultMoves(key);
        activeTeam[index] = {
          ...dbPoke,
          key: key,
          selectedAbility: dbPoke.abilities ? (dbPoke.abilities["0"] || dbPoke.abilities["H"] || "") : "",
          equippedItem: equippedItem,
          selectedMoves: defaultMoves
        };
      }
    });
  }
  
  saveTeamToLocalStorage();
  updateUI();
  switchTab('builder');
  const usedFullData = !!(team.details && team.details.length > 0);
  if (usedFullData) {
    showToast(`¡Equipo VGC ${team.creator ? "de " + team.creator + " " : ""}cargado con Movimientos, Habilidades y Objetos! 🚀`, "success");
  } else {
    showToast(`Equipo VGC ${team.creator ? "de " + team.creator + " " : ""}cargado (solo especies, sets por defecto)`, "info");
  }
  } catch (err) {
    console.error("Error al cargar el equipo preset:", err);
    saveTeamToLocalStorage();
    updateUI();
    showToast("No se pudo cargar el equipo correctamente", "error");
  }
}

function findPokedexKeyByName(name) {
  if (name == null) return null;
  let cleanName = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Handle some common item megas names in sheets
  if (cleanName.endsWith("ite")) {
    cleanName = cleanName.slice(0, -3) + "mega";
  } else if (cleanName.endsWith("itey")) {
    cleanName = cleanName.slice(0, -4) + "megay";
  } else if (cleanName.endsWith("itex")) {
    cleanName = cleanName.slice(0, -4) + "megax";
  }
  
  // 1. Direct match key
  if (POKEDEX[cleanName]) return cleanName;
  
  // 2. Loose key match
  const foundKey = Object.keys(POKEDEX).find(k => k === cleanName || k.includes(cleanName) || cleanName.includes(k));
  if (foundKey) return foundKey;
  
  // 3. Match by p.name property
  const byName = Object.keys(POKEDEX).find(k => {
    const pName = POKEDEX[k].name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName);
  });
  if (byName) return byName;
  
  return null;
}

function addSuggestedPokemon(slotIndex, key, event) {
  if (event) event.stopPropagation(); // Prevent modal opening trigger
  
  if (POKEDEX[key]) {
    const p = POKEDEX[key];
    let ability = "";
    if (p.abilities) {
      ability = p.abilities["0"] || p.abilities["H"] || "";
    }
    
    const defaultMoves = getPokemonDefaultMoves(key);
    const megaStoneId = getMegaStoneIdForPokemon(p);
    let equippedItem = megaStoneId || null;
    if (key.toLowerCase().includes("charizard") && !equippedItem) {
      equippedItem = "charizardite-y";
    }
    activeTeam[slotIndex] = {
      ...p,
      key: key,
      selectedAbility: ability,
      equippedItem: equippedItem,
      selectedMoves: defaultMoves
    };
    
    saveTeamToLocalStorage();
    renderEmptySlots();
    runCoverageAnalysis();
    
    // Refresh buildeo tab if active
    if (document.getElementById("section-buildeo").classList.contains("active")) {
      renderBuildeoTab();
    }
    
    showToast(`¡${p.name} sugerido añadido al equipo! 🎯`, "success");
  }
}

// --- MOVES SELECTION MODAL SYSTEM ---
let currentMoveIndex = -1;

function openMovesModal(slotIndex, moveIndex) {
  currentSlotIndex = slotIndex;
  currentMoveIndex = moveIndex;
  
  const p = activeTeam[slotIndex];
  if (!p) return;
  
  const modal = document.getElementById("moves-modal");
  modal.classList.add("active");
  
  document.getElementById("move-search-input").value = "";
  document.getElementById("move-search-input").focus();
  
  // Reset move details card to placeholder state
  const placeholder = document.getElementById("move-info-placeholder");
  const details = document.getElementById("move-info-details");
  if (placeholder && details) {
    placeholder.classList.remove("hidden");
    details.classList.add("hidden");
  }
  
  renderMovesList();
}

function closeMovesModal(event) {
  document.getElementById("moves-modal").classList.remove("active");
}

function filterMovesResults() {
  renderMovesList();
}

function showMoveDetails(moveId) {
  const placeholder = document.getElementById("move-info-placeholder");
  const details = document.getElementById("move-info-details");
  
  const nameEl = document.getElementById("info-move-name");
  const typeEl = document.getElementById("info-move-type");
  const categoryEl = document.getElementById("info-move-category");
  const powerEl = document.getElementById("info-move-power");
  const descEl = document.getElementById("info-move-desc");
  
  if (!placeholder || !details || !nameEl || !typeEl || !categoryEl || !powerEl || !descEl) return;
  
  const moveName = MOVES_DB[moveId] || moveId;
  const info = MOVES_INFO[moveId] || { c: "Status", p: 0, t: "Normal" };
  const desc = MOVES_DESC[moveId] || "Sin descripción disponible.";
  
  nameEl.textContent = moveName;
  
  // Set type badge content and background class
  const typeLower = info.t.toLowerCase();
  typeEl.textContent = typeTranslations[typeLower] || info.t;
  typeEl.className = `type-badge type-${typeLower}`;
  
  // Translate category and set category badge style
  let categoryLabel = "Estado";
  let categoryClass = "category-status";
  if (info.c === "Physical") {
    categoryLabel = "Físico";
    categoryClass = "category-physical";
  } else if (info.c === "Special") {
    categoryLabel = "Especial";
    categoryClass = "category-special";
  }
  categoryEl.textContent = categoryLabel;
  categoryEl.className = `category-badge ${categoryClass}`;
  
  // Set power element
  if (info.p > 0) {
    powerEl.textContent = info.p;
  } else {
    powerEl.textContent = "--";
  }
  
  descEl.textContent = desc;
  
  placeholder.classList.add("hidden");
  details.classList.remove("hidden");
}

function renderMovesList() {
  const physicalList = document.getElementById("physical-moves-list");
  const specialList = document.getElementById("special-moves-list");
  const statusList = document.getElementById("status-moves-list");
  
  if (!physicalList || !specialList || !statusList) return;
  
  physicalList.innerHTML = "";
  specialList.innerHTML = "";
  statusList.innerHTML = "";
  
  const p = activeTeam[currentSlotIndex];
  if (!p) return;
  
  const query = document.getElementById("move-search-input").value.toLowerCase().trim();
  const learnset = getPokemonLearnset(p.key);
  
  // Map internal keys to display names and attributes
  let movesToShow = learnset.map(mid => {
    const info = MOVES_INFO[mid] || { c: "Status", p: 0, t: "Normal" };
    return {
      id: mid,
      name: MOVES_DB[mid] || mid,
      category: info.c, // "Physical", "Special", "Status"
      power: info.p || 0,
      type: info.t || "Normal"
    };
  });
  
  // Sort moves: highest damage (power) at the top, then alphabetically
  movesToShow.sort((a, b) => {
    if (b.power !== a.power) {
      return b.power - a.power;
    }
    return a.name.localeCompare(b.name);
  });
  
  // Filter by query
  if (query) {
    movesToShow = movesToShow.filter(m => m.name.toLowerCase().includes(query) || m.id.includes(query));
  }
  
  const physicalArr = [];
  const specialArr = [];
  const statusArr = [];
  
  movesToShow.forEach(m => {
    if (m.category === "Physical") {
      physicalArr.push(m);
    } else if (m.category === "Special") {
      specialArr.push(m);
    } else {
      statusArr.push(m);
    }
  });
  
  const renderColumn = (listContainer, arr, emptyText) => {
    if (arr.length === 0) {
      listContainer.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); font-style: italic; padding: 1rem; font-size: 0.8rem;">${emptyText}</div>`;
      return;
    }
    
    arr.forEach(m => {
      const btn = document.createElement("button");
      btn.className = "move-select-option";
      btn.setAttribute("onclick", `selectMove('${m.id}')`);
      
      const nameSpan = document.createElement("span");
      nameSpan.textContent = m.name;
      btn.appendChild(nameSpan);
      
      if (m.power > 0) {
        const powerBadge = document.createElement("span");
        powerBadge.className = "move-power-badge";
        powerBadge.textContent = m.power;
        btn.appendChild(powerBadge);
      }
      
      // Update details card on hover
      btn.addEventListener("mouseenter", () => {
        showMoveDetails(m.id);
      });
      
      // Highlight if currently selected
      if (p.selectedMoves && p.selectedMoves[currentMoveIndex] === m.id) {
        btn.style.borderColor = "var(--primary)";
        btn.style.background = "rgba(56, 189, 248, 0.15)";
        btn.style.color = "var(--color-text-highlight)";
      }
      
      listContainer.appendChild(btn);
    });
  };
  
  renderColumn(physicalList, physicalArr, "Ninguno");
  renderColumn(specialList, specialArr, "Ninguno");
  renderColumn(statusList, statusArr, "Ninguno");
}

function selectMove(moveId) {
  if (currentSlotIndex < 0 || currentSlotIndex >= 6 || !activeTeam[currentSlotIndex]) return;
  
  const p = activeTeam[currentSlotIndex];
  if (!p.selectedMoves) {
    p.selectedMoves = [null, null, null, null];
  }
  
  p.selectedMoves[currentMoveIndex] = moveId;
  saveTeamToLocalStorage();
  updateUI();
  
  // Refresh buildeo tab if active
  if (document.getElementById("section-buildeo").classList.contains("active")) {
    renderBuildeoTab();
  }
  
  closeMovesModal();
  showToast(`Movimiento ${MOVES_DB[moveId] || moveId} seleccionado para ${p.name}.`, "success");
}

// --- POKEMON BOX LOGIC ---

function renderBoxNavigation() {
  const nav = document.getElementById("box-navigation");
  if (!nav) return;
  
  const box = getCurrentBox();
  const filled = box.filter(p => p).length;
  
  nav.innerHTML = `
    <div class="box-nav-center">
      <span class="box-nav-count">${filled} / ${BOX_SIZE}</span>
    </div>
  `;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderPokemonBox() {
  const boxGrid = document.getElementById("pokemon-box-grid");
  if (!boxGrid) return;
  
  renderBoxNavigation();
  boxGrid.innerHTML = "";
  
  const box = getCurrentBox();
  
  for (let i = 0; i < BOX_SIZE; i++) {
    const slot = document.createElement("div");
    
    if (box[i]) {
      const p = box[i];
      const megaBadge = boxPokemonHasMega(p)
        ? `<img class="mega-stone-indicator" src="${getMegaStoneSpriteUrl(p)}" alt="Mega Piedra" title="${p.megaFormeName ? p.megaFormeName + ' ' : ''}Mega Evolución configurada" onerror="this.onerror=null; this.src='img/items/default-mega.png'">`
        : "";
      slot.className = "box-slot filled";
      slot.innerHTML = `
        ${megaBadge}
        <button class="btn-remove-pokemon" onclick="removePokemonFromBox(${i}, event)" style="width: 20px; height: 20px; top: 5px; right: 5px; padding: 2px;">
          <i data-lucide="x" style="width: 12px; height: 12px;"></i>
        </button>
        <img class="poke-sprite" src="${getPokemonSpriteUrl(p)}" alt="${p.name}" onerror="handleImageError(this, '${p.key}')">
        <div class="poke-name">${p.name}</div>
        <div class="poke-types">${getPokemonTypes(p).map(t => `<span class="type-badge type-${t.toLowerCase()}">${typeTranslations[t.toLowerCase()]}</span>`).join("")}</div>
      `;
      
      slot.addEventListener("mouseenter", (e) => showBoxTooltip(p, slot, e));
      slot.addEventListener("mouseleave", () => hideBoxTooltip());
      
      // Mover al equipo principal al hacer clic
      slot.addEventListener("click", () => moveBoxPokemonToTeam(i));
    } else {
      slot.className = "box-slot box-slot-empty";
      slot.innerHTML = `
        <i data-lucide="plus-circle" style="width: 24px; height: 24px;"></i>
      `;
      slot.onclick = () => openSearchModal(i, 'box');
    }
    
    // --- DRAG & DROP: BOX SLOTS ---
    slot.setAttribute("draggable", box[i] ? "true" : "false");
    slot.addEventListener("dragstart", (e) => {
      if (!box[i]) { e.preventDefault(); return; }
      dragState = { source: "box", index: i };
      e.dataTransfer.setData("text/plain", "box:" + i);
      e.dataTransfer.effectAllowed = "move";
      slot.classList.add("dragging-source");
      hideBoxTooltip();
    });
    slot.addEventListener("dragend", () => clearDragVisuals());
    
    // Any box slot accepts Team -> Box drops
    slot.addEventListener("dragover", (e) => {
      if (dragState && dragState.source === "team") {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slot.classList.add("drag-over-target");
      }
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("drag-over-target"));
    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("drag-over-target");
      if (dragState && dragState.source === "team") {
        const teamIndex = dragState.index;
        dragState = null;
        moveTeamPokemonToBox(teamIndex);
      }
    });
    
    boxGrid.appendChild(slot);
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function removePokemonFromBox(index, event) {
  if (event) event.stopPropagation();
  getCurrentBox()[index] = null;
  saveTeamToLocalStorage();
  renderPokemonBox();
}

function moveBoxPokemonToTeam(boxIndex) {
  const box = getCurrentBox();
  const p = box[boxIndex];
  if (!p) return;
  
  const teamPoke = resolveTeamPokemonFromBoxPoke(p);
  if (!teamPoke) return;
  
  // Prevent duplicates: same Pokémon (or same species with an active Mega) cannot be added twice
  const speciesKey = getSpeciesIdentityKey(teamPoke);
  const alreadyInTeam = activeTeam.some(t => t && getSpeciesIdentityKey(t) === speciesKey);
  if (alreadyInTeam) {
    showToast(`${teamPoke.name} ya está en tu equipo`, "error");
    return;
  }
  
  const emptyIndex = activeTeam.findIndex(t => !t);
  if (emptyIndex !== -1) {
    activeTeam[emptyIndex] = teamPoke;
    box[boxIndex] = null;
    saveTeamToLocalStorage();
    showToast(`${teamPoke.name} movido al equipo principal`, "success");
    renderPokemonBox();
    updateUI();
  } else if (activeTeam.length < 6) {
    activeTeam.push(teamPoke);
    box[boxIndex] = null;
    saveTeamToLocalStorage();
    showToast(`${teamPoke.name} movido al equipo principal`, "success");
    renderPokemonBox();
    updateUI();
  } else {
    showToast("Tu equipo ya está lleno (máximo 6 Pokémon)", "error");
  }
}

function moveTeamPokemonToBox(teamIndex, event) {
  if (event) event.stopPropagation();
  
  const p = activeTeam[teamIndex];
  if (!p) return;
  
  const box = getCurrentBox();
  let emptySlot = box.findIndex(s => !s);
  
  if (emptySlot === -1) {
    showToast("Tu caja Pokémon está llena (máximo 30)", "error");
    return;
  }
  
  box[emptySlot] = buildBoxPokemonFromTeam(p);
  activeTeam[teamIndex] = null;
  
  saveTeamToLocalStorage();
  updateUI();
  if (activeTab === "box") renderPokemonBox();
  showToast(`${p.name} enviado a la Caja Pokémon`, "success");
}

function showBoxTooltip(poke, element, event) {
  if (dragState) return;
  const tooltip = document.getElementById("box-pokemon-tooltip");
  if (!tooltip) return;
  
  // Create a minimal object for type evaluation to avoid exceptions
  const mockTeamObj = { ...poke, selectedAbility: poke.selectedAbility || "Ninguna" };
  const eff = { weaknesses: [], immunities: [] };
  
  // Reuse existing effectiveness logic (only weaknesses and immunities)
  Object.keys(typeTranslations).forEach(atkType => {
    const mult = getModifiedPokemonEffectiveness(atkType, mockTeamObj);
    if (mult === 0) eff.immunities.push(atkType);
    else if (mult > 1) eff.weaknesses.push(atkType);
  });
  
  let weaknessesHtml = '';
  let immunitiesHtml = '';
  
  if (eff.weaknesses.length > 0) {
    weaknessesHtml = `
      <div class="tooltip-section">
        <div class="tooltip-section-title">Debilidades (x2 o más)</div>
        <div class="tooltip-types-row">
          ${eff.weaknesses.map(t => `<span class="type-badge type-${t}">${typeTranslations[t]}</span>`).join("")}
        </div>
      </div>
    `;
  }
  
  if (eff.immunities.length > 0) {
    immunitiesHtml = `
      <div class="tooltip-section">
        <div class="tooltip-section-title">Inmunidades (x0)</div>
        <div class="tooltip-types-row">
          ${eff.immunities.map(t => `<span class="type-badge type-${t}">${typeTranslations[t]}</span>`).join("")}
        </div>
      </div>
    `;
  }
  
  tooltip.innerHTML = `
    <div class="tooltip-header">
      <img src="${getPokemonSpriteUrl(poke)}" alt="${poke.name}">
      <div class="tooltip-name">${poke.name}</div>
    </div>
    ${weaknessesHtml}
    ${immunitiesHtml}
  `;
  
  tooltip.classList.remove("hidden");
  
  // Position the floating tooltip ABOVE the Pokémon without disturbing the grid.
  const rect = element.getBoundingClientRect();
  const margin = 12;
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  
  // Clamp horizontally so it never overflows the viewport edges
  let left = rect.left + rect.width / 2 - tw / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - margin - tw));
  
  // Prefer placing it above; flip below only if there is more room (near the top edge)
  const spaceAbove = rect.top - margin;
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  let top;
  if (spaceAbove >= th || spaceAbove >= spaceBelow) {
    top = rect.top - th - margin;
  } else {
    top = rect.bottom + margin;
  }
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideBoxTooltip() {
  const tooltip = document.getElementById("box-pokemon-tooltip");
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
}


