///// Possible Actions /////

export const TARGET_TYPE_FOR_ACTION = {
    "shoot": ["tank", "wall", "council"],
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

