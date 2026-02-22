/**
 * FinFlow Category Icon Library
 *
 * Uses: Google Material Symbols Outlined
 * Font loaded in index.html
 */

export interface IconEntry {
  icon: string;
  label: string;
}

export interface IconCategory {
  id: string;
  label: string;
  headerIcon: string;
  headerColor: string;
  icons: IconEntry[];
}

export const categories: IconCategory[] = [
  {
    id: "personal",
    label: "Personal",
    headerIcon: "person",
    headerColor: "#FF8A65",
    icons: [
      { icon: "restaurant", label: "Dining" },
      { icon: "checkroom", label: "Clothing" },
      { icon: "fitness_center", label: "Fitness" },
      { icon: "spa", label: "Wellness" },
      { icon: "school", label: "Education" },
      { icon: "local_library", label: "Books" },
      { icon: "monitor_heart", label: "Health" },
      { icon: "palette", label: "Hobbies" },
      { icon: "self_improvement", label: "Self Care" },
      { icon: "vaccines", label: "Medicine" },
      { icon: "local_cafe", label: "Coffee" },
      { icon: "directions_run", label: "Running" },
      { icon: "pool", label: "Swimming" },
      { icon: "sports_tennis", label: "Sports" },
      { icon: "hiking", label: "Outdoors" },
      { icon: "local_laundry_service", label: "Laundry" },
      { icon: "cut", label: "Haircut" },
      { icon: "shopping_bag", label: "Shopping" },
      { icon: "redeem", label: "Gifts" },
      { icon: "loyalty", label: "Subscriptions" },
      { icon: "phone_iphone", label: "Phone" },
      { icon: "headphones", label: "Audio" },
      { icon: "auto_stories", label: "Reading" },
      { icon: "brush", label: "Art" },
    ],
  },
  {
    id: "family",
    label: "Family",
    headerIcon: "diversity_1",
    headerColor: "#66BB6A",
    icons: [
      { icon: "cottage", label: "Housing" },
      { icon: "shopping_cart", label: "Groceries" },
      { icon: "child_care", label: "Childcare" },
      { icon: "pets", label: "Pets" },
      { icon: "bolt", label: "Utilities" },
      { icon: "local_gas_station", label: "Gas" },
      { icon: "water_drop", label: "Water" },
      { icon: "thermostat", label: "Heating" },
      { icon: "wifi", label: "Internet" },
      { icon: "local_phone", label: "Landline" },
      { icon: "cleaning_services", label: "Cleaning" },
      { icon: "yard", label: "Garden" },
      { icon: "handyman", label: "Repairs" },
      { icon: "chair", label: "Furniture" },
      { icon: "local_hospital", label: "Medical" },
      { icon: "medication", label: "Pharmacy" },
      { icon: "baby_changing_station", label: "Baby" },
      { icon: "backpack", label: "School" },
    ],
  },
  {
    id: "work",
    label: "Work",
    headerIcon: "work",
    headerColor: "#60A5FA",
    icons: [
      { icon: "computer", label: "Software" },
      { icon: "flight_class", label: "Travel" },
      { icon: "print", label: "Supplies" },
      { icon: "business_center", label: "Office" },
      { icon: "meeting_room", label: "Meetings" },
      { icon: "local_shipping", label: "Shipping" },
      { icon: "domain", label: "Rent" },
      { icon: "badge", label: "Licensing" },
      { icon: "groups", label: "Team" },
      { icon: "cloud", label: "Cloud" },
      { icon: "security", label: "Security" },
      { icon: "analytics", label: "Analytics" },
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    headerIcon: "movie",
    headerColor: "#C084FC",
    icons: [
      { icon: "theater_comedy", label: "Movies" },
      { icon: "sports_esports", label: "Gaming" },
      { icon: "music_note", label: "Music" },
      { icon: "local_bar", label: "Nightlife" },
      { icon: "stadium", label: "Events" },
      { icon: "attractions", label: "Theme Parks" },
      { icon: "casino", label: "Casino" },
      { icon: "live_tv", label: "Streaming" },
      { icon: "podcasts", label: "Podcasts" },
      { icon: "sports_soccer", label: "Sports" },
      { icon: "nightlife", label: "Bars" },
      { icon: "celebration", label: "Parties" },
      { icon: "photo_camera", label: "Photography" },
      { icon: "mic", label: "Karaoke" },
      { icon: "park", label: "Parks" },
      { icon: "beach_access", label: "Beach" },
      { icon: "sailing", label: "Boating" },
      { icon: "ski", label: "Skiing" },
      { icon: "golf_course", label: "Golf" },
      { icon: "bowling", label: "Bowling" },
      { icon: "bike_scooter", label: "Rides" },
      { icon: "smart_toy", label: "Toys" },
      { icon: "album", label: "Vinyl" },
      { icon: "videogame_asset", label: "Console" },
      { icon: "library_music", label: "Concerts" },
      { icon: "draw", label: "Crafts" },
      { icon: "ramen_dining", label: "Food Events" },
      { icon: "festival", label: "Festivals" },
      { icon: "menu_book", label: "Magazines" },
      { icon: "tv", label: "TV" },
      { icon: "subscriptions", label: "Membership" },
      { icon: "confirmation_number", label: "Tickets" },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    headerIcon: "directions_car",
    headerColor: "#FCD34D",
    icons: [
      { icon: "directions_car", label: "Car" },
      { icon: "directions_bus", label: "Bus" },
      { icon: "train", label: "Train" },
      { icon: "flight", label: "Flight" },
      { icon: "directions_bike", label: "Bike" },
      { icon: "local_taxi", label: "Taxi" },
      { icon: "subway", label: "Metro" },
      { icon: "two_wheeler", label: "Motorcycle" },
      { icon: "electric_scooter", label: "Scooter" },
      { icon: "local_parking", label: "Parking" },
      { icon: "ev_station", label: "EV Charge" },
      { icon: "toll", label: "Tolls" },
      { icon: "car_repair", label: "Repair" },
      { icon: "car_rental", label: "Rental" },
      { icon: "local_gas_station", label: "Fuel" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    headerIcon: "account_balance",
    headerColor: "#34D399",
    icons: [
      { icon: "account_balance", label: "Bank" },
      { icon: "savings", label: "Savings" },
      { icon: "credit_card", label: "Card" },
      { icon: "receipt_long", label: "Bills" },
      { icon: "trending_up", label: "Investments" },
      { icon: "currency_bitcoin", label: "Crypto" },
      { icon: "real_estate_agent", label: "Real Estate" },
      { icon: "request_quote", label: "Taxes" },
      { icon: "account_balance_wallet", label: "Wallet" },
      { icon: "payments", label: "Payments" },
      { icon: "monetization_on", label: "Income" },
      { icon: "money_off", label: "Fees" },
      { icon: "price_check", label: "Insurance" },
      { icon: "currency_exchange", label: "Exchange" },
      { icon: "attach_money", label: "Cash" },
      { icon: "volunteer_activism", label: "Donations" },
    ],
  },
];

/** Flat list of all icons with their category */
export const allIcons = categories.flatMap((cat) =>
  cat.icons.map((ic) => ({ ...ic, category: cat.id })),
);

/** Get icons for a specific category */
export const getIconsByCategory = (categoryId: string): IconEntry[] =>
  categories.find((c) => c.id === categoryId)?.icons ?? [];

/** Search icons by label or icon name */
export const searchIcons = (query: string) => {
  const q = query.toLowerCase();
  return allIcons.filter(
    (ic) =>
      ic.label.toLowerCase().includes(q) ||
      ic.icon.toLowerCase().includes(q),
  );
};

/**
 * Detect whether an icon string is a Material Symbol name or an emoji.
 * Material Symbol names only contain lowercase letters, digits, and underscores.
 */
export const isMaterialIcon = (icon: string): boolean =>
  /^[a-z0-9_]+$/.test(icon);

export default categories;
