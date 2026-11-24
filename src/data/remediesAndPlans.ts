import type {
  DietMealSlot,
  ExtendedPatientProfile,
  HomeRemedyItem,
  MealOptionItem,
  PersonalizedWellnessPlan,
  WellnessGoal,
} from '../types/clinical';

export const VERIFIED_HOME_REMEDIES: HomeRemedyItem[] = [
  {
    id: 'rem_ors',
    category: 'STOMACH_HYDRATION',
    title_en: 'WHO Home ORS & Electrolyte Hydration',
    title_ur: 'گھر پر او آر ایس اور نمکیات کی بحالی',
    ingredients_en: '1 liter clean boiled & cooled water, 6 level teaspoons sugar, 1/2 level teaspoon salt (or 1 WHO ORS packet).',
    ingredients_ur: '1 لیٹر ابلا اور ٹھنڈا صاف پانی، 6 چپٹے چمچ چینی، آدھا چپٹا چمچ نمک (یا 1 او آر ایس پیکٹ)۔',
    steps_en: [
      'Wash hands thoroughly and dissolve sugar and salt completely in cooled boiled water.',
      'Sip slowly every 5–10 minutes after loose stools, fever sweating, or heat exposure.',
      'Discard unused homemade ORS after 24 hours and prepare a fresh batch.',
    ],
    steps_ur: [
      'ہاتھ دھو کر ابلے اور ٹھنڈے پانی میں چینی اور نمک اچھی طرح حل کریں۔',
      'اسہال، پسینے یا گرمی کے بعد ہر 5 سے 10 منٹ میں تھوڑا تھوڑا پلائیں۔',
      'تیار شدہ او آر ایس 24 گھنٹے بعد ضائع کر دیں اور نیا بنائیں۔',
    ],
    caution_en: 'Avoid extra salt if kidney failure or severe heart failure is present; seek clinic immediately if unable to drink, sunken eyes, or vomiting everything.',
    caution_ur: 'گردوں یا دل کے شدید مرض میں احتیاط کریں؛ قے نہ رکے یا مریض پی نہ سکے تو فوری ہسپتال جائیں۔',
  },
  {
    id: 'rem_haldi_throat',
    category: 'FEVER_THROAT',
    title_en: 'Warm Turmeric Milk & Saltwater Gargle',
    title_ur: 'گرم ہلدی دودھ اور نیم گرم نمکین غرارے',
    ingredients_en: '1/2 tsp turmeric in 1 cup warm milk; 1/2 tsp salt in 1 glass warm water for gargles.',
    ingredients_ur: 'ایک کپ نیم گرم دودھ میں آدھا چمچ ہلدی؛ غراروں کے لیے نیم گرم پانی میں آدھا چمچ نمک۔',
    steps_en: [
      'Gargle warm salt water for 30 seconds, 3 times daily, to reduce throat irritation and swelling.',
      'Drink warm turmeric milk before rest to soothe mild dryness and promote comfort.',
    ],
    steps_ur: [
      'گلے کی سوزش اور خراش کم کرنے کے لیے دن میں 3 بار نیم گرم نمکین پانی سے غرارے کریں۔',
      'سونے سے پہلے گرم ہلدی دودھ پئیں تاکہ گلے کو سکون ملے۔',
    ],
    caution_en: 'Seek clinic evaluation if high fever lasts > 48 hours, tonsils have white spots, or breathing feels fast/labored.',
    caution_ur: 'اگر تیز بخار 48 گھنٹے سے زائد رہے یا سانس لینے میں دشواری ہو تو فوری معائنہ کروائیں۔',
  },
  {
    id: 'rem_honey_ginger_cough',
    category: 'FEVER_THROAT',
    title_en: 'Warm Ginger-Honey Soother for Mild Dry Cough (Age > 1 Year)',
    title_ur: 'خشک کھانسی کے لیے ادرک اور شہد کا نیم گرم قہوہ (1 سال سے زائد)',
    ingredients_en: '1 tsp pure honey, 3 slices fresh crushed ginger, 1 cup lukewarm water or tulsi/mint tea.',
    ingredients_ur: '1 چمچ خالص شہد، تازہ ادرک کے 3 ٹکڑے، 1 کپ نیم گرم پانی یا پودینہ قہوہ۔',
    steps_en: [
      'Simmer fresh ginger in water for 5 minutes, let it cool until lukewarm (not boiling).',
      'Stir in 1 teaspoon honey and sip slowly before sleep to calm nocturnal cough reflex.',
    ],
    steps_ur: [
      'ادرک کو پانی میں 5 منٹ ہلکی آنچ پر پکائیں اور نیم گرم ہونے دیں۔',
      'اس میں 1 چائے کا چمچ شہد ملا کر سونے سے پہلے آہستہ آہستہ پئیں۔',
    ],
    caution_en: 'STRICT SAFETY RULE: NEVER give honey to infants under 12 months (risk of infant botulism). Cough lasting > 14 days needs TB/clinic screening.',
    caution_ur: 'سخت احتیاط: 1 سال سے کم عمر بچے کو شہد ہرگز نہ دیں۔ 14 دن سے زیادہ کھانسی پر ٹی بی/کلینک ٹیسٹ ضروری ہے۔',
  },
  {
    id: 'rem_steam_sinus',
    category: 'FEVER_THROAT',
    title_en: 'Safe Steam Inhalation & Warm Saline Drops',
    title_ur: 'بند ناک کھولنے کے لیے بھاپ اور نمکین قطرے',
    ingredients_en: 'Bowl of hot water (not on stove), clean towel; or sterile nasal saline spray/drops.',
    ingredients_ur: 'گرم پانی کا پیالہ (چولہے سے اترا ہوا)، صاف تولیہ یا ناک کے نمکین قطرے۔',
    steps_en: [
      'Sit comfortably away from heat source, drape towel loosely, and breathe gentle warm steam for 5–8 minutes.',
      'For young children, use only lukewarm bathroom humidity and 1–2 sterile saline nose drops — never open boiling bowls.',
    ],
    steps_ur: [
      'آرام سے بیٹھ کر محفوظ فاصلے سے 5 سے 8 منٹ ہلکی بھاپ لیں (بچوں کو ابلتے پانی کے قریب نہ لائیں)۔',
      'چھوٹے بچوں کے لیے صرف ناک میں نمکین قطرے اور باتھ روم کی ہلکی بھاپ استعمال کریں۔',
    ],
    caution_en: 'Do not use scalding bowls near children (burn hazard). Seek 1122 immediately for chest indrawing, blue lips, or wheezing distress.',
    caution_ur: 'ابلتی پتیلی بچوں کے قریب ہرگز نہ رکھیں۔ پسلیوں کے دھنسنے یا سانس کی تکلیف پر فوراً 1122 پر کال کریں۔',
  },
  {
    id: 'rem_ginger_mint',
    category: 'STOMACH_HYDRATION',
    title_en: 'Ginger-Mint Kahwa for Nausea, Gas & Indigestion',
    title_ur: 'متلی، گیس اور بدہضمی کے لیے ادرک پودینہ قہوہ',
    ingredients_en: '3 thin slices fresh ginger, 6 fresh mint leaves, 1/4 tsp crushed saunf (fennel), 1 cup hot water.',
    ingredients_ur: 'تازہ ادرک کے 3 پتلے ٹکڑے، پودینے کے 6 پتے، چوتھائی چمچ سونف، 1 کپ گرم پانی۔',
    steps_en: [
      'Steep ginger, mint, and fennel in covered hot water for 5–7 minutes, then strain.',
      'Sip lukewarm slowly rather than chugging fizzy or chilled drinks; keep meals bland (khichdi/banana).',
    ],
    steps_ur: [
      'ادرک، پودینہ اور سونف گرم پانی میں 5 سے 7 منٹ ڈھانپ کر رکھیں پھر چھان لیں۔',
      'سوڈا یا ٹھنڈے مشروبات کے بجائے نیم گرم گھونٹ آہستہ پئیں اور ہلکی غذا (کھچڑی یا کیلا) لیں۔',
    ],
    caution_en: 'Seek urgent hospital care for severe right-lower belly pain, blood in vomit/stool, black tarry stools, or persistent vomiting.',
    caution_ur: 'پیٹ میں شدید درد، قے یا پاخانے میں خون آنے پر فوری ایمرجنسی ہسپتال جائیں۔',
  },
  {
    id: 'rem_isabgol_fiber',
    category: 'STOMACH_HYDRATION',
    title_en: 'Psyllium Husk (Isabgol) for Mild Constipation & Gut Comfort',
    title_ur: 'قبض اور معدے کی تیزابیت کے لیے اسپغول کا محفوظ استعمال',
    ingredients_en: '1 level teaspoon plain Isabgol husk, 1 full glass lukewarm water or unsweetened thin yogurt/lassi.',
    ingredients_ur: '1 چمچ سادہ اسپغول کی بھوسی، 1 پورا گلاس نیم گرم پانی یا پتلا دہی۔',
    steps_en: [
      'Stir 1 teaspoon Isabgol briskly into a full glass of water and drink immediately.',
      'Follow with another half glass of clean water; stay hydrated throughout the day.',
    ],
    steps_ur: [
      '1 چمچ اسپغول ایک پورے گلاس پانی میں گھول کر فوراً پی لیں۔',
      'اس کے فوراً بعد آدھا گلاس مزید سادہ پانی پئیں تاکہ آنتوں میں خشکی نہ ہو۔',
    ],
    caution_en: 'NEVER swallow dry Isabgol or take without adequate water (choking/bowel blockage hazard). Avoid if sudden severe abdominal pain or inability to pass gas occurs.',
    caution_ur: 'اسپغول خشک ہرگز نہ نگلیں اور کم پانی کے ساتھ نہ لیں۔ شدید پیٹ درد میں استعمال نہ کریں۔',
  },
  {
    id: 'rem_heat_cooling',
    category: 'HEAT_SKIN',
    title_en: 'Heat Exhaustion Shade & Cool Wet-Cloth Cooling',
    title_ur: 'لو لگنے پر فوری ٹھنڈک اور سایہ دار آرام',
    ingredients_en: 'Cool clean water, damp cotton towels, shaded ventilated room or fan.',
    ingredients_ur: 'صاف ٹھنڈا پانی، گیلے سوتی کپڑے اور سایہ دار ہوا دار کمرہ یا پنکھا۔',
    steps_en: [
      'Move immediately to shade or fan airflow, lie down with legs slightly elevated, and loosen outer clothing.',
      'Place cool damp cloths on neck, armpits, groin, and forehead while sipping cool water or ORS.',
    ],
    steps_ur: [
      'مریض کو فوراً سایہ اور ہوا دار جگہ لٹا کر ٹانگیں ہلکی اونچی کریں اور تنگ کپڑے ڈھیلے کریں۔',
      'گردن، بغلوں اور ماتھے پر ٹھنڈی گیلی پٹیاں رکھیں اور تھوڑا تھوڑا او آر ایس دیں۔',
    ],
    caution_en: 'If confused, fainting, seizing, vomiting, or hot dry skin with no sweat (heat stroke), call 1122 immediately.',
    caution_ur: 'اگر مریض بہکی باتیں کرے یا بے ہوش ہو جائے تو فوراً 1122 پر کال کریں۔',
  },
  {
    id: 'rem_burn_cool_water',
    category: 'HEAT_SKIN',
    title_en: 'First Aid for Minor Kitchen Burns (Cool Running Water Only)',
    title_ur: 'معمولی جلنے کی فوری ابتدائی امداد (صرف ٹھنڈا بہتا پانی)',
    ingredients_en: 'Cool (not ice) running tap water for 20 minutes, clean non-fluffy cling film or sterile gauze.',
    ingredients_ur: 'نلکے کا ٹھنڈا بہتا پانی (برف نہیں) 20 منٹ تک، صاف کلنگ فلم یا جراثیم سے پاک پٹی۔',
    steps_en: [
      'Hold the burned skin gently under cool running tap water for a full 20 minutes to stop deep tissue heat.',
      'Gently remove rings/watches before swelling starts, then cover loosely with clean non-stick wrap or sterile dressing.',
    ],
    steps_ur: [
      'جلی ہوئی جگہ کو فوری طور پر 20 منٹ تک ٹھنڈے بہتے پانی کے نیچے رکھیں۔',
      'سوجن سے پہلے انگوٹھی یا گھڑی اتار دیں اور صاف غیر چپکنے والی پٹی یا کلنگ فلم ہلکی سی لپیٹ دیں۔',
    ],
    caution_en: 'MYTH ALERT: NEVER apply toothpaste, butter, ice, egg, ink, or turmeric powder on burns (causes severe infection). Rush to hospital for face/hand/deep/large burns.',
    caution_ur: 'خبردار: جلے ہوئے زخم پر ٹوتھ پیسٹ، مکھن، برف یا ہلدی ہرگز نہ لگائیں۔ گہرے یا چہرے/ہاتھ کے جلنے پر فوری ہسپتال جائیں۔',
  },
  {
    id: 'rem_minor_cut',
    category: 'HEAT_SKIN',
    title_en: 'Clean Soap-and-Water First Aid for Minor Cuts & Scrapes',
    title_ur: 'معمولی زخم اور خراش کی صفائی اور پٹی',
    ingredients_en: 'Clean running water, mild soap, clean folded gauze pad or cloth.',
    ingredients_ur: 'صاف بہتا پانی، سادہ صابن اور صاف سوتی پٹی یا گوز۔',
    steps_en: [
      'Apply gentle direct pressure with clean cloth for 5–10 minutes until minor bleeding stops.',
      'Rinse wound thoroughly under clean running water (wash skin around it with mild soap) and cover with clean dry gauze.',
    ],
    steps_ur: [
      'صاف کپڑے سے 5 سے 10 منٹ ہلکا دباؤ ڈال کر خون روکیں۔',
      'زخم کو صاف بہتے پانی سے اچھی طرح دھوئیں اور صاف خشک پٹی باندھ دیں۔',
    ],
    caution_en: 'Do not pack soil, surma, tobacco, or ash into cuts (tetanus danger). Visit clinic for deep/gaping cuts, animal bites, or tetanus booster check.',
    caution_ur: 'زخم میں مٹی، سرمہ یا راکھ ہرگز نہ لگائیں۔ گہرے زخم یا کتے کے کاٹنے پر فوری ہسپتال اور تشنج کا ٹیکہ لگوائیں۔',
  },
  {
    id: 'rem_sprain_rice',
    category: 'PAIN_RECOVERY',
    title_en: 'Ankle / Wrist Sprain Rest & Wrapped Cold Compress',
    title_ur: 'موچ اور ہلکی سوجن کے لیے آرام اور برف کی ٹکور',
    ingredients_en: 'Ice cubes wrapped in a damp towel (never bare ice on skin), pillow for elevation.',
    ingredients_ur: 'گیلے کپڑے میں لپٹی ہوئی برف (براہِ راست جلد پر نہیں)، سہارے کے لیے تکیہ۔',
    steps_en: [
      'Rest the injured joint and elevate it on a pillow above chest level when sitting or lying down.',
      'Apply towel-wrapped ice pack for 15 minutes every 2–3 hours during the first 24–48 hours to limit swelling.',
    ],
    steps_ur: [
      'متاثرہ جوڑ کو آرام دیں اور بیٹھتے یا لیٹتے وقت تکیے پر ہلکا اونچا رکھیں۔',
      'پہلے 24 سے 48 گھنٹے ہر دو تین گھنٹے بعد کپڑے میں لپٹی برف سے 15 منٹ ٹکور کریں۔',
    ],
    caution_en: 'Seek X-ray/hospital care if unable to bear weight for 4 steps, visible bone deformity, numbness, or severe throbbing pain.',
    caution_ur: 'اگر پاؤں زمین پر نہ رکھا جا سکے، ہڈی ٹیڑھی لگے یا سن پن ہو تو فوری ہسپتال جائیں۔',
  },
  {
    id: 'rem_tension_headache',
    category: 'PAIN_RECOVERY',
    title_en: 'Hydration, Screen Rest & Warm Neck Compress for Tension Headache',
    title_ur: 'پٹھوں کے کھنچاؤ والے سر درد کے لیے پانی اور گردن کی ٹکور',
    ingredients_en: '1–2 glasses clean water, warm damp towel on back of neck, quiet dim room.',
    ingredients_ur: '1 سے 2 گلاس صاف پانی، گردن کے پیچھے نیم گرم گیلا تولیہ، پُرسکون کمرہ۔',
    steps_en: [
      'Drink 1–2 glasses of water (mild dehydration often triggers afternoon headaches) and step away from bright screens for 15 minutes.',
      'Place a warm damp towel behind the neck/shoulders to relax tight muscles and rest quietly.',
    ],
    steps_ur: [
      '1 سے 2 گلاس صاف پانی پئیں اور اسکرین سے 15 منٹ کے لیے دور رہیں۔',
      'گردن اور کندھوں کے پیچھے نیم گرم تولیہ رکھ کر پٹھوں کو ڈھیلا چھوڑیں۔',
    ],
    caution_en: 'EMERGENCY: Sudden "worst-ever" thunderclap headache, stiff neck, fever, blurred vision, slurred speech, or BP >= 180/120 requires immediate 1122/hospital care.',
    caution_ur: 'فوری خطرہ: اچانک شدید ترین سر درد، گردن میں اکڑاؤ، بخار، دھندلی نظر یا بی پی 180/120 پر فوری ہسپتال جائیں۔',
  },
  {
    id: 'rem_sleep_calm',
    category: 'STRESS_SLEEP',
    title_en: 'Cyclic Sighing & Caffeine-Free Wind-Down for Deeper Sleep',
    title_ur: 'پُرسکون نیند اور ذہنی سکون کے لیے سانس کی مشق',
    ingredients_en: '5 minutes quiet breathing, caffeine-free mint/chamomile tea, dim evening light.',
    ingredients_ur: '5 منٹ پُرسکون سانس کی مشق، پودینہ یا بابونہ قہوہ اور مدھم روشنی۔',
    steps_en: [
      'Practice 6 cycles of double-inhale through the nose followed by a slow 6-second mouth exhale.',
      'Stop strong chai/tea, coffee, and heavy fried food at least 4–5 hours before bedtime; keep room cool and dark.',
    ],
    steps_ur: [
      'ناک سے دو بار گہرا سانس لے کر منہ سے 6 سیکنڈ میں آہستہ باہر نکالنے کے 6 چکر کریں۔',
      'سونے سے 5 گھنٹے پہلے چائے، کافی اور بھاری تلی ہوئی خوراک سے پرہیز کریں۔',
    ],
    caution_en: 'Chest tightness, sweating, jaw/arm pain, or sudden shortness of breath must NEVER be dismissed as stress — call 1122.',
    caution_ur: 'سینے میں جکڑن یا بازو میں درد کو کبھی محض ذہنی دباؤ نہ سمجھیں، فوراً 1122 پر کال کریں۔',
  },
];

