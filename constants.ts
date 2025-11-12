
export const ADOBE_CATEGORY_MAP: Record<number, string> = {
    1: "Animals", 2: "Buildings and Architecture", 3: "Business", 4: "Drinks",
    5: "The Environment", 6: "States of Mind", 7: "Food", 8: "Graphic Resources",
    9: "Hobbies and Leisure", 10: "Industry", 11: "Landscapes", 12: "Lifestyle",
    13: "People", 14: "Plants and Flowers", 15: "Culture and Religion", 16: "Science",
    17: "Social Issues", 18: "Sports", 19: "Technology", 20: "Transport", 21: "Travel"
};

export const ADOBE_NAME_TO_CODE: Record<string, number> = Object.fromEntries(
    Object.entries(ADOBE_CATEGORY_MAP).map(([k, v]) => [v.toLowerCase(), parseInt(k, 10)])
);

export const ADOBE_ALIASES: Record<string, number> = {
    "animals": 1, "architecture": 2, "building": 2, "buildings": 2, "business": 3,
    "finance": 3, "money": 3, "office": 3, "drinks": 4, "beverage": 4, "beverages": 4,
    "coffee": 4, "tea": 4, "wine": 4, "beer": 4, "environment": 5, "nature": 5, "ecology": 5,
    "sustainability": 5, "states of mind": 6, "emotion": 6, "emotions": 6, "mental": 6,
    "psychology": 6, "food": 7, "cuisine": 7, "meal": 7, "dish": 7, "cooking": 7, "baking": 7,
    "graphic resources": 8, "graphics": 8, "icon": 8, "icons": 8, "vector": 8, "ui": 8,
    "pattern": 8, "template": 8, "hobbies and leisure": 9, "hobbies": 9, "leisure": 9,
    "recreation": 9, "game": 9, "games": 9, "music": 9, "industry": 10, "manufacturing": 10,
    "factory": 10, "industrial": 10, "construction": 10, "landscapes": 11, "landscape": 11,
    "mountain": 11, "mountains": 11, "desert": 11, "sea": 11, "ocean": 11, "lifestyle": 12,
    "home life": 12, "everyday life": 12, "family life": 12, "people": 13, "person": 13,
    "human": 13, "portrait": 13, "face": 13, "hand": 13, "hands": 13, "plants and flowers": 14,
    "plants": 14, "plant": 14, "flower": 14, "flowers": 14, "botany": 14, "leaf": 14,
    "culture and religion": 15, "religion": 15, "cultural": 15, "festival": 15, "temple": 15,
    "ritual": 15, "tradition": 15, "science": 16, "scientific": 16, "laboratory": 16, "lab": 16,
    "microscope": 16, "dna": 16, "atom": 16, "social issues": 17, "protest": 17, "poverty": 17,
    "equality": 17, "diversity": 17, "pollution": 17, "climate change": 17, "sports": 18,
    "sport": 18, "soccer": 18, "football": 18, "basketball": 18, "tennis": 18, "fitness": 18,
    "running": 18, "technology": 19, "tech": 19, "computer": 19, "laptop": 19, "smartphone": 19,
    "ai": 19, "robot": 19, "server": 19, "transport": 20, "transportation": 20, "car": 20,
    "cars": 20, "train": 20, "airplane": 20, "ship": 20, "bike": 20, "travel": 21,
    "tourism": 21, "vacation": 21, "holiday": 21, "destination": 21, "landmark": 21
};

