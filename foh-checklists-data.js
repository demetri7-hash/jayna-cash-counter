/**
 * FOH CHECKLIST DATA
 *
 * Structured data extracted from FOH checklist .docx files
 * Used by index.html FOH tab to render time-based checklists
 *
 * Created: October 17, 2025
 */

const FOH_CHECKLISTS = {

  // ============================================
  // AM CLEANING CHECKLIST REVIEW (9am-3pm)
  // ============================================
  am_cleaning: {
    type: 'am_cleaning',
    title: 'AM CLEANING CHECKLIST REVIEW',
    timeRange: '9:00 AM - 3:00 PM',
    description: 'Review of overnight cleaning completed by BOH staff',
    staffCount: 1, // Single reviewer
    hasRatings: true,
    hasNotes: true,
    ratingScale: '1 – MAJOR ISSUES | 3 – ACCEPTABLE | 5 – GUEST-READY',
    sections: [
      {
        name: 'Quality Review',
        type: 'rating', // This section has ratings instead of checkboxes
        categories: [
          { name: 'Sweeping', description: 'Crumbs, litter, spiderwebs, trash' },
          { name: 'Chairs', description: 'Put down and neatly tucked in to each table' },
          { name: 'Exterior of Building and Parking Lot', description: 'Clear of debris and trash' },
          { name: 'Dumpster Area', description: 'Kept locked, clean, nothing overflowing in the bins' },
          { name: 'Bathrooms', description: 'Sinks, mirrors, soap, dryer, towels, perimeter lip dusted?' },
          { name: 'Toilets', description: 'Specifically the entire white porcelain, top to bottom- wiped? clean? sanitized?' },
          { name: 'Floors in Bathroom', description: 'Swept, mopped, area behind and around toilets' },
          { name: 'Container Status', description: 'Clean, tidy, organized, no unopened boxes on the ground' }
        ]
      }
    ]
  },

  // ============================================
  // FOH OPENING CHECKLIST (9am-3pm)
  // ============================================
  foh_opening: {
    type: 'foh_opening',
    title: 'FOH OPENING CHECKLIST',
    timeRange: '9:00 AM - 3:00 PM',
    description: 'Complete opening procedures for dining room, bar, and guest areas',
    staffCount: 2, // Two staff members
    hasRatings: true,
    hasNotes: false,
    ratingScale: '1 – MAJOR ISSUES | 3 – ACCEPTABLE | 5 – GUEST-READY',
    sections: [
      {
        name: 'Dining Room & Patio Setup',
        type: 'checkbox',
        tasks: [
          'Remove chairs and re-wipe all tables',
          'Wipe table sides, legs, chairs, and banquette sofas',
          'Don\'t forget the top wood ledge of sofas (especially outside)',
          'Ensure chairs are tucked in and tables are aligned and evenly spaced',
          'Place lamps on tables, hide charging cables',
          '"Salt to the Street" – salt shakers toward parking lot, pepper toward kitchen',
          'Wipe and dry menus — remove stickiness',
          'Turn on all dining room lights',
          'Unlock doors and flip both signs to "OPEN"',
          'Check and refill all rollups (napkin + silverware)',
          'Wipe patio tables and barstools with fresh towel',
          'Raise blinds',
          'Windex front doors',
          'Wipe down front of registers'
        ]
      },
      {
        name: 'Cleanliness & Walkthrough',
        type: 'checkbox',
        tasks: [
          'Sweep perimeter and remove cobwebs from: Pergola area, Back wall, Between sofas, Under all tables and planter boxes (inside & facing parking lot)',
          'Review previous night\'s closing checklist for any notes'
        ]
      },
      {
        name: 'Bathroom Checks',
        type: 'checkbox',
        description: 'EVERY MORNING DAILY! BOH CLEANER WILL CLEAN BUT YOU MUST VERIFY IF NOT OK, CLEAN YOURSELF AND NOTIFY DEMETRI IMMEDIATELY',
        tasks: [
          'Clean toilets thoroughly: bowl, lid, seat, under seat, and floor around and behind',
          'Windex mirrors',
          'Dust the following areas: Top of hand dryer, Soap dispenser, Lip around perimeter of bathroom wall',
          'Scrub and clean sink + remove mold from drain',
          'Dry and polish all surfaces',
          'Restock: Toilet paper, Paper towels, Toilet seat covers'
        ]
      },
      {
        name: 'Expo Station & Sauce Prep',
        type: 'checkbox',
        tasks: [
          'Fill 1 sanitation tub at expo: Fill ¾ with sanitizer, Add 2 new microfiber towels, One must be hanging half in/half out (health code requirement)',
          'Expo towels: 1 damp towel for wiping plate edges, 1 dry towel for expo counter and surfaces',
          'Sauce backups (filled ramekins): Tzatziki – 1–2 full (2oz), Spicy Aioli – 1–2 full (2oz), Lemon Dressing – 1–2 full (3oz)',
          'Squeeze bottles for ramekin plating: 1 full each of: Tzatziki, Spicy Aioli, Lemon Dressing'
        ]
      },
      {
        name: 'Kitchen Support & Restock',
        type: 'checkbox',
        tasks: [
          'Bring out sauces and mark any finished',
          'Stock kitchen with plates and bowls from drying rack — keep replenishing throughout shift',
          'Restock to-go bowls & pita boxes above handwashing sink — must appear full and complete',
          'Restock baklava at: Retail shelves, POS'
        ]
      },
      {
        name: 'Water Station',
        type: 'checkbox',
        description: '"ABUNDANT" SPA VIBE',
        tasks: [
          'Cut 2 English cucumbers into thick ribbons using mandolin slicer — Place in Water Station 1 — fresh, bountiful look',
          'Cut 4 lemons into thick wheels — Place in Water Station 2 — fancy, abundant, spa-like vibe',
          'Fill both dispensers with ice, fruit, and water — should look luxurious and inviting'
        ]
      },
      {
        name: 'Bar Fruit Prep',
        type: 'checkbox',
        tasks: [
          '4 lemons – perfect wheels only (continuous rind)',
          '2 lemons – thick wedges (easy to squeeze)',
          '1 lime – perfect wheels (for cocktails & cherry soda)',
          '1 lime – thick wedges',
          '1 orange – thick slices (sangria, orange soda, cocktails)'
        ]
      },
      {
        name: 'Bar Setup & Stock',
        type: 'checkbox',
        tasks: [
          'Fill ice well to overflowing',
          'Fill garnish container with ice + water for fruit',
          'Bring out and check: Juices & simple syrups — full, clean, labeled, Signature cocktail containers: Day-use = full, clean, labeled, Backup gallons = prep more if low, clean before refilling',
          'Stock all 3 bar caddies with: Straws, Beverage napkins, Black plastic spoons for froyo'
        ]
      },
      {
        name: 'Froyo Machines',
        type: 'checkbox',
        tasks: [
          'SWITCH BUTTON TO STOP THEN PRESS AUTO TO GET THEM GOING',
          'ADD STRAWBERRY TO SMALL MACHINE, IF NOT RINSED CLEAN, ENSURE PRODUCT IS COLD AND WAS LEFT IN FRESH MODE OVERNIGHT, USE A SPOON TO STIR / CONSISTENT',
          '1 batch ready to serve inside machine',
          '1 labeled backup in wine fridge (prep if missing)'
        ]
      },
      {
        name: 'Wines by the Glass',
        type: 'checkbox',
        tasks: [
          'Check all wines: Whites & bubbles in fridge, Reds on bar',
          'Confirm open dates',
          'Taste if questionable – DUMP IF BAD',
          'Keep selection fresh and labeled'
        ]
      },
      {
        name: 'Opening Quality Review',
        type: 'rating',
        categories: [
          { name: 'Dining Rooms', description: 'Chairs clean, mirrors, windows, décor, lights' },
          { name: 'Expo & Water Station', description: 'Stocked, clean, organized' },
          { name: 'Sauces + Baklava Prep + Beverage Fridge', description: '' },
          { name: 'Cashier & Retail', description: 'Baklava at POS, menus wiped, retail shelves, Turkish delights' },
          { name: 'Silver', description: 'Rollies, prefold linens, leftover washed silver' },
          { name: 'Fro-Yo', description: 'Backups, cleanliness, turned off?' },
          { name: 'Office', description: 'Trash, clean and organized' },
          { name: 'Bar', description: 'To go cups and lids, stickiness, lemonades, batch cocktails, garnishes, glassware, floors, front of fridge' }
        ]
      }
    ]
  },

  // ============================================
  // FOH TRANSITION CHECKLIST (2pm-4pm)
  // ============================================
  foh_transition: {
    type: 'foh_transition',
    title: 'FOH TRANSITION DUTIES',
    timeRange: '2:00 PM - 4:00 PM',
    description: 'YOU MAY START TRANSITION 1 HOUR BEFORE YOUR SHIFT ENDS. GUESTS ALWAYS COME BEFORE SIDEWORK.',
    staffCount: 2,
    hasRatings: true,
    hasNotes: true,
    ratingScale: '1 – MAJOR ISSUES | 3 – ACCEPTABLE | 5 – GUEST-READY',
    sections: [
      {
        name: 'Retail & Display',
        type: 'checkbox',
        tasks: [
          'PREPARE AND PACKAGE 3-PIECE BAKLAVA RETAIL BOXES (MORE PISTACHIO & WALNUT, FEWER CHOCOLATE)',
          'CLEAN TURKISH DELIGHT CASE & TRAYS; REPLACE NEATLY WITH FRESH PIECES',
          'CUT TURKISH DELIGHTS TO SIZE AND ARRANGE NEATLY, PUSHED FORWARD FOR DISPLAY'
        ]
      },
      {
        name: 'Stocking & Utensils',
        type: 'checkbox',
        tasks: [
          'REFILL TO-GO SAUCES & BRING OUT FULL BOTTLES',
          'STOCK TO-GO BOXES, LIDS, BAGS & SILVERWARE',
          'BRING OUT PLATES, BOWLS, SILVERWARE, BUFF SPOONS/KNIVES & RAMEKINS',
          'PREPARE ROLL-UPS (USE ALL CLEAN SILVERWARE)',
          'ENSURE PLENTY OF CLEAN GLASSES ARE AVAILABLE',
          'GET FRESH RAG FOR PM EXPO; DISCARD USED RAGS'
        ]
      },
      {
        name: 'Dining Room & Stations',
        type: 'checkbox',
        tasks: [
          'WIPE TABLES, TUCK IN CHAIRS, WIPE POS & HOST STAND FROM GUEST SIDE',
          'REFRESH ALL SANITATION TUBS AND NEW RAGS',
          'STOCK NAPKINS, TOOTHPICKS, SWEETENERS, STRAWS AT WATER STATION. EMPTY TRASH IF NEEDED',
          'REFILL WATER JUGS, ICE FIRST, REFRESH GLASSES. WIPE WATER AS NEEDED',
          'CHECK FRO-YO TOPPINGS & RESTOCK. CLEAN BOTTLES, WIPE TRAY AS NEEDED',
          'CLEAR STAFF DRINK/FOOD AREA. THROW ANYTHING AWAY THAT ISN\'T CLAIMED'
        ]
      },
      {
        name: 'Bathrooms',
        type: 'checkbox',
        tasks: [
          'WIPE SINKS, MIRRORS; RESET BATHROOMS. TOILET CLEANLINESS FROM TOP DOWN, AND GROUND AROUND',
          'REFILL PAPER TOWELS, TOILET PAPER, SOAP',
          'EMPTY BATHROOM TRASH'
        ]
      },
      {
        name: 'Beverages & Prep',
        type: 'checkbox',
        tasks: [
          'RESTOCK DRINKS FRIDGE (SODAS, WATERS, WINE, BEER)',
          'PREP FRUIT FOR NIGHT, LOTS OF LEMON WHEELS. REFRESH THE ICE WATER IN THE ORGANIZER',
          'TOP OFF SANGRIA, LEMONADE & AYRAN AS NEEDED, OR LEAVE NOTE FOR NEXT SHIFT CREW',
          'WIPE & DRY MENUS AND TABLE NUMBER CARDS, INCLUDING THE METAL POLE AND BASE'
        ]
      },
      {
        name: 'Transition Quality Review',
        type: 'rating',
        categories: [
          { name: 'Dining Rooms, Floors, Patio Setup', description: '' },
          { name: 'Expo Cleanliness & Reset + Water Setup', description: 'Tray, to go napkins, glassware' },
          { name: 'Sauces/Baklavas/Turkish Delights', description: '' },
          { name: 'Cashier', description: 'Both guest and cashier staff sides, rollies, baklava, menu wipes, excess tips under drawer' },
          { name: 'Frozen Yogurt Machine', description: 'Backup, toppings, cups and spoons' },
          { name: 'Bathrooms', description: 'Paper goods stock and backstock, toilet top to bottom, floors and walls, mirrors sink and surrounding' },
          { name: 'Bar', description: 'Sliced fruit reset inc ice water, glassware, lemonades etc' },
          { name: 'Overall Opening/Transition Quality', description: '' }
        ]
      }
    ]
  },

  // ============================================
  // FOH CLOSING CHECKLIST (4pm-11pm)
  // ============================================
  foh_closing: {
    type: 'foh_closing',
    title: 'FOH CLOSING DUTIES',
    timeRange: '4:00 PM - 11:00 PM',
    description: 'DO NOT START CLOSING THE DINING ROOM BEFORE 9:45PM UNLESS GIVEN EXPLICIT PERMISSION BY THE MANAGER ON DUTY.',
    staffCount: 2,
    hasRatings: false,
    hasNotes: true,
    sections: [
      {
        name: 'Dining Room & Floor Cleaning',
        type: 'checkbox',
        tasks: [
          'WIPE ALL DINING TABLES, BAR COUNTERS, BAR STOOLS, AND BANQUETTE SOFAS (CHECK FOR FOOD, DUST, AND DEBRIS)',
          'INSPECT BOOTHS (FABRIC AND WOOD); VACUUM OR WIPE IF CRUMBS OR SMUDGES ARE VISIBLE',
          'ENSURE ALL CHAIRS ARE TUCKED IN AND ALIGNED NEATLY',
          'SWEEP UNDER ALL TABLES, BAR AREA, AND EXPO COUNTER',
          'DOUBLE CHECK CORNERS AND UNDERNEATH BANQUETTES FOR TRASH OR BUILDUP',
          'COLLECT TRASH FROM BAR, EXPO/WATER STATION, BOTH BATHROOMS, AND OFFICE',
          'REPLACE ALL TRASH BAGS WITH CLEAN LINERS',
          'ROLL AS MANY NAPKIN SETS AS POSSIBLE USING ALL AVAILABLE FORKS & KNIVES'
        ]
      },
      {
        name: 'Expo & Water Station',
        type: 'checkbox',
        tasks: [
          'BREAK DOWN WATER STATION, CLEAN DISPENSERS THOROUGHLY, AND LEAVE OPEN TO AIR DRY',
          'PURGE STABBED TICKETS, WIPE PRINTER, SCREEN, AND SURROUNDING AREA',
          'ENSURE 1–2 ROLLS OF BACKUP PRINTER PAPER ARE STOCKED',
          'WIPE CABINET DOORS FROM SOLARIUM TO COKE FRIDGE POS',
          'ORGANIZE AND STRAIGHTEN METAL RACKS ABOVE EXPO (VISIBLE TO GUESTS)',
          'REMOVE ANY VISIBLE DEBRIS UNDER EXPO OR BACKUP CABINETS',
          'REFILL TO-GO RAMEKINS WITH SAUCES (TZATZIKI, SPICY AIOLI, LEMON)',
          'REFILL DRY SPICE SHAKERS AND WIPE DOWN',
          'LABEL/DATE ALL PERISHABLE SAUCES AND MOVE TO WALK-IN FRIDGE',
          'STOCK TO-GO CONTAINERS, LIDS, RAMEKINS, BAGS, CUPS TO 100% CAPACITY',
          'CHECK ABOVE HAND SINK AND AT EXPO COUNTER FOR SUPPLY LEVELS',
          'RESTOCK ALL BEVERAGES IN THE COKE FRIDGE'
        ]
      },
      {
        name: 'To-Go Station / Host Stand',
        type: 'checkbox',
        tasks: [
          'WIPE DOWN TOP AND FRONT-FACING SURFACES OF HOST STAND',
          'DUST AND WINDEX THE KIOSK SCREEN AND PRINTER (MOVE TO GET UNDER AND BEHIND)',
          'ORGANIZE DRAWERS AND CABINETS NEATLY',
          'RESTOCK TO-GO BOXES, BAGS, AND SILVERWARE PACKETS TO 100%',
          'NOTIFY MANAGER IF TO-GO ITEMS (INCLUDING BAGS) ARE LOW IN THE SHIPPING CONTAINER'
        ]
      },
      {
        name: 'Cashier & Retail Station',
        type: 'checkbox',
        tasks: [
          'WIPE DOWN ALL COUNTERS, SURFACES, AND CABINET FRONTS',
          'RESTOCK BAKLAVA IN RETAIL AREA GENEROUSLY',
          'DO A FINAL GUEST-EYE CHECK: WALK AROUND AND WIPE ANYTHING UNCLEAN OR CLUTTERED'
        ]
      },
      {
        name: 'Coffee & Tea / Frozen Yogurt',
        type: 'checkbox',
        tasks: [
          'WIPE ALL SURFACES, ESPECIALLY TOPS AND UNDERNEATH OF COFFEE AND HOT WATER MACHINES (MOVE THEM)',
          'RINSE AND CLEAN TURKISH COFFEE MACHINE PITCHER THOROUGHLY',
          'SWITCH LARGE FROZEN YOGURT MACHINE OFF USING THE STOP BUTTON, THEN HITTING "FRESH" BUTTON',
          'SMALLER MACHINE, FLUSH EVERY NIGHT TO CLEAN COMPLETELY (OFF BUTTON, WASH BUTTON, THEN OFF BUTTON AGAIN TO LEAVE IN STANDBY MODE OVERNIGHT)'
        ]
      },
      {
        name: 'Bathrooms',
        type: 'checkbox',
        tasks: [
          'CLEAN MIRRORS WITH WINDEX',
          'WIPE SINK BASINS AND SILVER FIXTURES UNTIL SPOTLESS',
          'CHECK AND REFILL PAPER TOWELS – STOCK 1 FULL PACK MINIMUM',
          'REPLACE TOILET PAPER IF LOW',
          'REFILL FOAMING SOAP IF BELOW HALFWAY',
          'DUST THE BLUE LEDGE/SHELF AROUND BATHROOM WALLS WITH A DAMP CLOTH'
        ]
      },
      {
        name: 'Office',
        type: 'checkbox',
        tasks: [
          'SWEEP FLOORS THOROUGHLY',
          'REMOVE ANY FOOD OR DRINK CONTAINERS',
          'HANG ALL APRONS NEATLY TO AVOID ODORS',
          'EMPTY TRASH BIN UNDER DEMETRI\'S DESK'
        ]
      }
    ]
  },

  // ============================================
  // BAR CLOSING CHECKLIST (4pm-11pm)
  // ============================================
  bar_closing: {
    type: 'bar_closing',
    title: 'BAR CLOSING DUTIES',
    timeRange: '4:00 PM - 11:00 PM',
    description: 'DESIGNATE 1 PERSON WHO WILL CLOSE THE BAR AND BE RESPONSIBLE FOR EVERYTHING ON THIS LIST. YOU MAY START AS EARLY AS 9PM, AS LONG AS IT DOES NOT DISTURB OR MAKE THE GUESTS FEEL UNCOMFORTABLE, AND YOU CAN STILL MAKE EVERYTHING ON THE MENUS AND TAKE ORDERS UNTIL CLOSING TIME',
    staffCount: 1,
    hasRatings: false,
    hasNotes: true,
    sections: [
      {
        name: 'Clean & Sanitize Equipment',
        type: 'checkbox',
        tasks: [
          'SEND FLOOR MAT TO DISHWASHER',
          'SANITIZE AND CLEAN ALL BAR MATS AND THE BURN WELL',
          'WIPE DOWN SOFT SERVE MACHINE; SEND TRAY TO DISH AND WIPE ENTIRE MACHINE EXTERIOR',
          'EMPTY RIMMER ONCE A WEEK AND SEND TO DISH',
          'PULL DRAIN PLUG IN GLASS WASHER AND SWITCH OFF POWER',
          'PULL OUT CATCH TRAY IN GLASS WASHER, CLEAN IT, AND REPLACE',
          'WIPE DOWN AND SANITIZE BAR TOOLS, JIGGERS, STRAINERS, AND MUDDLERS',
          'EMPTY DUMP SINK STRAINER AND SEND TO DISH',
          'RINSE DUMP SINK AND DRAINS WITH HOT WATER',
          'RUN ALL BAR TOP MATS THROUGH DISHWASHER AND CLEAN UNDERNEATH WITH SANITIZER',
          'SCRUB THE WALLS AND UNDER COUNTERS AROUND THE DUMP SINK WITH SOAPY WATER OR DEGREASER',
          'USE HD DEGREASER (WITH GLOVES) TO CLEAN FLOOR DRAIN; SEND GRATE TO DISHWASHER IF NEEDED',
          'WIPE DOWN BEER TAP TOWER, SPOUTS, AND HANDLES. PLUG EACH TAP FOR THE NIGHT',
          'REMOVE AND WASH 3 DRIP TRAYS FROM LEMONADE AND AYRAN MACHINES; LEAVE UPSIDE DOWN TO DRY',
          'CLEAN CITRUS HOLDER THOROUGHLY AND DISCARD ANY UNUSED CITRUS (DO NOT REUSE)'
        ]
      },
      {
        name: 'Wipe & Organize Surfaces',
        type: 'checkbox',
        tasks: [
          'WIPE DOWN ALL FRONT-FACING FRIDGE DOORS, STAINLESS STEEL SURFACES, AND COUNTERS',
          'FROYO TOPPING BAR- RESTOCK/REFILL TOPPINGS, NEW LIDS FOR SAUCE, RINSE OUTSIDE OF BOTTLES, WASH MAT, WIPE DOWN ENTIRE CABINET INCLUDING INSIDE AND BEHIND! SHOULD NOT BE STICKY ANYWHERE',
          'SHINE STAINLESS STEEL INSIDE AND OUT, INCLUDING CABINET UNDER POS COMPUTERS',
          'WIPE DOWN LIQUOR BOTTLES USED THAT DAY (OR ALL BOTTLES) TO PREVENT STICKINESS AND FRUIT FLIES',
          'FACE ALL LIQUOR BOTTLES FORWARD AND ALIGN NEATLY IN ROWS WITH POUR SPOUTS COVERED',
          'WIPE AND SANITIZE ALL COUNTER SPACE, ESPECIALLY AROUND DROP TRAYS AND WALLS ON EITHER SIDE',
          'ORGANIZE CABINET UNDER POS COMPUTERS. NO CHEMICALS MAY BE STORED HERE – SANITIZE AND SHINE'
        ]
      },
      {
        name: 'Stock & Label',
        type: 'checkbox',
        tasks: [
          'LABEL, DATE, AND REFRIGERATE ALL JUICES, PUREES, AND OPEN INGREDIENTS',
          'DATE, CAP, AND PUMP ALL OPENED WINES',
          'RESTOCK ALL WINES, SPIRITS, BEERS, AND NON-ALCOHOLIC BEVERAGES',
          'ENSURE BACKUPS ARE READY FOR SODAS, JUICES, AND WINES',
          'PLASTIC WRAP OR PLUG ALL DRAFT TAPS OVERNIGHT',
          'RETURN ALL BAR CHEMICALS TO PROPER HOMES (HOST STAND, EXPO CABINET, DISH PIT RACK, OR MOP SINK ONLY)',
          'POUR SALTS OR DRINK RIM POWDERS BACK INTO STORAGE CONTAINERS UNLESS CONTAMINATED OR MOIST'
        ]
      },
      {
        name: 'Glassware & Dish Station',
        type: 'checkbox',
        tasks: [
          'SEND ALL METAL INSERTS TO DISH',
          'ENSURE ALL GLASSWARE HAS BEEN RUN AND NO DIRTY GLASSES REMAIN',
          'STORE CLEAN BAR TOOLS AND GLASSWARE PROPERLY',
          'RUN ALL SERVER TRAYS THROUGH GLASSWARE OR DISHPIT TO CLEAN AND SANITIZE. AIR DRY UPSIDE DOWN'
        ]
      },
      {
        name: 'Floor & Trash',
        type: 'checkbox',
        tasks: [
          'SWEEP AND MOP THE BAR FLOOR THOROUGHLY, INCLUDING UNDER MATS AND CORNERS',
          'EMPTY BAR TRASH AND REPLACE LINER',
          'TAKE OUT GLASS RECYCLING IN ORANGE SHARPS BUCKET, RINSE BUCKET IN DISH PIT. NOTHING STICKY LEFT'
        ]
      },
      {
        name: 'POS & Guest-Facing Areas',
        type: 'checkbox',
        tasks: [
          'REFILL REPLIES IN BASKET AT POS COUNTER',
          'STRAIGHTEN AND WIPE ALL MENUS, INCLUDING COCKTAIL AND WINE GUIDES',
          'REFILL BLACK COCKTAIL NAPKINS AND 7.75" STRAWS. DO NOT OVERFILL 5.5" STRAWS'
        ]
      }
    ]
  }
};

// Time-based workflow availability
const FOH_WORKFLOW_SCHEDULE = [
  {
    name: 'AM Shift (9am-3pm)',
    startHour: 9,
    endHour: 15,
    checklists: ['am_cleaning', 'foh_opening']
  },
  {
    name: 'Transition (2pm-4pm)',
    startHour: 14,
    endHour: 16,
    checklists: ['foh_transition']
  },
  {
    name: 'PM Shift (4pm-11pm)',
    startHour: 16,
    endHour: 24,
    checklists: ['foh_closing', 'bar_closing']
  }
];

/**
 * Get available checklists based on current Pacific time
 */
function getAvailableChecklists() {
  const now = new Date();
  const hour = getPacificHour(now);

  const available = [];

  FOH_WORKFLOW_SCHEDULE.forEach(schedule => {
    if (hour >= schedule.startHour && hour < schedule.endHour) {
      schedule.checklists.forEach(checklistType => {
        if (FOH_CHECKLISTS[checklistType]) {
          available.push(FOH_CHECKLISTS[checklistType]);
        }
      });
    }
  });

  return available;
}

/**
 * Get checklist by type
 */
function getChecklistByType(type) {
  return FOH_CHECKLISTS[type] || null;
}
