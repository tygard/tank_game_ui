///// User List /////

// Keys in a user object to hide from end users
export const keysToIgnore = new Set(["type", "dead"]);

// The keys we want to be in a specific order
export const orderedKeys = ["name"];

// Header names for each user type
export const userTypeToHeaders = {
    council: "Councilors",
    senate: "Senators",
};

// Alignment of fields in the tables
export const fieldAlignment = {
    name: "start"
};

export const defaultAlignment = "end";

///// Possible Actions /////

export const TARGET_TYPE_FOR_ACTION = {
    "shoot": ["tank", "wall"],
    "move": ["empty"],
};

// Mappings from the field names used by the rules command and the log book (key: actionType-fieldName)
export const LOG_BOOK_FIELD_MAPPINGS = {
    "buy_action-gold": "quantity",
    "donate-donation": "quantity",
    "move-target": "position",
    "bounty-bounty": "quantity",
    "shoot-target": "position",
};

///// Turn State Manager /////

export const TURN_SWITCH_FREQENCY = 1000;