export const ADOBE_CATEGORY_RULES: Record<number, Set<string>> = {
    13: new Set(["person", "people", "man", "woman", "child", "boy", "girl", "portrait", "face", "hand", "hands", "selfie", "crowd", "human", "body"]),
    14: new Set(["plant", "plants", "flower", "flowers", "leaf", "leaves", "blossom", "botanical", "flora", "bloom"]),
    18: new Set(["sport", "sports", "ball", "stadium", "tournament", "match", "game", "athlete", "fitness", "run", "running", "swim", "tennis", "soccer", "football", "basketball", "baseball", "golf"]),
    19: new Set(["technology", "tech", "computer", "laptop", "pc", "server", "cpu", "chip", "robot", "ai", "smartphone", "tablet", "code", "coding", "programming", "circuit", "motherboard"]),
    3: new Set(["business", "office", "corporate", "startup", "meeting", "finance", "money", "budget", "report", "strategy", "analytics"]),
    2: new Set(["architecture", "building", "buildings", "interior", "exterior", "skyscraper", "bridge", "temple", "house", "home", "facade"]),
    11: new Set(["landscape", "mountain", "mountains", "valley", "desert", "sea", "ocean", "coast", "coastline", "canyon", "waterfall", "horizon"]),
    7: new Set(["food", "meal", "cuisine", "dish", "cooking", "baking", "snack", "breakfast", "lunch", "dinner", "recipe"]),
    4: new Set(["drink", "drinks", "beverage", "coffee", "tea", "wine", "beer", "cocktail", "juice"]),
    21: new Set(["travel", "tourism", "vacation", "holiday", "journey", "trip", "itinerary", "destination", "landmark", "cityscape", "sightseeing"]),
    8: new Set(["vector", "icon", "icons", "glyph", "pictogram", "ui", "pattern", "template", "infographic", "sticker", "mockup"]),
    10: new Set(["industry", "industrial", "factory", "manufacturing", "assembly", "warehouse", "construction", "machinery"]),
    12: new Set(["lifestyle", "daily", "everyday", "home life", "family life", "homework", "routine", "leisure time"]),
    1: new Set(["animal", "animals", "wildlife", "pet", "pets", "dog", "cat", "bird", "insect", "fish"]),
    5: new Set(["environment", "ecosystem", "forest", "nature", "conservation", "sustainability", "recycling", "green"]),
    6: new Set(["emotion", "emotions", "mood", "feelings", "anxiety", "joy", "sadness", "mental", "mind", "psychology"]),
    9: new Set(["hobby", "hobbies", "leisure", "recreation", "gaming", "gamepad", "music", "instrument", "reading", "garden", "fishing"]),
    15: new Set(["religion", "faith", "church", "temple", "mosque", "ritual", "festival", "tradition", "culture", "cultural"]),
    16: new Set(["science", "lab", "laboratory", "microscope", "experiment", "chemical", "physics", "biology", "dna", "molecule", "atom"]),
    17: new Set(["protest", "inequality", "poverty", "pollution", "homeless", "crime", "violence", "war", "climate change", "social issue"]),
    20: new Set(["transport", "transportation", "car", "cars", "vehicle", "bus", "train", "rail", "airplane", "ship", "bike", "bicycle", "traffic"]),
};

export const PEOPLE_BIAS_TERMS = new Set(["person", "people", "human", "man", "woman", "boy", "girl", "child", "children", "portrait", "face", "hand", "hands", "selfie", "body", "crowd"]);
export const GRAPHICS_BIAS_TERMS = new Set(["vector", "icon", "icons", "glyph", "pictogram", "ui", "pattern", "template", "infographic", "sticker", "mockup", "svg", "eps", "illustration", "flat icon", "outline icon", "line icon"]);

export const KEYWORD_STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "of", "on", "in", "for", "to", "with", "by", "at", "from", "as", "is", "are", "be",
    "no", "not", "without", "copy", "space", "stock", "photo", "image", "illustration", "vector illustration", "nobody",
    "background", "closeup", "close up", "studio shot", "horizontal", "vertical", "portrait orientation", "landscape orientation",
    "high quality", "hd", "4k", "free", "royalty free", "text", "placeholder"
]);

export const KEYWORD_MAX = 49;
export const KEYWORD_MIN_STRONG = 25;

export const TITLE_TRUNC = 50;
export const KEYWORDS_TRUNC = 60;