export interface BmiAssessment {
  bmi: number | null;
  category: 'UNDERWEIGHT' | 'OPTIMAL' | 'OVERWEIGHT' | 'OBESE' | 'UNAVAILABLE';
  label_en: string;
  label_ur: string;
  idealMinKg: number | null;
  idealMaxKg: number | null;
  recommendedDeltaKg: number;
  recommendedGoal: WellnessGoal;
  recommendedWaterMl: number;
  recommendedSteps: number;
  advice_en: string;
  advice_ur: string;
}

/**
 * Deterministic South Asian / WHO BMI & Body-Mass Ratio clinical assessment.
 */
export function computeBmiAssessment(
  weightKg?: number,
  heightCm?: number,
  ageMonths = 300
): BmiAssessment {
  const safeWeight = typeof weightKg === 'number' && weightKg > 2 ? weightKg : undefined;
  const safeHeight = typeof heightCm === 'number' && heightCm > 40 ? heightCm : undefined;

  if (!safeWeight || !safeHeight || ageMonths < 18 * 12) {
    const water = safeWeight ? Math.min(3500, Math.max(1500, Math.round(safeWeight * 32))) : 2200;
    const steps = ageMonths >= 60 * 12 ? 4500 : 6500;
    return {
      bmi: null,
      category: 'UNAVAILABLE',
      label_en: ageMonths < 18 * 12 ? 'Pediatric Growth Tracking' : 'Enter Height & Weight for Body Mass Advice',
      label_ur: ageMonths < 18 * 12 ? 'بچوں کی نشوونما کا ریکارڈ' : 'قد اور وزن درج کریں تاکہ درست طبی مشورہ ملے',
      idealMinKg: null,
      idealMaxKg: null,
      recommendedDeltaKg: 0,
      recommendedGoal: ageMonths >= 60 * 12 ? 'SENIOR_MOBILITY' : 'BALANCED',
      recommendedWaterMl: water,
      recommendedSteps: steps,
      advice_en:
        ageMonths < 18 * 12
          ? 'Pediatric weight is tracked by age-specific clinician curves rather than adult BMI cutoffs.'
          : 'Provide your height and weight so Tibb can calculate your healthy weight range, water intake, and step goals.',
      advice_ur:
        ageMonths < 18 * 12
          ? 'بچوں کے لیے قد اور وزن عمر کے حساب سے ڈاکٹر کے چارٹ کے مطابق دیکھا جاتا ہے۔'
          : 'اپنا قد اور وزن درج کریں تاکہ طب آپ کے لیے پانی، قدم اور صحت مند وزن کا ہدف تجویز کر سکے۔',
    };
  }

  const hMeters = safeHeight / 100;
  const bmi = Math.round((safeWeight / (hMeters * hMeters)) * 10) / 10;
  const idealMinKg = Math.round(18.5 * hMeters * hMeters * 10) / 10;
  const idealMaxKg = Math.round(22.9 * hMeters * hMeters * 10) / 10;

  const isSenior = ageMonths >= 60 * 12;
  const baseWater = Math.min(3600, Math.max(2000, Math.round(safeWeight * 33)));

  if (bmi < 18.5) {
    const gainNeeded = Math.max(0.5, Math.round((idealMinKg - safeWeight) * 10) / 10);
    return {
      bmi,
      category: 'UNDERWEIGHT',
      label_en: 'Underweight · Healthy Weight Gain Needed',
      label_ur: 'کم وزن · صحت مند وزن بڑھانے کی ضرورت',
      idealMinKg,
      idealMaxKg,
      recommendedDeltaKg: gainNeeded,
      recommendedGoal: 'MUSCLE_GAIN',
      recommendedWaterMl: baseWater,
      recommendedSteps: isSenior ? 4500 : 6000,
      advice_en: `Your BMI is ${bmi}. To reach your healthy range (${idealMinKg}–${idealMaxKg} kg), aim to gain ~${gainNeeded} kg gradually through protein-rich home meals & strength work.`,
      advice_ur: `آپ کا بی ایم آئی ${bmi} ہے۔ صحت مند وزن (${idealMinKg} تا ${idealMaxKg} کلو) کے لیے تقریباً ${gainNeeded} کلو وزن پروٹین اور متوازن غذا سے بتدریج بڑھائیں۔`,
    };
  }

  if (bmi <= 22.9) {
    return {
      bmi,
      category: 'OPTIMAL',
      label_en: 'Optimal Healthy Range',
      label_ur: 'مثالی اور صحت مند وزن',
      idealMinKg,
      idealMaxKg,
      recommendedDeltaKg: 0,
      recommendedGoal: isSenior ? 'SENIOR_MOBILITY' : 'BALANCED',
      recommendedWaterMl: baseWater,
      recommendedSteps: isSenior ? 5000 : 7500,
      advice_en: `Your BMI is ${bmi}, right inside the South Asian healthy range (${idealMinKg}–${idealMaxKg} kg). Focus on steady hydration, daily movement, and balanced meals.`,
      advice_ur: `آپ کا بی ایم آئی ${bmi} ہے جو بالکل صحت مند حد (${idealMinKg} تا ${idealMaxKg} کلو) میں ہے۔ روزانہ پانی، چہل قدمی اور متوازن غذا برقرار رکھیں۔`,
    };
  }

  if (bmi < 25) {
    const loseNeeded = Math.max(0.5, Math.round((safeWeight - idealMaxKg) * 10) / 10);
    return {
      bmi,
      category: 'OVERWEIGHT',
      label_en: 'Mildly Above Optimal · Gradual Fat Loss Advised',
      label_ur: 'وزن ہلکا زیادہ · بتدریج کمی کا مشورہ',
      idealMinKg,
      idealMaxKg,
      recommendedDeltaKg: -loseNeeded,
      recommendedGoal: 'WEIGHT_LOSS',
      recommendedWaterMl: Math.min(3600, baseWater + 250),
      recommendedSteps: isSenior ? 5500 : 8500,
      advice_en: `Your BMI is ${bmi}. Shedding ~${loseNeeded} kg gently toward ${idealMaxKg} kg reduces metabolic & blood-pressure risk. Pair 8,500 daily steps with portion control.`,
      advice_ur: `آپ کا بی ایم آئی ${bmi} ہے۔ شوگر اور بی پی سے بچاؤ کے لیے تقریباً ${loseNeeded} کلو وزن بتدریج کم کر کے ${idealMaxKg} کلو تک لانا بہتر ہے۔`,
    };
  }

  const loseNeeded = Math.max(1, Math.round((safeWeight - idealMaxKg) * 10) / 10);
  return {
    bmi,
    category: 'OBESE',
    label_en: 'Elevated Body Mass · Structured Weight Loss Recommended',
    label_ur: 'زیادہ وزن · باقاعدہ وزن کم کرنے کی ضرورت',
    idealMinKg,
    idealMaxKg,
    recommendedDeltaKg: -loseNeeded,
    recommendedGoal: 'WEIGHT_LOSS',
    recommendedWaterMl: Math.min(3800, baseWater + 350),
    recommendedSteps: isSenior ? 6000 : 9500,
    advice_en: `Your BMI is ${bmi}. Gradual reduction of ~${loseNeeded} kg toward ${idealMaxKg} kg with daily brisk walking, higher hydration, and low-sugar Desi meals is strongly advised.`,
    advice_ur: `آپ کا بی ایم آئی ${bmi} ہے۔ صحت مند حد (${idealMaxKg} کلو) تک آنے کے لیے تقریباً ${loseNeeded} کلو وزن روزانہ تیز واک اور کم چکنائی والی خوراک سے بتدریج کم کریں۔`,
  };
}

