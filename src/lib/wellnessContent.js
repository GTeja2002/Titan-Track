// Static content datasets for recipes and healthy tips
// Feel free to modify recipes, ingredients, steps, and tips here directly!

export const recipes = [
    {
        name: 'Oats & Berry Bowl',
        desc: 'A healthy and delicious start to your day.',
        cal: 320,
        time: '10 mins',
        image: '/assets/recipes/oats-and-berry-bowl.png',
        protein: 10,
        carbs: 52,
        fat: 6,
        ingredients: [
            '1 cup Rolled Oats',
            '2 cups Almond Milk (or water)',
            '1/2 cup Fresh Mixed Berries (strawberries, blueberries)',
            '1 tbsp Seeds (chia or flaxseed)',
            '1 tbsp Maple Syrup or Honey'
        ],
        steps: [
            'Add oats and milk to a saucepan. Bring to a boil, then simmer for 5 minutes, stirring occasionally.',
            'Pour the cooked oats into a serving bowl.',
            'Top with fresh washed berries and a sprinkle of seeds.',
            'Drizzle with maple syrup or honey, and serve warm.'
        ]
    },
    {
        name: 'Chickpea Salad',
        desc: 'High protein, fresh and filling.',
        cal: 450,
        time: '15 mins',
        image: '/assets/recipes/chickpea-salad.png',
        protein: 15,
        carbs: 40,
        fat: 12,
        ingredients: [
            '1 can (400g) Chickpeas, drained and rinsed',
            '1 medium Cucumber, diced',
            '1 cup Cherry Tomatoes, halved',
            '1/2 Red Onion, finely sliced',
            '2 tbsp Olive Oil',
            '1 tbsp Lemon Juice',
            'Salt and Black Pepper to taste',
            '50g Crumbled Feta Cheese (optional)'
        ],
        steps: [
            'Place the rinsed chickpeas, chopped cucumber, tomatoes, and red onion into a large mixing bowl.',
            'In a small cup, whisk the olive oil, freshly squeezed lemon juice, salt, and pepper.',
            'Pour the dressing over the salad and toss well to combine.',
            'Top with crumbled feta cheese if desired, and serve chilled.'
        ]
    },
    {
        name: 'Quinoa Veg Bowl',
        desc: 'Packed with nutrients and flavor.',
        cal: 500,
        time: '20 mins',
        image: '/assets/recipes/quinoa-veg-bowl.png',
        protein: 14,
        carbs: 60,
        fat: 14,
        ingredients: [
            '1 cup Quinoa, uncooked',
            '1 cup Broccoli florets',
            '1 Red Bell Pepper, sliced',
            '1/2 Avocado, sliced',
            '2 tbsp Tahini dressing',
            '1 tbsp Soy sauce or Tamari'
        ],
        steps: [
            'Rinse quinoa and cook according to package instructions (usually boil with 2 cups water for 15 mins).',
            'Lightly steam the broccoli florets and sauté the sliced bell pepper in a pan for 4-5 minutes.',
            'Divide cooked quinoa into servings, then place steamed broccoli, bell pepper, and sliced avocado on top.',
            'Drizzle with tahini dressing and soy sauce before serving.'
        ]
    },
    {
        name: 'Lentil Soup',
        desc: 'Warm, healthy and comforting.',
        cal: 300,
        time: '25 mins',
        image: '/assets/recipes/lentil-soup.png',
        protein: 18,
        carbs: 35,
        fat: 2,
        ingredients: [
            '1 cup Brown or Green Lentils, rinsed',
            '1 small Onion, chopped',
            '2 Cloves Garlic, minced',
            '2 medium Carrots, diced',
            '4 cups Vegetable Broth',
            '1 tsp Ground Cumin',
            '1 tbsp Olive Oil'
        ],
        steps: [
            'Heat olive oil in a large pot, then add chopped onion, garlic, and diced carrots. Sauté for 3-4 minutes until softened.',
            'Stir in ground cumin, then add the rinsed lentils and pour in the vegetable broth.',
            'Bring the soup to a boil, then reduce heat, cover, and let it simmer for 20-25 minutes until lentils are tender.',
            'Season with salt and pepper to taste, and serve hot.'
        ]
    }
];

export const tips = [
    {
        title: '10 Weight Loss Tips That Actually Work',
        readTime: '5 min read',
        image: '/assets/tips/weight.png',
        content: [
            'Weight loss can be achievable and sustainable with the right daily choices. Here are key evidence-backed actions:',
            '👉 Eat a high-protein breakfast: Boosts satiety and curbs cravings.',
            '👉 Avoid sugary drinks and fruit juice: Free sugars contribute to weight accumulation.',
            '👉 Drink water before meals: A glass of water 30 mins before eating increases fullness.',
            '👉 Choose weight-loss-friendly foods: Incorporate high fiber and lean protein choices.',
            '👉 Eat soluble fiber: Helps break down fats in the digestive tract.',
            '👉 Drink coffee or tea: Caffeine can boost metabolic activity slightly.',
            '👉 Base your diet on whole foods: They are more filling and less processed.',
            '👉 Eat slowly: Gives your body time to register satiety hormones.',
            '👉 Weigh yourself regularly: Keeps you mindful of weight trends.',
            '👉 Get good quality sleep: Poor rest is one of the strongest risk factors for weight gain.'
        ]
    },
    {
        title: 'Importance of Protein in Diet',
        readTime: '4 min read',
        image: '/assets/tips/writing.png',
        content: [
            'Protein is the building block of life and crucial for body restoration. Here is why you need it:',
            '1. High protein intake boosts metabolism, helping you burn slightly more calories throughout the day.',
            '2. It coordinates satiety signals, reducing the hunger hormone ghrelin while boosting peptic hormones that signal fullness.',
            '3. Protein helps preserve lean muscle mass during weight loss, ensuring fat tissue is reduced while muscle is retained.',
            '4. It supports cell repair and enzyme synthesis, making it essential after resistance training.',
            'Excellent sources include eggs, lean beef, chicken breast, Greek yogurt, fish, lentils, and organic soy.'
        ]
    },
    {
        title: 'How to Stay Motivated Daily',
        readTime: '5 min read',
        image: '/assets/tips/stop.png',
        content: [
            'Motivation gets you started, but discipline keeps you going. Try these daily practices:',
            '✅ Set concrete micro-targets (e.g. log water, reach 8,000 steps) instead of vague long-term goals.',
            '✅ Focus on consistency over perfection. Logging a brief walk is better than skipping physical activity.',
            '✅ Document your wins: Celebrate completion streaks or body metrics improvements.',
            '✅ Find a routine time for your wellness checkups so it becomes a habit.',
            '✅ Focus on how good lifestyle habits make you feel (energy levels, mental clarity, clean digestions) rather than just scale metrics.'
        ]
    },
    {
        title: 'Common Mistakes You Should Avoid',
        readTime: '5 min read',
        image: '/assets/tips/healthy.png',
        content: [
            'Avoid these common health mistakes when starting your fitness journey:',
            '❌ skipping meals: skipping breakfast or dinner can lead to overeating later.',
            '❌ ignoring liquid calories: soft drinks, sport options, and cream coffees carry hidden calories without triggering fullness.',
            '❌ overestimating workout calorie burns: tracker estimations can be high; avoid over-eating to reward exercise.',
            '❌ not getting enough sleep: sleep deprivation shifts hormones, increasing cravings for sugary foods.',
            '❌ comparing your progress to others: everyone’s body reacts differently. Focus on outperforming your own baseline.'
        ]
    }
];
