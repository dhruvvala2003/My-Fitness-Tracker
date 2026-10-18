/**
 * Quick-add food database for the Calories page.
 * Values are kcal per 100 g (or 100 ml for drinks) — typical cooked
 * portions, rounded. `serving` is a sensible one-tap default.
 */
export interface FoodItem {
  name: string;
  kcalPer100: number;
  serving: { label: string; grams: number };
  tags?: string;
}

export const FOODS: FoodItem[] = [
  // ── Indian staples ──
  { name: 'Roti / Chapati', kcalPer100: 297, serving: { label: '1 roti', grams: 40 } },
  { name: 'Paratha (plain)', kcalPer100: 325, serving: { label: '1 paratha', grams: 80 } },
  { name: 'Rice (cooked)', kcalPer100: 130, serving: { label: '1 bowl', grams: 150 } },
  { name: 'Brown rice (cooked)', kcalPer100: 111, serving: { label: '1 bowl', grams: 150 } },
  { name: 'Dal (cooked)', kcalPer100: 116, serving: { label: '1 bowl', grams: 200 } },
  { name: 'Rajma (cooked)', kcalPer100: 127, serving: { label: '1 bowl', grams: 200 } },
  { name: 'Chole / Chana masala', kcalPer100: 164, serving: { label: '1 bowl', grams: 200 } },
  { name: 'Mixed veg sabzi', kcalPer100: 90, serving: { label: '1 bowl', grams: 150 } },
  { name: 'Paneer', kcalPer100: 265, serving: { label: '100 g', grams: 100 } },
  { name: 'Paneer curry', kcalPer100: 180, serving: { label: '1 bowl', grams: 200 } },
  { name: 'Khichdi', kcalPer100: 120, serving: { label: '1 bowl', grams: 250 } },
  { name: 'Poha', kcalPer100: 130, serving: { label: '1 plate', grams: 200 } },
  { name: 'Upma', kcalPer100: 110, serving: { label: '1 plate', grams: 200 } },
  { name: 'Idli', kcalPer100: 145, serving: { label: '2 idli', grams: 80 } },
  { name: 'Dosa (plain)', kcalPer100: 168, serving: { label: '1 dosa', grams: 100 } },
  { name: 'Dhokla', kcalPer100: 160, serving: { label: '4 pieces', grams: 100 } },
  { name: 'Samosa', kcalPer100: 262, serving: { label: '1 samosa', grams: 100 } },
  { name: 'Vada pav', kcalPer100: 290, serving: { label: '1 vada pav', grams: 150 } },
  { name: 'Pav bhaji', kcalPer100: 150, serving: { label: '1 plate', grams: 300 } },
  { name: 'Chicken biryani', kcalPer100: 180, serving: { label: '1 plate', grams: 300 } },
  { name: 'Veg biryani / pulao', kcalPer100: 150, serving: { label: '1 plate', grams: 300 } },
  { name: 'Chicken curry', kcalPer100: 160, serving: { label: '1 bowl', grams: 200 } },
  { name: 'Egg curry', kcalPer100: 140, serving: { label: '1 bowl', grams: 200 } },
  { name: 'Gulab jamun', kcalPer100: 375, serving: { label: '1 piece', grams: 40 } },
  { name: 'Ladoo', kcalPer100: 430, serving: { label: '1 ladoo', grams: 30 } },
  { name: 'Jalebi', kcalPer100: 400, serving: { label: '2 pieces', grams: 60 } },
  { name: 'Tea (milk + sugar)', kcalPer100: 40, serving: { label: '1 cup', grams: 150 } },
  { name: 'Coffee (milk + sugar)', kcalPer100: 45, serving: { label: '1 cup', grams: 150 } },
  { name: 'Black coffee', kcalPer100: 2, serving: { label: '1 cup', grams: 200 } },
  { name: 'Ghee', kcalPer100: 900, serving: { label: '1 tsp', grams: 5 } },
  { name: 'Sugar', kcalPer100: 387, serving: { label: '1 tsp', grams: 4 } },

  // ── Protein ──
  { name: 'Chicken breast (cooked)', kcalPer100: 165, serving: { label: '150 g', grams: 150 } },
  { name: 'Chicken thigh (cooked)', kcalPer100: 209, serving: { label: '150 g', grams: 150 } },
  { name: 'Egg (boiled)', kcalPer100: 155, serving: { label: '1 egg', grams: 50 } },
  { name: 'Egg white', kcalPer100: 52, serving: { label: '1 white', grams: 33 } },
  { name: 'Omelette (2 eggs)', kcalPer100: 190, serving: { label: '1 omelette', grams: 120 } },
  { name: 'Fish (grilled)', kcalPer100: 130, serving: { label: '150 g', grams: 150 } },
  { name: 'Prawns', kcalPer100: 99, serving: { label: '100 g', grams: 100 } },
  { name: 'Mutton (cooked)', kcalPer100: 294, serving: { label: '150 g', grams: 150 } },
  { name: 'Tofu', kcalPer100: 76, serving: { label: '100 g', grams: 100 } },
  { name: 'Soya chunks (dry)', kcalPer100: 345, serving: { label: '50 g', grams: 50 } },
  { name: 'Whey protein', kcalPer100: 400, serving: { label: '1 scoop', grams: 30 } },
  { name: 'Protein bar', kcalPer100: 350, serving: { label: '1 bar', grams: 60 } },
  { name: 'Greek yogurt', kcalPer100: 59, serving: { label: '1 cup', grams: 170 } },
  { name: 'Curd / Dahi', kcalPer100: 60, serving: { label: '1 bowl', grams: 150 } },
  { name: 'Milk (full cream)', kcalPer100: 61, serving: { label: '1 glass', grams: 250 } },
  { name: 'Milk (toned)', kcalPer100: 48, serving: { label: '1 glass', grams: 250 } },
  { name: 'Cheese slice', kcalPer100: 402, serving: { label: '1 slice', grams: 20 } },

  // ── Grains & breakfast ──
  { name: 'Oats (dry)', kcalPer100: 389, serving: { label: '40 g', grams: 40 } },
  { name: 'Bread (white)', kcalPer100: 265, serving: { label: '1 slice', grams: 30 } },
  { name: 'Bread (brown / wheat)', kcalPer100: 250, serving: { label: '1 slice', grams: 30 } },
  { name: 'Cornflakes', kcalPer100: 357, serving: { label: '30 g', grams: 30 } },
  { name: 'Granola', kcalPer100: 471, serving: { label: '40 g', grams: 40 } },
  { name: 'Pasta (cooked)', kcalPer100: 131, serving: { label: '1 plate', grams: 200 } },
  { name: 'Noodles / Maggi (cooked)', kcalPer100: 138, serving: { label: '1 plate', grams: 250 } },
  { name: 'Quinoa (cooked)', kcalPer100: 120, serving: { label: '1 bowl', grams: 150 } },
  { name: 'Potato (boiled)', kcalPer100: 87, serving: { label: '1 medium', grams: 150 } },
  { name: 'Sweet potato', kcalPer100: 90, serving: { label: '1 medium', grams: 150 } },

  // ── Fruit & veg ──
  { name: 'Banana', kcalPer100: 89, serving: { label: '1 medium', grams: 118 } },
  { name: 'Apple', kcalPer100: 52, serving: { label: '1 medium', grams: 180 } },
  { name: 'Orange', kcalPer100: 47, serving: { label: '1 medium', grams: 130 } },
  { name: 'Mango', kcalPer100: 60, serving: { label: '1 cup', grams: 165 } },
  { name: 'Grapes', kcalPer100: 69, serving: { label: '1 cup', grams: 150 } },
  { name: 'Watermelon', kcalPer100: 30, serving: { label: '1 cup', grams: 150 } },
  { name: 'Papaya', kcalPer100: 43, serving: { label: '1 cup', grams: 150 } },
  { name: 'Pomegranate', kcalPer100: 83, serving: { label: '1 cup', grams: 150 } },
  { name: 'Dates', kcalPer100: 282, serving: { label: '2 dates', grams: 16 } },
  { name: 'Avocado', kcalPer100: 160, serving: { label: '½ avocado', grams: 70 } },
  { name: 'Broccoli', kcalPer100: 34, serving: { label: '1 cup', grams: 90 } },
  { name: 'Spinach (cooked)', kcalPer100: 23, serving: { label: '1 cup', grams: 180 } },
  { name: 'Carrot', kcalPer100: 41, serving: { label: '1 medium', grams: 60 } },
  { name: 'Cucumber', kcalPer100: 15, serving: { label: '1 cup', grams: 100 } },
  { name: 'Tomato', kcalPer100: 18, serving: { label: '1 medium', grams: 120 } },
  { name: 'Salad (mixed, no dressing)', kcalPer100: 25, serving: { label: '1 bowl', grams: 150 } },

  // ── Nuts, fats, snacks ──
  { name: 'Almonds', kcalPer100: 579, serving: { label: '10 almonds', grams: 12 } },
  { name: 'Peanuts', kcalPer100: 567, serving: { label: 'handful', grams: 30 } },
  { name: 'Cashews', kcalPer100: 553, serving: { label: '10 cashews', grams: 15 } },
  { name: 'Walnuts', kcalPer100: 654, serving: { label: '4 halves', grams: 15 } },
  { name: 'Peanut butter', kcalPer100: 588, serving: { label: '1 tbsp', grams: 16 } },
  { name: 'Olive oil', kcalPer100: 884, serving: { label: '1 tbsp', grams: 14 } },
  { name: 'Butter', kcalPer100: 717, serving: { label: '1 tsp', grams: 5 } },
  { name: 'Honey', kcalPer100: 304, serving: { label: '1 tbsp', grams: 21 } },
  { name: 'Dark chocolate', kcalPer100: 546, serving: { label: '2 squares', grams: 20 } },
  { name: 'Chips (packet)', kcalPer100: 536, serving: { label: 'small pack', grams: 30 } },
  { name: 'Biscuits', kcalPer100: 480, serving: { label: '2 biscuits', grams: 20 } },
  { name: 'Ice cream', kcalPer100: 207, serving: { label: '1 scoop', grams: 70 } },
  { name: 'Pizza', kcalPer100: 266, serving: { label: '1 slice', grams: 100 } },
  { name: 'Burger', kcalPer100: 295, serving: { label: '1 burger', grams: 200 } },
  { name: 'French fries', kcalPer100: 312, serving: { label: 'medium', grams: 110 } },

  // ── Drinks ──
  { name: 'Cola / soft drink', kcalPer100: 42, serving: { label: '1 can', grams: 330 } },
  { name: 'Orange juice', kcalPer100: 45, serving: { label: '1 glass', grams: 250 } },
  { name: 'Lassi (sweet)', kcalPer100: 90, serving: { label: '1 glass', grams: 250 } },
  { name: 'Buttermilk / Chaas', kcalPer100: 30, serving: { label: '1 glass', grams: 250 } },
  { name: 'Coconut water', kcalPer100: 19, serving: { label: '1 glass', grams: 250 } },
  { name: 'Beer', kcalPer100: 43, serving: { label: '1 bottle', grams: 330 } },
];

export function searchFoods(query: string, limit = 8): FoodItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = FOODS.filter(f => f.name.toLowerCase().startsWith(q));
  const contains = FOODS.filter(f => !f.name.toLowerCase().startsWith(q) && f.name.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, limit);
}

export function kcalFor(food: FoodItem, grams: number): number {
  return Math.round((food.kcalPer100 * grams) / 100);
}