function makeSlot(
  slot: DietMealSlot['slot'],
  options: MealOptionItem[],
  selectedIdx = 0
): DietMealSlot {
  const safeIdx = selectedIdx % options.length;
  const primary = options[safeIdx];
  return {
    slot,
    ...primary,
    selectedOptionIndex: safeIdx,
    alternatives: options,
  };
}

export function buildPersonalizedPlanOffline(
  person: ExtendedPatientProfile,
  goal: WellnessGoal,
  variationSeed = 0
): PersonalizedWellnessPlan {
  const hasDiabetes = person.chronicConditions.some((c) => c.includes('DIABETES')) || goal === 'DIABETES_CONTROL';
  const hasBp = person.chronicConditions.includes('HYPERTENSION') || goal === 'BP_FRIENDLY';
  const isWeightLoss = goal === 'WEIGHT_LOSS';
  const isMuscleGain = goal === 'MUSCLE_GAIN' || goal === 'ENERGY_STRENGTH';
  const isSenior = person.ageMonths >= 60 * 12 || goal === 'SENIOR_MOBILITY';

  const bmiCheck = computeBmiAssessment(person.weightKg, person.heightCm, person.ageMonths);
  const dailyWaterGoalMl = bmiCheck.recommendedWaterMl;
  const dailyStepsGoal = isSenior
    ? 4800
    : isWeightLoss
      ? Math.max(8500, bmiCheck.recommendedSteps)
      : isMuscleGain
        ? 7500
        : bmiCheck.recommendedSteps;

  const prefList = person.dietaryPreferences ?? [];
  const isVeg = prefList.some((p) => /veg/i.test(p));

  const weightLossSlots: DietMealSlot[] = [
    makeSlot(
      'Breakfast',
      [
        {
          title_en: 'Oats / Barley Daliya in Skim Milk + 1 Boiled Egg White Omelette',
          title_ur: 'جو کا دلیہ + 1 انڈے کی سفیدی کا آملیٹ (بغیر مکھن)',
          portions_en: 'High protein & soluble fiber keeps fullness high for fewer calories.',
          portions_ur: 'کم کیلوریز اور بھرپور فائبر جو دوپہر تک پیٹ بھرا رکھتا ہے۔',
          caloriesApprox: 290,
        },
        {
          title_en: '2 Thin Besan Chillas + Mint Chutney + Unsweetened Dahi',
          title_ur: '2 پتلے بیسن کے چلے + پودینے کی چٹنی + بغیر چینی دہی',
          portions_en: 'Low-GI chickpea protein keeps morning cravings steady.',
          portions_ur: 'بیسن کی پروٹین بھوک کنٹرول رکھتی ہے۔',
          caloriesApprox: 300,
        },
        {
          title_en: isVeg
            ? '1 Whole-Wheat Bran Toast + Low-Fat Paneer Scramble + Green Tea'
            : '2 Boiled Eggs (1 yolk) + 1 Small Bran Roti + Cucumber Slices',
          title_ur: isVeg
            ? '1 چوکر بریڈ + کم چکنائی پنیر بھرجی + سبز چائے'
            : '2 ابلے انڈے + 1 چھوٹی چکی روٹی + کھیرے کے قتلے',
          portions_en: 'Clean lean breakfast under 310 kcal.',
          portions_ur: '310 کیلوریز سے کم ہلکا اور غذائیت بھرا ناشتہ۔',
          caloriesApprox: 285,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Mid-Day Snack',
      [
        {
          title_en: 'Cucumber & Guava Bowl + Sugar-Free Mint Kahwa',
          title_ur: 'کھیرا اور امرود + بغیر چینی پودینہ قہوہ',
          portions_en: 'Hydrating crunch under 110 kcal.',
          portions_ur: 'کم کیلوریز اور وٹامن سی سے بھرپور۔',
          caloriesApprox: 110,
        },
        {
          title_en: 'Roasted Makhana / Foxnuts (25g) + 5 Soaked Almonds',
          title_ur: 'بھنے مکھانے (25 گرام) + 5 بھیگے بادام',
          portions_en: 'Satisfies crisp snack cravings without fried oils.',
          portions_ur: 'تلی ہوئی چیزوں کا بہترین متبادل۔',
          caloriesApprox: 135,
        },
        {
          title_en: 'Unsweetened Zeera Chaach / Thin Lassi + Chia Seeds (1 tsp)',
          title_ur: 'بغیر نمک زیرہ لسی + 1 چمچ تخمِ ملنگا / چیا',
          portions_en: 'Cooling probiotic drink promoting satiety.',
          portions_ur: 'معدے کے لیے ٹھنڈا اور ہلکا مشروب۔',
          caloriesApprox: 105,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Lunch',
      [
        {
          title_en: isVeg
            ? 'Steamed Moong Daal + Big Kachumber Salad + 1 Thin Whole-Wheat Roti'
            : '120g Grilled Chicken Breast or Tikka + Mixed Salad + 1 Thin Roti',
          title_ur: isVeg
            ? 'مونگ کی دال + بڑا کچومر سلاد + 1 پتلی چپاتی'
            : '120 گرام گرلڈ چکن تکہ + کچومر سلاد + 1 پتلی روٹی',
          portions_en: 'Eat salad first, keep cooking oil to 1 tsp.',
          portions_ur: 'پہلے سلاد کھائیں اور صرف 1 چمچ تیل استعمال کریں۔',
          caloriesApprox: 410,
        },
        {
          title_en: 'Kala Chana / Chickpea Chaat Bowl with Onion, Tomato, Lemon & 1 Roti',
          title_ur: 'کالے چنے کی چاٹ (لیموں و سبزی کے ساتھ) + 1 پتلی روٹی',
          portions_en: 'Slow-digesting legume fiber & steady afternoon energy.',
          portions_ur: 'فائبر اور پروٹین سے بھرپور دوپہر کا کھانا۔',
          caloriesApprox: 395,
        },
        {
          title_en: isVeg
            ? 'Palak Tofu / Paneer (light oil) + 1 Small Bowl Brown Rice + Raita'
            : '140g Baked/Grilled Rahu Fish + Sautéed Greens + 1 Thin Roti',
          title_ur: isVeg
            ? 'پالک پنیر (کم تیل) + چھوٹا پیالہ براؤن چاول + رائتہ'
            : '140 گرام گرلڈ مچھلی + ہلکی تلی سبزی + 1 پتلی روٹی',
          portions_en: 'Omega-rich lean protein keeps fat loss sustainable.',
          portions_ur: 'ہلکی چکنائی کے ساتھ بہترین پروٹین۔',
          caloriesApprox: 420,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Dinner',
      [
        {
          title_en: 'Clear Daal / Chicken Vegetable Soup + Sautéed Lauki or Cabbage',
          title_ur: 'سبزی اور دال کا سوپ + کم تیل میں لوکی یا بند گوبھی',
          portions_en: 'Light, early dinner at least 2.5 hours before sleep.',
          portions_ur: 'سونے سے ڈھائی گھنٹے پہلے ہلکا اور زود ہضم کھانا۔',
          caloriesApprox: 280,
        },
        {
          title_en: isVeg
            ? 'Steamed Tori / Tinda Sabzi + 1 Cup Dahi Raita (No Roti)'
            : '100g Boiled/Air-Fried Chicken Strips + Steamed Broccoli/Carrots + Raita',
          title_ur: isVeg
            ? 'توری یا ٹینڈے کی ہلکی سبزی + 1 کپ دہی رائتہ'
            : '100 گرام ہلکا گرلڈ چکن + ابلی سبزیاں + رائتہ',
          portions_en: 'Low-carb evening meal avoids overnight glucose storage.',
          portions_ur: 'رات کا ہلکا اور کم کاربوہائیڈریٹ کھانا۔',
          caloriesApprox: 295,
        },
        {
          title_en: 'Light Khichdi (1/2 cup) with Extra Vegetables + Mint Yogurt',
          title_ur: 'سبزی والی ہلکی مونگ کھچڑی (آدھا پیالہ) + پودینہ دہی',
          portions_en: 'Gentle on digestion before bedtime.',
          portions_ur: 'ہلکی اور آسانی سے ہضم ہونے والی غذا۔',
          caloriesApprox: 310,
        },
      ],
      variationSeed
    ),
  ];

  const muscleGainSlots: DietMealSlot[] = [
    makeSlot(
      'Breakfast',
      [
        {
          title_en: isVeg
            ? '2 Besan Chillas + Thick Home Dahi + 1 Banana + Handful Almonds'
            : '2 Whole Eggs + 1 Whole-Wheat Paratha (1 tsp ghee) + Unsweetened Lassi',
          title_ur: isVeg
            ? '2 بیسن روٹی + گاڑھا دہی + 1 کیلا + بادام'
            : '2 انڈے + 1 ہلکے گھی کی روٹی + دودھ یا لسی',
          portions_en: '~24g natural protein & slow-digesting complex carbs.',
          portions_ur: 'عضلات کی مضبوطی کے لیے قدرتی پروٹین اور توانائی۔',
          caloriesApprox: 480,
        },
        {
          title_en: 'Milk Oats Porridge + Peanut Butter (1 tbsp) + 3 Dates + 2 Boiled Eggs',
          title_ur: 'دودھ میں جو کا دلیہ + 1 چمچ پینٹ بٹر + 3 کھجور + 2 انڈے',
          portions_en: 'Calorie & protein boost for lean muscle recovery.',
          portions_ur: 'طاقت اور پٹھوں کی نشوونما کے لیے بھرپور ناشتہ۔',
          caloriesApprox: 520,
        },
        {
          title_en: isVeg
            ? 'Moong Daal Cheela Stuffed with Paneer + Warm Milk Glass'
            : 'Chicken & Cheese Egg Omelette + 2 Whole-Wheat Toasts',
          title_ur: isVeg
            ? 'پنیر بھری مونگ دال روٹی + 1 گلاس دودھ'
            : 'چکن اور انڈے کا آملیٹ + 2 گندم ٹوسٹ',
          portions_en: 'Balanced amino acids from start of day.',
          portions_ur: 'دن کے آغاز سے ہی بہترین پروٹین۔',
          caloriesApprox: 495,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Mid-Day Snack',
      [
        {
          title_en: 'Roasted Kala Chana (50g) + 8 Almonds/Walnuts + 2 Dates',
          title_ur: 'بھنے کالے چنے (50 گرام) + 8 بادام/اخروٹ + 2 کھجور',
          portions_en: 'Calorie-dense clean desi protein & iron snack.',
          portions_ur: 'پٹھوں اور طاقت کے لیے بہترین دیسی خوراک۔',
          caloriesApprox: 260,
        },
        {
          title_en: 'Banana + Thick Yogurt/Milk Shake with Crushed Sattu (2 tbsp)',
          title_ur: 'کیلا اور ستو (2 چمچ) دودھ/دہی شیک (بغیر چینی)',
          portions_en: 'Traditional Pakistani energy & glycogen shake.',
          portions_ur: 'توانائی اور طاقت کے لیے روایتی ستو شیک۔',
          caloriesApprox: 290,
        },
        {
          title_en: 'Boiled Sweet Potato (Shakarkandi) + Handful Roasted Peanuts',
          title_ur: 'ابلی شکر قندی + مٹھی بھر بھنی مونگ پھلی',
          portions_en: 'Clean carbs + healthy fats pre-workout fuel.',
          portions_ur: 'ورزش سے پہلے بہترین توانائی کا ذریعہ۔',
          caloriesApprox: 275,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Lunch',
      [
        {
          title_en: isVeg
            ? 'Rajma / Chana Masala + Basmati Rice + Dahi Raita + Salad'
            : '160g Chicken / Fish Karahi (light oil) + 2 Whole-Wheat Rotis + Dahi',
          title_ur: isVeg
            ? 'لوبیا یا سفید چنے + چاول + دہی رائتہ + سلاد'
            : '160 گرام چکن یا مچھلی + 2 چکی آٹے کی روٹیاں + دہی',
          portions_en: 'Rich post-workout protein & glycogen replenishment.',
          portions_ur: 'ورزش کے بعد پٹھوں کی مرمت کے لیے مکمل کھانا۔',
          caloriesApprox: 620,
        },
        {
          title_en: isVeg
            ? '2 Bowls Thick Arhar/Chana Daal + Soy/Paneer Cubes + 2 Rotis'
            : '150g Beef/Mutton Yakhni Pulao (lean cuts) + Kachumber + Raita',
          title_ur: isVeg
            ? 'گاڑھی چنا دال + پنیر + 2 روٹیاں'
            : '150 گرام کم چکنائی یخنی پلاؤ + کچومر سلاد + رائتہ',
          portions_en: 'Hearty whole-food lunch supporting muscle hypertrophy.',
          portions_ur: 'صحت مند وزن اور طاقت بڑھانے والا دوپہر کا کھانا۔',
          caloriesApprox: 640,
        },
        {
          title_en: isVeg
            ? 'Palak Paneer + Masoor Daal + 2 Rotis + Salad'
            : 'Chicken Tikka Boti + Daal Mash (light oil) + 2 Tandoori Rotis',
          title_ur: isVeg
            ? 'پالک پنیر + مسور دال + 2 روٹیاں'
            : 'چکن تکہ بوٹی + دال ماش + 2 تندوری روٹیاں',
          portions_en: 'High bioavailable protein + complex iron/zinc.',
          portions_ur: 'پروٹین اور آئرن سے بھرپور خوراک۔',
          caloriesApprox: 610,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Dinner',
      [
        {
          title_en: isVeg
            ? 'Paneer / Tofu Bhurji + 1 Roti + Warm Haldi Milk before bed'
            : 'Minced Lean Keema with Peas + 1 Roti + Warm Milk',
          title_ur: isVeg
            ? 'پنیر بھرجی + 1 روٹی + سونے سے پہلے نیم گرم دودھ'
            : 'مٹر قیمہ (کم تیل) + 1 روٹی + نیم گرم دودھ',
          portions_en: 'Slow-release casein & protein recovery overnight.',
          portions_ur: 'رات بھر جسم کی بحالی اور طاقت کے لیے۔',
          caloriesApprox: 520,
        },
        {
          title_en: isVeg
            ? 'Mixed Lentil & Vegetable Khichdi with 1 tsp Desi Ghee + Dahi'
            : '140g Grilled Fish / Chicken + Mashed Potatoes & Steamed Beans',
          title_ur: isVeg
            ? 'مکس دال سبزی کھچڑی (1 چمچ دیسی گھی) + دہی'
            : '140 گرام گرلڈ مچھلی/چکن + آلو و پھلیاں',
          portions_en: 'Clean carbs and protein without feeling overly stuffed.',
          portions_ur: 'پٹھوں کی مرمت کے لیے متوازن رات کا کھانا۔',
          caloriesApprox: 495,
        },
        {
          title_en: isVeg
            ? 'Chana & Vegetable Curry + 1.5 Whole-Wheat Rotis + Milk'
            : 'Shami Kabab (2 lean) + 1 Whole-Wheat Roti + Vegetable Soup',
          title_ur: isVeg
            ? 'سفید چنے و سبزی + ڈیڑھ روٹی + دودھ'
            : '2 شامی کباب (کم تیل) + 1 روٹی + سبزی سوپ',
          portions_en: 'Easy-to-digest protein before rest.',
          portions_ur: 'رات کے آرام سے پہلے زود ہضم پروٹین۔',
          caloriesApprox: 485,
        },
      ],
      variationSeed
    ),
  ];

  const balancedSlots: DietMealSlot[] = [
    makeSlot(
      'Breakfast',
      [
        {
          title_en: hasDiabetes
            ? '1 Small Whole-Wheat Bran Roti + 1 Boiled Egg + Unsweetened Dahi'
            : 'Whole-Wheat Besan Chilla or Porridge (Daliya) + Boiled Egg',
          title_ur: hasDiabetes
            ? '1 چھوٹی چکی آٹے کی روٹی + 1 ابلا انڈہ + بغیر چینی دہی'
            : 'گندم کا دلیہ یا بیسن روٹی + 1 ابلا انڈہ',
          portions_en: 'High fiber, steady morning energy without sugar spike.',
          portions_ur: 'فائبر سے بھرپور ناشتہ جو شوگر کو متوازن رکھتا ہے۔',
          caloriesApprox: 340,
        },
        {
          title_en: isVeg
            ? 'Oats & Flaxseed Daliya in Low-Fat Milk + 4 Almonds'
            : 'Vegetable Omelette (tomato, onion, spinach) + 1 Whole-Wheat Roti',
          title_ur: isVeg
            ? 'جو اور السی کا دلیہ + 4 بادام'
            : 'سبزی والا آملیٹ + 1 چکی آٹے کی روٹی',
          portions_en: hasBp ? 'Cooked with pinch-free herbs instead of extra salt.' : 'Balanced vitamins and steady satiety.',
          portions_ur: 'متوازن وٹامنز اور صحت مند آغاز۔',
          caloriesApprox: 350,
        },
        {
          title_en: '1 Bowl Unsweetened Dahi + 2 Tbsp Boiled Oats/Daliya + Guava/Apple',
          title_ur: '1 پیالہ دہی + 2 چمچ جو کا دلیہ + امرود یا سیب',
          portions_en: 'Light gut-friendly probiotic breakfast.',
          portions_ur: 'معدے اور ہاضمے کے لیے ہلکا ناشتہ۔',
          caloriesApprox: 315,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Mid-Day Snack',
      [
        {
          title_en: 'Guava or Apple Slices + 6 Unsalted Almonds + Water',
          title_ur: 'امرود یا سیب + 6 بغیر نمک بادام + صاف پانی',
          portions_en: hasBp ? 'Potassium-rich fruit, strictly zero added chaat salt.' : 'Balanced micronutrients & satiety.',
          portions_ur: 'بغیر نمک تازہ پھل اور بادام۔',
          caloriesApprox: 160,
        },
        {
          title_en: 'Roasted Chickpeas (30g) + Mint/Lemon Cucumber Salad',
          title_ur: 'بھنے چنے (30 گرام) + کھیرے اور پودینے کا سلاد',
          portions_en: 'Low-GI crunch ideal for sugar and BP stability.',
          portions_ur: 'شوگر اور بی پی کے لیے بہترین ہلکی غذا۔',
          caloriesApprox: 155,
        },
        {
          title_en: '4 Walnuts + Sugar-Free Green Tea / Cardamom Kahwa',
          title_ur: '4 اخروٹ + بغیر چینی سبز چائے / الائچی قہوہ',
          portions_en: 'Heart-healthy omega-3 fats & antioxidants.',
          portions_ur: 'دل اور دماغ کے لیے مفید صحت مند چکنائی۔',
          caloriesApprox: 145,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Lunch',
      [
        {
          title_en: isVeg
            ? 'Masoor / Moong Daal + Vegetable Sabzi + Cucumber Salad + 1 Whole-Wheat Roti'
            : 'Masoor / Moong Daal + Grilled Chicken or Fish + Salad + 1 Roti',
          title_ur: isVeg
            ? 'مسور یا مونگ دال + سبزی + کچومر سلاد + 1 روٹی'
            : 'مسور یا مونگ دال + گرلڈ چکن/مچھلی + کچومر سلاد + 1 روٹی',
          portions_en: hasBp
            ? 'Cooked with minimal salt & 1 tsp mustard/olive oil; fresh lemon instead of pickle.'
            : 'Half plate salad/sabzi, quarter protein, quarter whole grain.',
          portions_ur: 'آدھی پلیٹ سبزی و سلاد، ایک چوتھائی پروٹین، 1 چپاتی۔',
          caloriesApprox: 480,
        },
        {
          title_en: isVeg
            ? 'Aloo Gobhi / Matar Paneer (light oil) + Daal + 1 Multigrain Roti'
            : 'Chicken Shorba / Karahi (skimmed oil) + Bhindi Sabzi + 1 Roti',
          title_ur: isVeg
            ? 'مٹر پنیر / گوبھی (کم تیل) + دال + 1 ملٹی گرین روٹی'
            : 'کم تیل چکن شوربہ + بھنڈی سبزی + 1 روٹی',
          portions_en: 'Portion-balanced everyday Pakistani household lunch.',
          portions_ur: 'گھر کے عام کھانے کا متوازن اور صحت مند انداز۔',
          caloriesApprox: 470,
        },
        {
          title_en: isVeg
            ? 'Red Kidney Beans (Lobia) Curry + 1 Small Bowl Brown Rice + Raita'
            : 'Baked/Pan-Seared Fish + Spinach/Saag + 1 Whole-Wheat Roti',
          title_ur: isVeg
            ? 'لال لوبیا سالن + چھوٹا پیالہ براؤن چاول + رائتہ'
            : 'گرلڈ مچھلی + پالک ساگ + 1 روٹی',
          portions_en: 'Slow-release carbohydrates & iron support.',
          portions_ur: 'آئرن اور متوازن توانائی سے بھرپور کھانا۔',
          caloriesApprox: 465,
        },
      ],
      variationSeed
    ),
    makeSlot(
      'Dinner',
      [
        {
          title_en: 'Steamed or Lightly Stir-Fried Bhindi / Lauki Sabzi + Bowl of Raita',
          title_ur: 'کم تیل میں پکی لوکی یا بھنڈی کی سبزی + رائتہ',
          portions_en: 'Eat at least 2 hours before sleep to support digestion & overnight glucose.',
          portions_ur: 'سونے سے کم از کم 2 گھنٹے پہلے ہلکا کھانا کھائیں۔',
          caloriesApprox: 360,
        },
        {
          title_en: isVeg
            ? 'Moong Daal Soup + Sautéed Cabbage & Carrot + 1 Small Roti'
            : '100g Shredded Chicken & Vegetable Yakhni + 1 Small Roti',
          title_ur: isVeg
            ? 'مونگ دال سوپ + بند گوبھی گاجر + 1 چھوٹی روٹی'
            : '100 گرام چکن و سبزی یخنی + 1 چھوٹی روٹی',
          portions_en: 'Warm, soothing, light-sodium dinner.',
          portions_ur: 'ہلکا، کم نمک اور زود ہضم رات کا کھانا۔',
          caloriesApprox: 345,
        },
        {
          title_en: 'Vegetable Khichdi (3/4 bowl) + Fresh Mint Yogurt',
          title_ur: 'سبزی کھچڑی + پودینے والا دہی',
          portions_en: 'Easy evening recovery meal.',
          portions_ur: 'پُرسکون نیند کے لیے ہلکی غذا۔',
          caloriesApprox: 355,
        },
      ],
      variationSeed
    ),
  ];

  const dietMeals: PersonalizedWellnessPlan['dietMeals'] = isWeightLoss
    ? weightLossSlots
    : isMuscleGain
      ? muscleGainSlots
      : balancedSlots;

  const workoutRoutine: PersonalizedWellnessPlan['workoutRoutine'] = isSenior
    ? [
        {
          name_en: 'Gentle Courtyard / Hallway Walk',
          name_ur: 'صحن یا کمرے میں ہلکی چہل قدمی',
          durationOrReps: '15–20 mins',
          intensity: 'Gentle',
          tip_en: 'Wear supportive flat shoes; stop if dizzy or short of breath.',
        },
        {
          name_en: 'Seated Ankle Circles & Shoulder Rolls',
          name_ur: 'کرسی پر بیٹھ کر ٹخنوں اور کندھوں کی ورزش',
          durationOrReps: '10 reps x 2 sets',
          intensity: 'Gentle',
          tip_en: 'Improves circulation and lowers stiffness safely.',
        },
        {
          name_en: 'Supported Chair Sit-to-Stand',
          name_ur: 'کرسی سے سہارا لے کر اٹھنے بیٹھنے کی مشق',
          durationOrReps: '8 slow reps',
          intensity: 'Gentle',
          tip_en: 'Exhale while standing up cleanly.',
        },
      ]
    : isWeightLoss
      ? [
          {
            name_en: 'Brisk Fat-Burn Walk / Marching Intervals',
            name_ur: 'تیز چہل قدمی (وقفوں کے ساتھ)',
            durationOrReps: '30–35 mins',
            intensity: 'Brisk',
            tip_en: 'Alternate 3 mins brisk pace with 1 min steady walk to burn fat safely.',
          },
          {
            name_en: 'Bodyweight Squats + Step-Ups + Plank Hold',
            name_ur: 'اسکواٹس، سیڑھی چڑھنا اور پلینک ہولڈ',
            durationOrReps: '12 reps x 3 sets',
            intensity: 'Moderate',
            tip_en: 'Preserves lean muscle while targeting overall calorie deficit.',
          },
          {
            name_en: 'Post-Dinner 15-Minute Stroll + Breath Wind-Down',
            name_ur: 'رات کے کھانے کے بعد 15 منٹ چہل قدمی',
            durationOrReps: '15 mins',
            intensity: 'Gentle',
            tip_en: 'Supports overnight metabolic rate and digestion.',
          },
        ]
      : isMuscleGain
        ? [
            {
              name_en: 'Push-Ups (Incline or Standard) & Pike Shoulder Press',
              name_ur: 'پش اپس اور کندھوں کی مضبوطی کی مشق',
              durationOrReps: '10–15 reps x 3 sets',
              intensity: 'Brisk',
              tip_en: 'Lower slowly for 3 seconds on each rep to stimulate muscle growth.',
            },
            {
              name_en: 'Bulgarian / Split Lunges & Deep Bodyweight Squats',
              name_ur: 'لنجز اور گہرے اسکواٹس',
              durationOrReps: '12 reps x 3 sets',
              intensity: 'Brisk',
              tip_en: 'Keep knees aligned over toes and rest 60 seconds between sets.',
            },
            {
              name_en: 'Glute Bridges + Core Plank + Brisk Evening Walk',
              name_ur: 'گلوٹ برجز، کور پلینک اور شام کی چہل قدمی',
              durationOrReps: '20 mins total',
              intensity: 'Moderate',
              tip_en: 'Pair immediately with a protein-rich meal.',
            },
          ]
        : [
            {
              name_en: 'Brisk Post-Meal Walk (20 mins after lunch or dinner)',
              name_ur: 'کھانے کے بعد تیز چہل قدمی',
              durationOrReps: '20–30 mins',
              intensity: 'Moderate',
              tip_en: 'Lowers post-meal blood sugar & blood pressure naturally.',
            },
            {
              name_en: 'Wall Push-Ups & Bodyweight Squats',
              name_ur: 'دیوار کے سہارے پش اپس اور ہلکی بیٹھک',
              durationOrReps: '12 reps x 2 sets',
              intensity: 'Moderate',
              tip_en: 'Keep back straight and breathe smoothly.',
            },
            {
              name_en: 'Cyclic Sighing + Neck/Back Mobility Stretch',
              name_ur: 'سانس کی مشق اور کمر و گردن کی کھنچاؤ والی ورزش',
              durationOrReps: '5 mins',
              intensity: 'Gentle',
              tip_en: 'Relaxes nervous system after activity.',
            },
          ];

  const avoidNotes_en = [
    ...(hasBp ? ['Limit pickles (achaar), papad, processed snacks, and extra table salt.'] : []),
    ...(hasDiabetes ? ['Avoid sugary chai, packaged juices, bakery mithai, and refined white naan.'] : []),
    ...(isWeightLoss ? ['Skip deep-fried samosas/pakoras, sugary cold drinks, and late-night desserts.'] : []),
    ...(person.allergies.length ? [`Strictly avoid allergens recorded on profile: ${person.allergies.join(', ')}.`] : []),
    'Stay hydrated and avoid vigorous workouts if experiencing fever, chest pain, or severe fatigue.',
  ];

  const avoidNotes_ur = [
    ...(hasBp ? ['اچار، پاپڑ، بازاری نمکین اور اضافی نمک سے پرہیز کریں۔'] : []),
    ...(hasDiabetes ? ['میٹھی چائے، ڈبے والے جوس، مٹھائی اور میدے کے نان سے بچیں۔'] : []),
    ...(isWeightLoss ? ['سموسے پکوڑے، کولڈ ڈرنکس اور رات گئے مٹھائی سے مکمل پرہیز کریں۔'] : []),
    ...(person.allergies.length ? [`ریکارڈ شدہ الرجی سے مکمل بچیں: ${person.allergies.join('، ')}۔`] : []),
    'بخار، سینے کے درد یا شدید تھکاوٹ میں ورزش ہرگز نہ کریں۔',
  ];

  return {
    id: `plan_${crypto.randomUUID().slice(0, 8)}`,
    personId: person.id,
    goal,
    generatedAtIso: new Date().toISOString(),
    dailyWaterGoalMl,
    dailyStepsGoal,
    dietMeals,
    workoutRoutine,
    avoidNotes_en,
    avoidNotes_ur,
    engineUsed: 'OFFLINE_NUTRITION_SAFETY_CORE',
  };
}

export async function generatePersonalizedPlan(
  person: ExtendedPatientProfile,
  goal: WellnessGoal,
  variationSeed = 0
): Promise<PersonalizedWellnessPlan> {
  const offlineFallback = buildPersonalizedPlanOffline(person, goal, variationSeed);
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 11000);
      const res = await fetch('/api/wellness/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          goal,
          ageMonths: person.ageMonths,
          sex: person.sex,
          heightCm: person.heightCm,
          weightKg: person.weightKg,
          chronicConditions: person.chronicConditions,
          allergies: person.allergies,
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as Omit<PersonalizedWellnessPlan, 'id' | 'personId' | 'generatedAtIso'>;
        if (Array.isArray(data.dietMeals) && data.dietMeals.length > 0) {
          // Attach offline alternatives onto online slots so meal swap works seamlessly even on AI-generated plans
          const mergedMeals = data.dietMeals.map((slotItem) => {
            const localMatch = offlineFallback.dietMeals.find((m) => m.slot === slotItem.slot);
            const primaryOption: MealOptionItem = {
              title_en: slotItem.title_en,
              title_ur: slotItem.title_ur,
              portions_en: slotItem.portions_en,
              portions_ur: slotItem.portions_ur,
              caloriesApprox: slotItem.caloriesApprox,
            };
            const mergedAlts = [
              primaryOption,
              ...(localMatch?.alternatives ?? []).filter((a) => a.title_en !== primaryOption.title_en),
            ];
            return {
              ...slotItem,
              selectedOptionIndex: 0,
              alternatives: mergedAlts,
            };
          });
          return {
            ...data,
            dietMeals: mergedMeals,
            id: `plan_${crypto.randomUUID().slice(0, 8)}`,
            personId: person.id,
            generatedAtIso: new Date().toISOString(),
          };
        }
      }
    } catch {
      // Seamless deterministic offline plan fallback
    }
  }
  return offlineFallback;
}
