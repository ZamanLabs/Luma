// A small built-in calorie reference so logging common foods doesn't require
// looking anything up. Values are rough kcal for a typical serving.
export type FoodRef = { name: string; kcal: number }

export const COMMON_FOODS: FoodRef[] = [
  // Staples
  { name: 'Plain rice (1 cup)', kcal: 205 },
  { name: 'Roti / chapati', kcal: 110 },
  { name: 'Paratha', kcal: 260 },
  { name: 'Naan', kcal: 260 },
  { name: 'Khichuri (1 bowl)', kcal: 320 },
  { name: 'Biryani (1 plate)', kcal: 600 },
  { name: 'Bread (1 slice)', kcal: 80 },
  { name: 'Oats (1 bowl)', kcal: 150 },
  { name: 'Pasta (1 cup)', kcal: 220 },
  { name: 'Noodles (1 pack)', kcal: 380 },
  // Protein
  { name: 'Egg (boiled)', kcal: 78 },
  { name: 'Egg (fried)', kcal: 90 },
  { name: 'Chicken curry (1 piece)', kcal: 250 },
  { name: 'Grilled chicken (100g)', kcal: 165 },
  { name: 'Beef curry (1 piece)', kcal: 290 },
  { name: 'Fish curry (1 piece)', kcal: 200 },
  { name: 'Dal / lentils (1 bowl)', kcal: 180 },
  { name: 'Paneer (100g)', kcal: 265 },
  { name: 'Chickpeas (1 cup)', kcal: 270 },
  // Veg & sides
  { name: 'Mixed vegetables (1 bowl)', kcal: 120 },
  { name: 'Salad (1 bowl)', kcal: 60 },
  { name: 'Yogurt (1 cup)', kcal: 110 },
  { name: 'Samosa', kcal: 130 },
  { name: 'Singara', kcal: 140 },
  // Fruit
  { name: 'Banana', kcal: 105 },
  { name: 'Apple', kcal: 95 },
  { name: 'Orange', kcal: 62 },
  { name: 'Mango (1 cup)', kcal: 100 },
  { name: 'Grapes (1 cup)', kcal: 104 },
  // Snacks & sweets
  { name: 'Biscuit (2)', kcal: 130 },
  { name: 'Chips (small pack)', kcal: 160 },
  { name: 'Chocolate bar', kcal: 230 },
  { name: 'Ice cream (1 scoop)', kcal: 140 },
  { name: 'Rasgulla (1)', kcal: 130 },
  { name: 'Jalebi (1)', kcal: 150 },
  // Drinks
  { name: 'Tea with milk & sugar', kcal: 60 },
  { name: 'Black coffee', kcal: 5 },
  { name: 'Coffee with milk', kcal: 60 },
  { name: 'Milk (1 glass)', kcal: 150 },
  { name: 'Orange juice (1 glass)', kcal: 112 },
  { name: 'Soft drink (can)', kcal: 140 },
  { name: 'Lassi (1 glass)', kcal: 220 },
  { name: 'Water', kcal: 0 },
  // Fast food
  { name: 'Burger', kcal: 500 },
  { name: 'Pizza (1 slice)', kcal: 285 },
  { name: 'French fries (medium)', kcal: 340 },
  { name: 'Shawarma / roll', kcal: 350 },
  { name: 'Fried chicken (1 piece)', kcal: 320 },
]
