/**
 * Knowledge-check questions per experiment ID. Content is authored side by
 * side in every language so `correctIndex` is shared and cannot drift between
 * translations; `getQuiz` resolves one language into the flat shape the UI uses.
 */

export const QUIZ_LANGUAGES = ['en', 'uz', 'ru'] as const
export type QuizLanguage = (typeof QUIZ_LANGUAGES)[number]

type Localized<T = string> = Record<QuizLanguage, T>

export interface QuizQuestionSource {
  id: string
  question: Localized
  /** Same order in every language. */
  options: Localized<string[]>
  correctIndex: number
  explanation: Localized
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export const QUIZZES: Record<string, QuizQuestionSource[]> = {
  pendulum: [
    {
      id: 'length-x4',
      question: {
        en: 'You make the pendulum four times longer. What happens to its period (small angles)?',
        uz: 'Mayatnik uzunligini toʻrt marta oshirdingiz. Uning davri qanday oʻzgaradi (kichik burchaklarda)?',
        ru: 'Вы увеличили длину маятника в четыре раза. Что произойдёт с его периодом (при малых углах)?',
      },
      options: {
        en: ['It stays the same', 'It doubles', 'It becomes four times longer', 'It halves'],
        uz: ['Oʻzgarmaydi', 'Ikki marta ortadi', 'Toʻrt marta ortadi', 'Ikki marta kamayadi'],
        ru: ['Не изменится', 'Увеличится в 2 раза', 'Увеличится в 4 раза', 'Уменьшится в 2 раза'],
      },
      correctIndex: 1,
      explanation: {
        en: 'T = 2π√(L/g), so the period grows with the square root of the length: √4 = 2.',
        uz: 'T = 2π√(L/g), demak davr uzunlikning kvadrat ildiziga proporsional: √4 = 2.',
        ru: 'T = 2π√(L/g), поэтому период растёт как квадратный корень из длины: √4 = 2.',
      },
    },
    {
      id: 'mass',
      question: {
        en: 'You replace the bob with one twice as heavy, keeping the length. How does the period change?',
        uz: 'Yukni ikki marta ogʻirrogʻiga almashtirdingiz, uzunlik oʻsha. Davr qanday oʻzgaradi?',
        ru: 'Вы заменили груз на вдвое более тяжёлый, не меняя длину. Как изменится период?',
      },
      options: {
        en: ['It doubles', 'It halves', 'It does not change', 'It grows by √2'],
        uz: ['Ikki marta ortadi', 'Ikki marta kamayadi', 'Oʻzgarmaydi', '√2 marta ortadi'],
        ru: ['Увеличится в 2 раза', 'Уменьшится в 2 раза', 'Не изменится', 'Увеличится в √2 раз'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Mass does not appear in T = 2π√(L/g). A heavier bob feels more force but also has more inertia, and the two cancel.',
        uz: 'T = 2π√(L/g) formulasida massa yoʻq. Ogʻir yukka koʻproq kuch taʼsir qiladi, lekin uning inersiyasi ham katta, ular bir-birini muvozanatlaydi.',
        ru: 'Масса не входит в T = 2π√(L/g). На тяжёлый груз действует большая сила, но и инерция у него больше, и эти эффекты компенсируются.',
      },
    },
    {
      id: 'moon',
      question: {
        en: 'The same pendulum is taken to the Moon (g ≈ 1.62 m/s²). How does it swing compared with on Earth?',
        uz: 'Oʻsha mayatnik Oyga olib borildi (g ≈ 1,62 m/s²). Yerdagiga nisbatan u qanday tebranadi?',
        ru: 'Тот же маятник перенесли на Луну (g ≈ 1,62 м/с²). Как он качается по сравнению с Землёй?',
      },
      options: {
        en: ['Faster, with a shorter period', 'More slowly, with a longer period', 'Exactly the same', 'It stops swinging'],
        uz: ['Tezroq, davri qisqaroq', 'Sekinroq, davri uzunroq', 'Aynan bir xil', 'Tebranishdan toʻxtaydi'],
        ru: ['Быстрее, период короче', 'Медленнее, период длиннее', 'Точно так же', 'Перестаёт качаться'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Weaker gravity means a weaker restoring force. T ∝ 1/√g, so the period is about √(9.81/1.62) ≈ 2.5 times longer.',
        uz: 'Kuchsizroq gravitatsiya — kuchsizroq qaytaruvchi kuch. T ∝ 1/√g, shuning uchun davr taxminan √(9,81/1,62) ≈ 2,5 marta uzunroq.',
        ru: 'Слабее тяготение — слабее возвращающая сила. T ∝ 1/√g, поэтому период примерно в √(9,81/1,62) ≈ 2,5 раза длиннее.',
      },
    },
    {
      id: 'large-angle',
      question: {
        en: 'The pendulum is released from 90°. How does its real period compare with 2π√(L/g)?',
        uz: 'Mayatnik 90° dan qoʻyib yuborildi. Uning haqiqiy davri 2π√(L/g) bilan qanday solishtiriladi?',
        ru: 'Маятник отпустили с 90°. Как его реальный период соотносится с 2π√(L/g)?',
      },
      options: {
        en: ['It is shorter', 'It is equal', 'It is longer, by about 18 %', 'It is twice as long'],
        uz: ['Qisqaroq', 'Teng', 'Taxminan 18 % uzunroq', 'Ikki marta uzunroq'],
        ru: ['Короче', 'Равен ему', 'Длиннее, примерно на 18 %', 'Вдвое длиннее'],
      },
      correctIndex: 2,
      explanation: {
        en: 'The formula assumes sin θ ≈ θ, which only holds for small angles. At large amplitudes the restoring force is weaker than the linear model predicts, so each swing takes longer.',
        uz: 'Formula sin θ ≈ θ deb faraz qiladi, bu faqat kichik burchaklarda toʻgʻri. Katta amplitudada qaytaruvchi kuch chiziqli modeldagidan kuchsizroq, shuning uchun har bir tebranish uzoqroq davom etadi.',
        ru: 'Формула предполагает sin θ ≈ θ, что верно только для малых углов. При больших амплитудах возвращающая сила слабее, чем в линейной модели, поэтому каждое колебание длится дольше.',
      },
    },
    {
      id: 'frequency',
      question: {
        en: 'A pendulum has a period of 2 s. What is its frequency?',
        uz: 'Mayatnikning davri 2 s. Uning chastotasi qancha?',
        ru: 'Период маятника 2 с. Какова его частота?',
      },
      options: {
        en: ['2 Hz', '0.5 Hz', '4 Hz', '1 Hz'],
        uz: ['2 Hz', '0,5 Hz', '4 Hz', '1 Hz'],
        ru: ['2 Гц', '0,5 Гц', '4 Гц', '1 Гц'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Frequency is the number of oscillations per second: f = 1/T = 1/2 s = 0.5 Hz.',
        uz: 'Chastota — bir soniyadagi tebranishlar soni: f = 1/T = 1/2 s = 0,5 Hz.',
        ru: 'Частота — число колебаний в секунду: f = 1/T = 1/2 с = 0,5 Гц.',
      },
    },
  ],

  'ohms-law': [
    {
      id: 'compute-current',
      question: {
        en: 'A 12 V battery is connected to a 4 Ω resistor. What current flows?',
        uz: '12 V li batareya 4 Ω li rezistorga ulandi. Qancha tok oqadi?',
        ru: 'Батарея 12 В подключена к резистору 4 Ом. Какой ток течёт в цепи?',
      },
      options: {
        en: ['48 A', '3 A', '0.33 A', '16 A'],
        uz: ['48 A', '3 A', '0,33 A', '16 A'],
        ru: ['48 А', '3 А', '0,33 А', '16 А'],
      },
      correctIndex: 1,
      explanation: {
        en: 'I = V / R = 12 V / 4 Ω = 3 A.',
        uz: 'I = V / R = 12 V / 4 Ω = 3 A.',
        ru: 'I = U / R = 12 В / 4 Ом = 3 А.',
      },
    },
    {
      id: 'double-voltage',
      question: {
        en: 'You double the voltage and keep the resistance the same. What happens to the current?',
        uz: 'Kuchlanishni ikki marta oshirdingiz, qarshilik oʻzgarmadi. Tok kuchi qanday oʻzgaradi?',
        ru: 'Вы удвоили напряжение, сопротивление не меняли. Что произойдёт с силой тока?',
      },
      options: {
        en: ['It doubles', 'It halves', 'It stays the same', 'It quadruples'],
        uz: ['Ikki marta ortadi', 'Ikki marta kamayadi', 'Oʻzgarmaydi', 'Toʻrt marta ortadi'],
        ru: ['Увеличится в 2 раза', 'Уменьшится в 2 раза', 'Не изменится', 'Увеличится в 4 раза'],
      },
      correctIndex: 0,
      explanation: {
        en: 'At constant resistance current is directly proportional to voltage, so the V–I graph is a straight line through the origin.',
        uz: 'Qarshilik oʻzgarmas boʻlsa, tok kuchlanishga toʻgʻri proporsional, shuning uchun V–I grafigi koordinata boshidan oʻtuvchi toʻgʻri chiziq.',
        ru: 'При постоянном сопротивлении ток прямо пропорционален напряжению, поэтому график U–I — прямая, проходящая через начало координат.',
      },
    },
    {
      id: 'open-switch',
      question: {
        en: 'What does the ammeter read when the switch is open?',
        uz: 'Kalit ochiq boʻlganda ampermetr nimani koʻrsatadi?',
        ru: 'Что показывает амперметр, когда ключ разомкнут?',
      },
      options: {
        en: ['The same current as before', 'Twice the current', 'Zero', 'The battery voltage'],
        uz: ['Avvalgidek tok', 'Ikki barobar tok', 'Nol', 'Batareya kuchlanishini'],
        ru: ['Тот же ток, что и раньше', 'Вдвое больший ток', 'Ноль', 'Напряжение батареи'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Current needs a closed loop. An open switch breaks the circuit, so no charge flows and I = 0.',
        uz: 'Tok uchun yopiq zanjir kerak. Ochiq kalit zanjirni uzadi, zaryad oqmaydi va I = 0.',
        ru: 'Току нужен замкнутый контур. Разомкнутый ключ разрывает цепь, заряд не течёт, и I = 0.',
      },
    },
    {
      id: 'voltmeter',
      question: {
        en: 'How must a voltmeter be connected to measure the voltage across the resistor?',
        uz: 'Rezistordagi kuchlanishni oʻlchash uchun voltmetr qanday ulanishi kerak?',
        ru: 'Как нужно подключить вольтметр, чтобы измерить напряжение на резисторе?',
      },
      options: {
        en: ['In series with the resistor', 'In parallel with the resistor', 'Only next to the battery', 'In place of the switch'],
        uz: ['Rezistor bilan ketma-ket', 'Rezistorga parallel', 'Faqat batareya yonida', 'Kalit oʻrniga'],
        ru: ['Последовательно с резистором', 'Параллельно резистору', 'Только рядом с батареей', 'Вместо ключа'],
      },
      correctIndex: 1,
      explanation: {
        en: 'A voltmeter compares two points, so it goes in parallel across the component. The ammeter goes in series so the whole current passes through it.',
        uz: 'Voltmetr ikki nuqtani solishtiradi, shuning uchun u elementga parallel ulanadi. Ampermetr esa butun tok undan oʻtishi uchun ketma-ket ulanadi.',
        ru: 'Вольтметр сравнивает две точки, поэтому его подключают параллельно элементу. Амперметр включают последовательно, чтобы через него проходил весь ток.',
      },
    },
    {
      id: 'power',
      question: {
        en: 'A current of 2 A flows through a 5 Ω resistor. What power does it dissipate?',
        uz: '5 Ω li rezistordan 2 A tok oqmoqda. Unda qancha quvvat ajraladi?',
        ru: 'Через резистор 5 Ом течёт ток 2 А. Какая мощность на нём выделяется?',
      },
      options: {
        en: ['10 W', '2.5 W', '20 W', '7 W'],
        uz: ['10 W', '2,5 W', '20 W', '7 W'],
        ru: ['10 Вт', '2,5 Вт', '20 Вт', '7 Вт'],
      },
      correctIndex: 2,
      explanation: {
        en: 'P = I²R = (2 A)² × 5 Ω = 20 W. Power grows with the square of the current.',
        uz: 'P = I²R = (2 A)² × 5 Ω = 20 W. Quvvat tok kuchining kvadratiga bogʻliq.',
        ru: 'P = I²R = (2 А)² × 5 Ом = 20 Вт. Мощность растёт пропорционально квадрату тока.',
      },
    },
  ],

  titration: [
    {
      id: 'equivalence-ph',
      question: {
        en: 'What is the pH at the equivalence point when HCl is titrated with NaOH?',
        uz: 'HCl NaOH bilan titrlanganda ekvivalentlik nuqtasida pH qancha boʻladi?',
        ru: 'Каков pH в точке эквивалентности при титровании HCl раствором NaOH?',
      },
      options: {
        en: ['About 1', 'About 4', 'Exactly 7', 'About 12'],
        uz: ['Taxminan 1', 'Taxminan 4', 'Aynan 7', 'Taxminan 12'],
        ru: ['Около 1', 'Около 4', 'Ровно 7', 'Около 12'],
      },
      correctIndex: 2,
      explanation: {
        en: 'A strong acid and a strong base neutralise to water and a neutral salt (NaCl), so at 25 °C the solution is neutral: pH 7.',
        uz: 'Kuchli kislota va kuchli asos neytrallanib, suv va neytral tuz (NaCl) hosil qiladi, shuning uchun 25 °C da eritma neytral: pH 7.',
        ru: 'Сильная кислота и сильное основание нейтрализуются до воды и нейтральной соли (NaCl), поэтому при 25 °C раствор нейтрален: pH 7.',
      },
    },
    {
      id: 'net-ionic',
      question: {
        en: 'Which equation describes the reaction that actually happens in the flask?',
        uz: 'Kolbada aslida qaysi reaksiya sodir boʻladi?',
        ru: 'Какое уравнение описывает реакцию, которая на самом деле идёт в колбе?',
      },
      options: {
        en: ['H⁺ + OH⁻ → H₂O', 'Na⁺ + Cl⁻ → NaCl(s)', 'HCl → H₂ + Cl₂', 'NaOH → Na + OH'],
        uz: ['H⁺ + OH⁻ → H₂O', 'Na⁺ + Cl⁻ → NaCl(q)', 'HCl → H₂ + Cl₂', 'NaOH → Na + OH'],
        ru: ['H⁺ + OH⁻ → H₂O', 'Na⁺ + Cl⁻ → NaCl(тв)', 'HCl → H₂ + Cl₂', 'NaOH → Na + OH'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Both HCl and NaOH dissociate completely. Na⁺ and Cl⁻ are spectator ions; the only change is H⁺ and OH⁻ combining into water.',
        uz: 'HCl ham, NaOH ham toʻliq dissotsilanadi. Na⁺ va Cl⁻ reaksiyada qatnashmaydi; yagona oʻzgarish — H⁺ va OH⁻ birikib suv hosil qilishi.',
        ru: 'HCl и NaOH диссоциируют полностью. Na⁺ и Cl⁻ — ионы-наблюдатели; единственное превращение — соединение H⁺ и OH⁻ в воду.',
      },
    },
    {
      id: 'start-ph',
      question: {
        en: 'What is the starting pH of 0.1 mol/L hydrochloric acid?',
        uz: '0,1 mol/L xlorid kislotaning boshlangʻich pH qiymati qancha?',
        ru: 'Каков исходный pH соляной кислоты с концентрацией 0,1 моль/л?',
      },
      options: {
        en: ['0.1', '1', '7', '13'],
        uz: ['0,1', '1', '7', '13'],
        ru: ['0,1', '1', '7', '13'],
      },
      correctIndex: 1,
      explanation: {
        en: 'HCl dissociates completely, so [H⁺] = 0.1 mol/L and pH = −log(0.1) = 1.',
        uz: 'HCl toʻliq dissotsilanadi, demak [H⁺] = 0,1 mol/L va pH = −lg(0,1) = 1.',
        ru: 'HCl диссоциирует полностью, значит [H⁺] = 0,1 моль/л и pH = −lg(0,1) = 1.',
      },
    },
    {
      id: 'equivalence-volume',
      question: {
        en: '25 mL of 0.1 mol/L HCl is titrated with 0.1 mol/L NaOH. How much NaOH reaches the equivalence point?',
        uz: '25 mL 0,1 mol/L HCl 0,1 mol/L NaOH bilan titrlanmoqda. Ekvivalentlik nuqtasiga qancha NaOH kerak?',
        ru: '25 мл HCl с концентрацией 0,1 моль/л титруют 0,1 моль/л NaOH. Сколько NaOH нужно до точки эквивалентности?',
      },
      options: {
        en: ['12.5 mL', '25 mL', '50 mL', '2.5 mL'],
        uz: ['12,5 mL', '25 mL', '50 mL', '2,5 mL'],
        ru: ['12,5 мл', '25 мл', '50 мл', '2,5 мл'],
      },
      correctIndex: 1,
      explanation: {
        en: 'At equivalence the moles of OH⁻ equal the moles of H⁺: Ca·Va = Cb·Vb, so Vb = 0.1 × 25 / 0.1 = 25 mL.',
        uz: 'Ekvivalentlikda OH⁻ mollari H⁺ mollariga teng: Ca·Va = Cb·Vb, demak Vb = 0,1 × 25 / 0,1 = 25 mL.',
        ru: 'В точке эквивалентности количество OH⁻ равно количеству H⁺: Ca·Va = Cb·Vb, значит Vb = 0,1 × 25 / 0,1 = 25 мл.',
      },
    },
    {
      id: 'indicator',
      question: {
        en: 'Which indicator changes colour closest to the equivalence point of this titration?',
        uz: 'Qaysi indikator rangini ushbu titrlashning ekvivalentlik nuqtasiga eng yaqin joyda oʻzgartiradi?',
        ru: 'Какой индикатор меняет цвет ближе всего к точке эквивалентности этого титрования?',
      },
      options: {
        en: ['Methyl orange (pH 3.1–4.4)', 'Methyl red (pH 4.4–6.2)', 'Bromothymol blue (pH 6.0–7.6)', 'None, indicators cannot be used'],
        uz: ['Metiloranj (pH 3,1–4,4)', 'Metilqizil (pH 4,4–6,2)', 'Bromtimol koʻki (pH 6,0–7,6)', 'Hech qaysi, indikator ishlatib boʻlmaydi'],
        ru: ['Метиловый оранжевый (pH 3,1–4,4)', 'Метиловый красный (pH 4,4–6,2)', 'Бромтимоловый синий (pH 6,0–7,6)', 'Никакой, индикаторы здесь не работают'],
      },
      correctIndex: 2,
      explanation: {
        en: 'An indicator changes colour around its pKa ± 1. Bromothymol blue (pKa ≈ 7.1) changes right at pH 7, inside the steep jump of the curve.',
        uz: 'Indikator rangini taxminan pKa ± 1 oraligʻida oʻzgartiradi. Bromtimol koʻki (pKa ≈ 7,1) rangini aynan pH 7 atrofida, egri chiziqning keskin sakrashi ichida oʻzgartiradi.',
        ru: 'Индикатор меняет цвет в интервале около pKa ± 1. Бромтимоловый синий (pKa ≈ 7,1) меняет цвет прямо около pH 7, внутри резкого скачка кривой.',
      },
    },
  ],
  // Ready for when these experiments ship; the card only appears on available experiment pages.
  'projectile-motion': [
    {
      id: 'max-range',
      question: {
        en: 'Ignoring air resistance, which launch angle gives the longest range on level ground?',
        uz: 'Havo qarshiligini hisobga olmaganda, tekis yerda qaysi otish burchagi eng uzoq masofani beradi?',
        ru: 'Без учёта сопротивления воздуха какой угол броска даёт наибольшую дальность на ровной поверхности?',
      },
      options: {
        en: ['30°', '45°', '60°', '90°'],
        uz: ['30°', '45°', '60°', '90°'],
        ru: ['30°', '45°', '60°', '90°'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Range R = v²·sin(2θ)/g, and sin(2θ) is largest when 2θ = 90°, so θ = 45°.',
        uz: 'Masofa R = v²·sin(2θ)/g, sin(2θ) esa 2θ = 90° boʻlganda eng katta, demak θ = 45°.',
        ru: 'Дальность R = v²·sin(2θ)/g, а sin(2θ) максимален при 2θ = 90°, то есть θ = 45°.',
      },
    },
    {
      id: 'horizontal-velocity',
      question: {
        en: 'What happens to the horizontal velocity of the projectile during its flight (no air resistance)?',
        uz: 'Parvoz davomida jismning gorizontal tezligi qanday oʻzgaradi (havo qarshiligisiz)?',
        ru: 'Что происходит с горизонтальной скоростью тела во время полёта (без сопротивления воздуха)?',
      },
      options: {
        en: ['It stays constant', 'It decreases steadily', 'It increases steadily', 'It becomes zero at the top'],
        uz: ['Oʻzgarmaydi', 'Bir tekis kamayadi', 'Bir tekis ortadi', 'Eng yuqori nuqtada nolga teng boʻladi'],
        ru: ['Остаётся постоянной', 'Равномерно уменьшается', 'Равномерно увеличивается', 'Становится нулевой в верхней точке'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Gravity acts only vertically. With no horizontal force, the horizontal velocity v·cos θ never changes.',
        uz: 'Ogʻirlik kuchi faqat vertikal yoʻnalgan. Gorizontal kuch boʻlmagani uchun gorizontal tezlik v·cos θ oʻzgarmaydi.',
        ru: 'Сила тяжести действует только по вертикали. Горизонтальной силы нет, поэтому горизонтальная скорость v·cos θ не меняется.',
      },
    },
    {
      id: 'top',
      question: {
        en: 'At the highest point of the trajectory, what is the vertical velocity?',
        uz: 'Traektoriyaning eng yuqori nuqtasida vertikal tezlik qanday?',
        ru: 'Какова вертикальная скорость в высшей точке траектории?',
      },
      options: {
        en: ['Equal to the launch speed', 'Zero', 'Equal to g', 'Maximum'],
        uz: ['Boshlangʻich tezlikka teng', 'Nolga teng', 'g ga teng', 'Eng katta'],
        ru: ['Равна начальной скорости', 'Равна нулю', 'Равна g', 'Максимальна'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The vertical velocity changes sign at the top: the object stops rising and starts falling, so it is momentarily zero. The acceleration is still g downwards.',
        uz: 'Eng yuqori nuqtada vertikal tezlik ishorasini oʻzgartiradi: jism koʻtarilishdan toʻxtab, tusha boshlaydi, shuning uchun u bir lahza nolga teng. Tezlanish esa baribir pastga yoʻnalgan g.',
        ru: 'В верхней точке вертикальная скорость меняет знак: тело перестаёт подниматься и начинает падать, поэтому в этот момент она равна нулю. Ускорение при этом по-прежнему g вниз.',
      },
    },
    {
      id: 'complementary',
      question: {
        en: 'Two balls are launched at the same speed, one at 30° and one at 60°. How do their ranges compare?',
        uz: 'Ikkita toʻp bir xil tezlikda otildi: biri 30°, ikkinchisi 60° ostida. Ularning masofalari qanday?',
        ru: 'Два мяча брошены с одинаковой скоростью: один под углом 30°, другой под 60°. Как соотносятся их дальности?',
      },
      options: {
        en: ['The 30° ball goes twice as far', 'The 60° ball goes twice as far', 'They land at the same distance', 'The 60° ball goes slightly farther'],
        uz: ['30° dagi toʻp ikki marta uzoqqa boradi', '60° dagi toʻp ikki marta uzoqqa boradi', 'Ikkalasi bir xil masofaga tushadi', '60° dagi toʻp biroz uzoqroqqa boradi'],
        ru: ['Мяч под 30° летит вдвое дальше', 'Мяч под 60° летит вдвое дальше', 'Они падают на одинаковом расстоянии', 'Мяч под 60° летит чуть дальше'],
      },
      correctIndex: 2,
      explanation: {
        en: 'sin(60°) = sin(120°), so complementary angles give the same range. The 60° ball flies higher and stays in the air longer.',
        uz: 'sin(60°) = sin(120°), shuning uchun yigʻindisi 90° boʻlgan burchaklar bir xil masofa beradi. 60° dagi toʻp balandroq uchadi va havoda uzoqroq turadi.',
        ru: 'sin(60°) = sin(120°), поэтому углы, дополняющие друг друга до 90°, дают одинаковую дальность. Мяч под 60° летит выше и дольше.',
      },
    },
    {
      id: 'double-speed',
      question: {
        en: 'You double the launch speed and keep the angle. How does the range change?',
        uz: 'Otish tezligini ikki marta oshirdingiz, burchak oʻsha. Masofa qanday oʻzgaradi?',
        ru: 'Вы удвоили начальную скорость, не меняя угол. Как изменится дальность?',
      },
      options: {
        en: ['It doubles', 'It quadruples', 'It stays the same', 'It grows by √2'],
        uz: ['Ikki marta ortadi', 'Toʻrt marta ortadi', 'Oʻzgarmaydi', '√2 marta ortadi'],
        ru: ['Увеличится в 2 раза', 'Увеличится в 4 раза', 'Не изменится', 'Увеличится в √2 раз'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Range is proportional to v²: doubling the speed doubles both the flight time and the horizontal speed, so the range is 2² = 4 times larger.',
        uz: 'Masofa v² ga proporsional: tezlik ikki marta oshsa, parvoz vaqti ham, gorizontal tezlik ham ikki marta ortadi, demak masofa 2² = 4 marta katta.',
        ru: 'Дальность пропорциональна v²: при удвоении скорости вдвое растут и время полёта, и горизонтальная скорость, поэтому дальность в 2² = 4 раза больше.',
      },
    },
  ],

  'reaction-rate': [
    {
      id: 'concentration',
      question: {
        en: 'Why does increasing the concentration of a reactant usually speed up a reaction?',
        uz: 'Nima uchun reagent konsentratsiyasini oshirish odatda reaksiyani tezlashtiradi?',
        ru: 'Почему увеличение концентрации реагента обычно ускоряет реакцию?',
      },
      options: {
        en: ['Each particle gains more energy', 'Particles collide more often', 'The activation energy is lowered', 'The products become more stable'],
        uz: ['Har bir zarra koʻproq energiya oladi', 'Zarralar tez-tez toʻqnashadi', 'Faollanish energiyasi kamayadi', 'Mahsulotlar barqarorroq boʻladi'],
        ru: ['Каждая частица получает больше энергии', 'Частицы чаще сталкиваются', 'Снижается энергия активации', 'Продукты становятся устойчивее'],
      },
      correctIndex: 1,
      explanation: {
        en: 'More particles in the same volume means more collisions per second, so more successful collisions per second.',
        uz: 'Bir xil hajmda zarralar koʻproq boʻlsa, soniyasiga toʻqnashuvlar ham, muvaffaqiyatli toʻqnashuvlar ham koʻpayadi.',
        ru: 'Больше частиц в том же объёме — больше столкновений в секунду, а значит, и больше успешных столкновений.',
      },
    },
    {
      id: 'temperature',
      question: {
        en: 'What is the main reason a higher temperature speeds up a reaction?',
        uz: 'Yuqori harorat reaksiyani tezlashtirishining asosiy sababi nima?',
        ru: 'Какова главная причина того, что повышение температуры ускоряет реакцию?',
      },
      options: {
        en: [
          'More particles have at least the activation energy',
          'The particles become larger',
          'The concentration of reactants increases',
          'The reaction releases less heat',
        ],
        uz: [
          'Koʻproq zarralar kamida faollanish energiyasiga ega boʻladi',
          'Zarralar kattalashadi',
          'Reagentlar konsentratsiyasi ortadi',
          'Reaksiya kamroq issiqlik chiqaradi',
        ],
        ru: [
          'Больше частиц обладают энергией не ниже энергии активации',
          'Частицы становятся крупнее',
          'Растёт концентрация реагентов',
          'Реакция выделяет меньше тепла',
        ],
      },
      correctIndex: 0,
      explanation: {
        en: 'Particles also collide a bit more often, but the big effect is that a much larger fraction of collisions have enough energy to react (the Arrhenius factor e^(−Ea/RT)).',
        uz: 'Zarralar biroz tez-tez toʻqnashadi ham, lekin asosiy taʼsir shundaki, toʻqnashuvlarning ancha katta qismi reaksiya uchun yetarli energiyaga ega boʻladi (Arrenius koʻpaytuvchisi e^(−Ea/RT)).',
        ru: 'Частицы сталкиваются и немного чаще, но главное — гораздо большая доля столкновений имеет достаточно энергии для реакции (множитель Аррениуса e^(−Ea/RT)).',
      },
    },
    {
      id: 'catalyst',
      question: {
        en: 'What does a catalyst do?',
        uz: 'Katalizator nima qiladi?',
        ru: 'Что делает катализатор?',
      },
      options: {
        en: [
          'It is used up and becomes a product',
          'It raises the temperature of the mixture',
          'It provides a pathway with lower activation energy',
          'It increases the amount of product at the end',
        ],
        uz: [
          'U sarflanib, mahsulotga aylanadi',
          'Aralashma haroratini oshiradi',
          'Faollanish energiyasi pastroq boʻlgan yoʻlni taqdim etadi',
          'Oxirida hosil boʻladigan mahsulot miqdorini oshiradi',
        ],
        ru: [
          'Расходуется и превращается в продукт',
          'Повышает температуру смеси',
          'Открывает путь реакции с меньшей энергией активации',
          'Увеличивает количество продукта в конце',
        ],
      },
      correctIndex: 2,
      explanation: {
        en: 'A catalyst lowers the activation energy so more collisions succeed. It is not consumed and does not change how much product forms, only how fast.',
        uz: 'Katalizator faollanish energiyasini pasaytiradi, shuning uchun koʻproq toʻqnashuvlar muvaffaqiyatli boʻladi. U sarflanmaydi va mahsulot miqdorini emas, faqat tezlikni oʻzgartiradi.',
        ru: 'Катализатор снижает энергию активации, поэтому больше столкновений оказываются успешными. Он не расходуется и меняет не количество продукта, а только скорость.',
      },
    },
    {
      id: 'surface-area',
      question: {
        en: 'Marble chips react with acid. Which form of the same mass of marble reacts fastest?',
        uz: 'Marmar boʻlaklari kislota bilan reaksiyaga kirishadi. Bir xil massadagi marmarning qaysi shakli eng tez reaksiyaga kirishadi?',
        ru: 'Мрамор реагирует с кислотой. Какая форма мрамора той же массы прореагирует быстрее всего?',
      },
      options: {
        en: ['One large lump', 'A few medium chips', 'Fine powder', 'They all react at the same rate'],
        uz: ['Bitta katta boʻlak', 'Bir nechta oʻrtacha boʻlaklar', 'Mayda kukun', 'Hammasi bir xil tezlikda'],
        ru: ['Один крупный кусок', 'Несколько средних кусочков', 'Мелкий порошок', 'Все с одинаковой скоростью'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Powder has the largest surface area, so more particles are exposed to the acid and collisions happen more often.',
        uz: 'Kukunning sirt yuzasi eng katta, shuning uchun koʻproq zarralar kislotaga ochiq boʻladi va toʻqnashuvlar tez-tez sodir boʻladi.',
        ru: 'У порошка самая большая площадь поверхности, поэтому больше частиц контактирует с кислотой и столкновения происходят чаще.',
      },
    },
    {
      id: 'over-time',
      question: {
        en: 'How does the rate of a reaction usually change as it goes on?',
        uz: 'Reaksiya davom etgan sari uning tezligi odatda qanday oʻzgaradi?',
        ru: 'Как обычно меняется скорость реакции по мере её протекания?',
      },
      options: {
        en: ['It speeds up until it stops', 'It slows down as reactants are used up', 'It stays constant until it stops', 'It changes randomly'],
        uz: ['Toʻxtaguncha tezlashadi', 'Reagentlar sarflangani sari sekinlashadi', 'Toʻxtaguncha oʻzgarmaydi', 'Tasodifiy oʻzgaradi'],
        ru: ['Ускоряется до самой остановки', 'Замедляется по мере расходования реагентов', 'Остаётся постоянной до остановки', 'Меняется случайным образом'],
      },
      correctIndex: 1,
      explanation: {
        en: 'As reactants are consumed their concentration falls, collisions become less frequent and the rate drops, so the product curve levels off.',
        uz: 'Reagentlar sarflangan sari ularning konsentratsiyasi kamayadi, toʻqnashuvlar siyraklashadi va tezlik pasayadi, shuning uchun mahsulot egri chizigʻi tekislanadi.',
        ru: 'По мере расходования реагентов их концентрация падает, столкновения становятся реже и скорость снижается, поэтому кривая продукта выходит на плато.',
      },
    },
  ],
  'newtons-laws': [
    {
      id: 'double-force',
      question: {
        en: 'With no friction, you double the force on the cart. What happens to its acceleration?',
        uz: 'Ishqalanish yoʻq. Aravachaga taʼsir etuvchi kuchni ikki marta oshirdingiz. Tezlanish qanday oʻzgaradi?',
        ru: 'Трения нет. Вы увеличили силу, действующую на тележку, вдвое. Что произойдёт с ускорением?',
      },
      options: {
        en: ['It quadruples', 'It halves', 'It stays the same', 'It doubles'],
        uz: ['Toʻrt marta ortadi', 'Ikki marta kamayadi', 'Oʻzgarmaydi', 'Ikki marta ortadi'],
        ru: ['Увеличится в 4 раза', 'Уменьшится в 2 раза', 'Не изменится', 'Увеличится в 2 раза'],
      },
      correctIndex: 3,
      explanation: {
        en: 'a = F_net/m: with the mass unchanged, acceleration is directly proportional to the net force.',
        uz: 'a = F/m: massa oʻzgarmasa, tezlanish teng taʼsir etuvchi kuchga toʻgʻri proporsional.',
        ru: 'a = F/m: при неизменной массе ускорение прямо пропорционально равнодействующей силе.',
      },
    },
    {
      id: 'double-mass',
      question: {
        en: 'The same force pushes a cart that is twice as heavy. How does the acceleration change?',
        uz: 'Xuddi shu kuch ikki marta ogʻir aravachani itaradi. Tezlanish qanday oʻzgaradi?',
        ru: 'Та же сила толкает вдвое более тяжёлую тележку. Как изменится ускорение?',
      },
      options: {
        en: ['It doubles', 'It does not change', 'It halves', 'It becomes zero'],
        uz: ['Ikki marta ortadi', 'Oʻzgarmaydi', 'Ikki marta kamayadi', 'Nolga teng boʻladi'],
        ru: ['Увеличится в 2 раза', 'Не изменится', 'Уменьшится в 2 раза', 'Станет равным нулю'],
      },
      correctIndex: 2,
      explanation: {
        en: 'For the same net force, acceleration is inversely proportional to mass: twice the mass, half the acceleration.',
        uz: 'Bir xil kuchda tezlanish massaga teskari proporsional: massa ikki marta katta — tezlanish ikki marta kichik.',
        ru: 'При той же силе ускорение обратно пропорционально массе: вдвое больше масса — вдвое меньше ускорение.',
      },
    },
    {
      id: 'stop-pushing',
      question: {
        en: 'On a frictionless track you stop pushing a moving cart. What does it do next?',
        uz: 'Ishqalanishsiz yoʻlda harakatlanayotgan aravachani itarishni toʻxtatdingiz. U keyin nima qiladi?',
        ru: 'На дорожке без трения вы перестали толкать движущуюся тележку. Что она будет делать?',
      },
      options: {
        en: ['Keeps moving at constant speed', 'Speeds up', 'Stops immediately', 'Slows down gradually'],
        uz: ['Oʻzgarmas tezlik bilan harakatlanadi', 'Tezlashadi', 'Darhol toʻxtaydi', 'Asta-sekin sekinlashadi'],
        ru: ['Будет двигаться с постоянной скоростью', 'Будет ускоряться', 'Сразу остановится', 'Постепенно замедлится'],
      },
      correctIndex: 0,
      explanation: {
        en: "Newton's first law: with no resultant force the velocity stays constant. Friction is what normally slows things down.",
        uz: 'Nyutonning birinchi qonuni: teng taʼsir etuvchi kuch boʻlmasa, tezlik oʻzgarmaydi. Odatda jismlarni ishqalanish sekinlashtiradi.',
        ru: 'Первый закон Ньютона: без равнодействующей силы скорость не меняется. Обычно тела замедляет именно трение.',
      },
    },
    {
      id: 'friction-hold',
      question: {
        en: 'A 2 kg cart with μ = 0.3 is pushed with 4 N. Does it move? (g ≈ 10 m/s²)',
        uz: 'μ = 0,3 boʻlgan 2 kg li aravacha 4 N kuch bilan itarilmoqda. U qoʻzgʻaladimi? (g ≈ 10 m/s²)',
        ru: 'Тележку массой 2 кг при μ = 0,3 толкают с силой 4 Н. Сдвинется ли она? (g ≈ 10 м/с²)',
      },
      options: {
        en: ['Yes, but very slowly', 'Only if it is already moving', 'Yes, with a = 2 m/s²', 'No, friction can hold up to 6 N'],
        uz: ['Ha, lekin juda sekin', 'Faqat allaqachon harakatlanayotgan boʻlsa', 'Ha, a = 2 m/s² bilan', 'Yoʻq, ishqalanish 6 N gacha ushlab turadi'],
        ru: ['Да, но очень медленно', 'Только если она уже движется', 'Да, с a = 2 м/с²', 'Нет, трение удерживает до 6 Н'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The largest friction force is μmg = 0.3 × 2 × 10 = 6 N. A 4 N push is smaller, so static friction balances it and the cart stays at rest.',
        uz: 'Eng katta ishqalanish kuchi μmg = 0,3 × 2 × 10 = 6 N. 4 N itarish undan kichik, shuning uchun ishqalanish uni muvozanatlaydi va aravacha tinch turadi.',
        ru: 'Наибольшая сила трения μmg = 0,3 × 2 × 10 = 6 Н. Толчок 4 Н меньше, поэтому трение покоя его уравновешивает и тележка стоит.',
      },
    },
    {
      id: 'third-law',
      question: {
        en: 'The cart presses down on the track with 20 N. How hard does the track push up on the cart?',
        uz: 'Aravacha yoʻlni 20 N kuch bilan pastga bosadi. Yoʻl aravachani qanday kuch bilan yuqoriga itaradi?',
        ru: 'Тележка давит на дорожку с силой 20 Н. С какой силой дорожка давит на тележку вверх?',
      },
      options: {
        en: ['20 N', '0 N', '10 N', '40 N'],
        uz: ['20 N', '0 N', '10 N', '40 N'],
        ru: ['20 Н', '0 Н', '10 Н', '40 Н'],
      },
      correctIndex: 0,
      explanation: {
        en: "Newton's third law: the forces two objects exert on each other are equal in size and opposite in direction.",
        uz: 'Nyutonning uchinchi qonuni: ikki jism bir-biriga teng va qarama-qarshi yoʻnalgan kuchlar bilan taʼsir qiladi.',
        ru: 'Третий закон Ньютона: тела действуют друг на друга с силами, равными по модулю и противоположными по направлению.',
      },
    },
  ],
  'energy-conservation': [
    {
      id: 'top-energy',
      question: {
        en: 'The skater is released at rest from the top of the bowl. What kind of energy do they have there?',
        uz: 'Skeytchi chuqurlik tepasidan tinch holatda qoʻyib yuborildi. U yerda unda qanday energiya bor?',
        ru: 'Скейтера отпускают из состояния покоя с верхнего края чаши. Какая у него там энергия?',
      },
      options: {
        en: ['Only thermal', 'Only kinetic', 'Only potential', 'Equal kinetic and potential'],
        uz: ['Faqat issiqlik', 'Faqat kinetik', 'Faqat potensial', 'Teng kinetik va potensial'],
        ru: ['Только тепловая', 'Только кинетическая', 'Только потенциальная', 'Поровну кинетической и потенциальной'],
      },
      correctIndex: 2,
      explanation: {
        en: 'At rest the speed is zero, so kinetic energy is zero and all the energy is gravitational potential energy, mgh₀.',
        uz: 'Tinch holatda tezlik nol, demak kinetik energiya nol va butun energiya gravitatsion potensial energiya, mgh₀.',
        ru: 'В покое скорость равна нулю, значит кинетическая энергия равна нулю и вся энергия — потенциальная, mgh₀.',
      },
    },
    {
      id: 'bottom-speed',
      question: {
        en: 'Ignoring friction, what is the speed at the bottom after starting from 5 m? (g ≈ 10 m/s²)',
        uz: 'Ishqalanishni hisobga olmasak, 5 m dan boshlagan skeytchining eng pastdagi tezligi qancha? (g ≈ 10 m/s²)',
        ru: 'Без учёта трения: какова скорость внизу при старте с высоты 5 м? (g ≈ 10 м/с²)',
      },
      options: {
        en: ['5 m/s', '10 m/s', '50 m/s', '100 m/s'],
        uz: ['5 m/s', '10 m/s', '50 m/s', '100 m/s'],
        ru: ['5 м/с', '10 м/с', '50 м/с', '100 м/с'],
      },
      correctIndex: 1,
      explanation: {
        en: 'v = √(2gh₀) = √(2 × 10 × 5) = √100 = 10 m/s.',
        uz: 'v = √(2gh₀) = √(2 × 10 × 5) = √100 = 10 m/s.',
        ru: 'v = √(2gh₀) = √(2 × 10 × 5) = √100 = 10 м/с.',
      },
    },
    {
      id: 'mass-effect',
      question: {
        en: 'A skater twice as heavy is released from the same height. How does their speed at the bottom compare?',
        uz: 'Ikki marta ogʻir skeytchi xuddi shu balandlikdan qoʻyib yuborildi. Uning eng pastdagi tezligi qanday?',
        ru: 'Вдвое более тяжёлого скейтера отпускают с той же высоты. Какой будет его скорость внизу?',
      },
      options: {
        en: ['√2 times faster', 'The same', 'Twice as fast', 'Half as fast'],
        uz: ['√2 marta tez', 'Bir xil', 'Ikki marta tez', 'Ikki marta sekin'],
        ru: ['В √2 раз больше', 'Такая же', 'Вдвое больше', 'Вдвое меньше'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Both energies are proportional to mass, so m cancels in ½mv² = mgh₀. Mass changes the energies, not the motion.',
        uz: 'Ikkala energiya ham massaga proporsional, shuning uchun ½mv² = mgh₀ da m qisqarib ketadi. Massa energiyalarni oʻzgartiradi, harakatni emas.',
        ru: 'Обе энергии пропорциональны массе, поэтому в ½mv² = mgh₀ масса сокращается. Масса меняет энергии, но не движение.',
      },
    },
    {
      id: 'friction-energy',
      question: {
        en: 'With friction, the skater rises less high on each swing. Where has the "missing" energy gone?',
        uz: 'Ishqalanishda skeytchi har safar kamroq balandlikka koʻtariladi. “Yoʻqolgan” energiya qayerga ketdi?',
        ru: 'С трением скейтер с каждым разом поднимается ниже. Куда делась «пропавшая» энергия?',
      },
      options: {
        en: ['It has turned into thermal energy', 'It has turned into extra mass', 'It is stored as potential energy', 'It has been destroyed'],
        uz: ['Issiqlik energiyasiga aylandi', 'Qoʻshimcha massaga aylandi', 'Potensial energiya sifatida toʻplandi', 'Yoʻq boʻlib ketdi'],
        ru: ['Превратилась в тепловую энергию', 'Превратилась в дополнительную массу', 'Запасена как потенциальная энергия', 'Она уничтожилась'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Energy is conserved: friction transfers it to the surroundings as heat, so kinetic + potential + thermal stays equal to mgh₀.',
        uz: 'Energiya saqlanadi: ishqalanish uni issiqlik sifatida atrofga beradi, shuning uchun kinetik + potensial + issiqlik mgh₀ ga teng qoladi.',
        ru: 'Энергия сохраняется: трение передаёт её окружающей среде в виде тепла, поэтому сумма кинетической, потенциальной и тепловой остаётся равной mgh₀.',
      },
    },
    {
      id: 'halfway',
      question: {
        en: 'Without friction, what fraction of the total energy is kinetic when the skater is at half the release height?',
        uz: 'Ishqalanishsiz skeytchi qoʻyib yuborilgan balandlikning yarmida boʻlganda jami energiyaning qancha qismi kinetik?',
        ru: 'Без трения: какая доля полной энергии кинетическая, когда скейтер на половине начальной высоты?',
      },
      options: {
        en: ['A quarter', 'Half', 'Three quarters', 'All of it'],
        uz: ['Choragi', 'Yarmi', 'Toʻrtdan uchi', 'Hammasi'],
        ru: ['Четверть', 'Половина', 'Три четверти', 'Вся'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Potential energy is proportional to height, so at h₀/2 it is half of mgh₀. The other half has become kinetic energy.',
        uz: 'Potensial energiya balandlikka proporsional, shuning uchun h₀/2 da u mgh₀ ning yarmi. Qolgan yarmi kinetik energiyaga aylangan.',
        ru: 'Потенциальная энергия пропорциональна высоте, поэтому на h₀/2 она равна половине mgh₀. Другая половина перешла в кинетическую.',
      },
    },
  ],
  'simple-harmonic-motion': [
    {
      id: 'amplitude-period',
      question: {
        en: 'You double the amplitude of the oscillation. What happens to the period?',
        uz: 'Tebranish amplitudasini ikki marta oshirdingiz. Davr qanday oʻzgaradi?',
        ru: 'Вы увеличили амплитуду колебаний вдвое. Что произойдёт с периодом?',
      },
      options: {
        en: ['It grows by √2', 'It doubles', 'It halves', 'It does not change'],
        uz: ['√2 marta ortadi', 'Ikki marta ortadi', 'Ikki marta kamayadi', 'Oʻzgarmaydi'],
        ru: ['Увеличится в √2 раз', 'Увеличится в 2 раза', 'Уменьшится в 2 раза', 'Не изменится'],
      },
      correctIndex: 3,
      explanation: {
        en: 'T = 2π√(m/k) contains no amplitude. A bigger swing covers more distance but also moves faster.',
        uz: 'T = 2π√(m/k) da amplituda yoʻq. Katta tebranish koʻproq masofani bosib oʻtadi, lekin tezroq ham harakatlanadi.',
        ru: 'В T = 2π√(m/k) амплитуды нет. При большом размахе путь больше, но и скорость больше.',
      },
    },
    {
      id: 'mass-x4',
      question: {
        en: 'The mass on the spring is made four times larger. How does the period change?',
        uz: 'Prujinadagi massa toʻrt marta oshirildi. Davr qanday oʻzgaradi?',
        ru: 'Массу на пружине увеличили в четыре раза. Как изменится период?',
      },
      options: {
        en: ['It halves', 'It does not change', 'It doubles', 'It quadruples'],
        uz: ['Ikki marta kamayadi', 'Oʻzgarmaydi', 'Ikki marta ortadi', 'Toʻrt marta ortadi'],
        ru: ['Уменьшится в 2 раза', 'Не изменится', 'Увеличится в 2 раза', 'Увеличится в 4 раза'],
      },
      correctIndex: 2,
      explanation: {
        en: 'T = 2π√(m/k) grows with the square root of the mass: √4 = 2.',
        uz: 'T = 2π√(m/k) massaning kvadrat ildizi bilan oʻsadi: √4 = 2.',
        ru: 'T = 2π√(m/k) растёт как квадратный корень из массы: √4 = 2.',
      },
    },
    {
      id: 'max-speed',
      question: {
        en: 'Where is the speed of the block greatest?',
        uz: 'Brusokning tezligi qayerda eng katta?',
        ru: 'Где скорость бруска наибольшая?',
      },
      options: {
        en: ['Passing through the centre', 'Halfway to a turning point', 'It is the same everywhere', 'At the turning points'],
        uz: ['Markazdan oʻtayotganda', 'Chekka nuqtagacha yoʻlning yarmida', 'Hamma joyda bir xil', 'Chekka nuqtalarda'],
        ru: ['При прохождении центра', 'На полпути к крайней точке', 'Везде одинаковая', 'В крайних точках'],
      },
      correctIndex: 0,
      explanation: {
        en: 'At the centre all the energy is kinetic, so the speed is greatest there. At the turning points the block is momentarily at rest.',
        uz: 'Markazda butun energiya kinetik, shuning uchun tezlik u yerda eng katta. Chekka nuqtalarda brusok bir lahza toʻxtaydi.',
        ru: 'В центре вся энергия кинетическая, поэтому скорость там наибольшая. В крайних точках брусок на мгновение останавливается.',
      },
    },
    {
      id: 'acceleration-direction',
      question: {
        en: 'The block is 5 cm to the right of the centre. Which way does its acceleration point?',
        uz: 'Brusok markazdan 5 sm oʻngda. Uning tezlanishi qaysi tomonga yoʻnalgan?',
        ru: 'Брусок находится на 5 см правее центра. Куда направлено его ускорение?',
      },
      options: {
        en: ['It is zero', 'It depends on the direction of motion', 'To the right', 'To the left, towards the centre'],
        uz: ['U nolga teng', 'Harakat yoʻnalishiga bogʻliq', 'Oʻngga', 'Chapga, markazga qarab'],
        ru: ['Оно равно нулю', 'Зависит от направления движения', 'Вправо', 'Влево, к центру'],
      },
      correctIndex: 3,
      explanation: {
        en: 'a = −(k/m)x: the acceleration is always opposite to the displacement, pointing back to the centre, whichever way the block is moving.',
        uz: 'a = −(k/m)x: tezlanish doimo siljishga qarama-qarshi, markazga yoʻnalgan, brusok qaysi tomonga harakatlanmasin.',
        ru: 'a = −(k/m)x: ускорение всегда противоположно смещению и направлено к центру, куда бы брусок ни двигался.',
      },
    },
    {
      id: 'energy-amplitude',
      question: {
        en: 'Without damping, you double the amplitude. What happens to the total energy?',
        uz: 'Soʻnish yoʻq. Amplitudani ikki marta oshirdingiz. Jami energiya qanday oʻzgaradi?',
        ru: 'Без затухания вы удвоили амплитуду. Что произойдёт с полной энергией?',
      },
      options: {
        en: ['It doubles', 'It stays the same', 'It quadruples', 'It halves'],
        uz: ['Ikki marta ortadi', 'Oʻzgarmaydi', 'Toʻrt marta ortadi', 'Ikki marta kamayadi'],
        ru: ['Увеличится в 2 раза', 'Не изменится', 'Увеличится в 4 раза', 'Уменьшится в 2 раза'],
      },
      correctIndex: 2,
      explanation: {
        en: 'The total energy is ½kA², so it depends on the square of the amplitude: 2² = 4.',
        uz: 'Jami energiya ½kA², demak u amplitudaning kvadratiga bogʻliq: 2² = 4.',
        ru: 'Полная энергия равна ½kA², то есть зависит от квадрата амплитуды: 2² = 4.',
      },
    },
  ],
  'hookes-law': [
    {
      id: 'k-from-data',
      question: {
        en: 'A 2 N load stretches a spring by 4 cm. What is its spring constant?',
        uz: '2 N yuk prujinani 4 sm ga choʻzadi. Uning bikrligi qancha?',
        ru: 'Груз 2 Н растягивает пружину на 4 см. Какова её жёсткость?',
      },
      options: {
        en: ['0.5 N/m', '8 N/m', '50 N/m', '200 N/m'],
        uz: ['0,5 N/m', '8 N/m', '50 N/m', '200 N/m'],
        ru: ['0,5 Н/м', '8 Н/м', '50 Н/м', '200 Н/м'],
      },
      correctIndex: 2,
      explanation: {
        en: 'k = F/x = 2 N / 0.04 m = 50 N/m. Remember to convert centimetres to metres.',
        uz: 'k = F/x = 2 N / 0,04 m = 50 N/m. Santimetrni metrga aylantirishni unutmang.',
        ru: 'k = F/x = 2 Н / 0,04 м = 50 Н/м. Не забудьте перевести сантиметры в метры.',
      },
    },
    {
      id: 'double-load',
      question: {
        en: 'Below the elastic limit, you double the load. What happens to the extension?',
        uz: 'Elastiklik chegarasigacha yukni ikki marta oshirdingiz. Choʻzilish qanday oʻzgaradi?',
        ru: 'До предела упругости вы удвоили нагрузку. Что произойдёт с удлинением?',
      },
      options: {
        en: ['It stays the same', 'It doubles', 'It quadruples', 'It grows by √2'],
        uz: ['Oʻzgarmaydi', 'Ikki marta ortadi', 'Toʻrt marta ortadi', '√2 marta ortadi'],
        ru: ['Не изменится', 'Увеличится в 2 раза', 'Увеличится в 4 раза', 'Увеличится в √2 раз'],
      },
      correctIndex: 1,
      explanation: {
        en: "Hooke's law F = kx: extension is directly proportional to the force.",
        uz: 'Guk qonuni F = kx: choʻzilish kuchga toʻgʻri proporsional.',
        ru: 'Закон Гука F = kx: удлинение прямо пропорционально силе.',
      },
    },
    {
      id: 'graph-slope',
      question: {
        en: 'On a force–extension graph, what does a steeper straight line mean?',
        uz: 'Kuch–choʻzilish grafigida tikroq toʻgʻri chiziq nimani bildiradi?',
        ru: 'Что означает более крутая прямая на графике «сила – удлинение»?',
      },
      options: {
        en: ['A stiffer spring', 'A softer spring', 'A heavier load', 'The elastic limit has been passed'],
        uz: ['Bikrroq prujina', 'Yumshoqroq prujina', 'Ogʻirroq yuk', 'Elastiklik chegarasidan oʻtilgan'],
        ru: ['Более жёсткую пружину', 'Более мягкую пружину', 'Более тяжёлый груз', 'Превышение предела упругости'],
      },
      correctIndex: 0,
      explanation: {
        en: 'The slope of F against x is k. A larger k means more force is needed for the same extension: a stiffer spring.',
        uz: 'F ning x ga bogʻliqlik grafigi qiyaligi — k. Katta k bir xil choʻzilish uchun koʻproq kuch kerakligini bildiradi: bikrroq prujina.',
        ru: 'Наклон графика F от x равен k. Большее k означает, что для того же удлинения нужна большая сила: пружина жёстче.',
      },
    },
    {
      id: 'elastic-limit',
      question: {
        en: 'A spring is loaded beyond its elastic limit and then unloaded. What do you observe?',
        uz: 'Prujina elastiklik chegarasidan ortiq yuklandi, soʻng yuk olindi. Nimani koʻrasiz?',
        ru: 'Пружину нагрузили сверх предела упругости, а затем разгрузили. Что вы увидите?',
      },
      options: {
        en: ['It stays permanently longer', 'It becomes shorter than before', 'It becomes stiffer', 'It returns to its original length'],
        uz: ['Butunlay uzunroq boʻlib qoladi', 'Avvalgidan qisqaroq boʻladi', 'Bikrroq boʻladi', 'Dastlabki uzunligiga qaytadi'],
        ru: ['Останется удлинённой', 'Станет короче, чем была', 'Станет жёстче', 'Вернётся к исходной длине'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Beyond the elastic limit the deformation is plastic: part of the extension remains after the load is removed (permanent set).',
        uz: 'Elastiklik chegarasidan keyin deformatsiya plastik: yuk olingandan keyin choʻzilishning bir qismi qoladi (qoldiq deformatsiya).',
        ru: 'За пределом упругости деформация пластическая: после снятия нагрузки часть удлинения остаётся (остаточная деформация).',
      },
    },
    {
      id: 'energy',
      question: {
        en: 'A spring with k = 100 N/m is stretched by 0.1 m. How much elastic energy does it store?',
        uz: 'k = 100 N/m boʻlgan prujina 0,1 m ga choʻzildi. Unda qancha elastik energiya toʻplangan?',
        ru: 'Пружину с k = 100 Н/м растянули на 0,1 м. Сколько упругой энергии она запасла?',
      },
      options: {
        en: ['10 J', '1 J', '0.5 J', '5 J'],
        uz: ['10 J', '1 J', '0,5 J', '5 J'],
        ru: ['10 Дж', '1 Дж', '0,5 Дж', '5 Дж'],
      },
      correctIndex: 2,
      explanation: {
        en: 'E = ½kx² = ½ × 100 × 0.1² = 0.5 J.',
        uz: 'E = ½kx² = ½ × 100 × 0,1² = 0,5 J.',
        ru: 'E = ½kx² = ½ × 100 × 0,1² = 0,5 Дж.',
      },
    },
  ],
  'electromagnetic-induction': [
    {
      id: 'still-magnet',
      question: {
        en: 'A strong magnet rests inside the coil without moving. What does the voltmeter read?',
        uz: 'Kuchli magnit gʻaltak ichida qimirlamay turibdi. Voltmetr nimani koʻrsatadi?',
        ru: 'Сильный магнит неподвижно лежит внутри катушки. Что показывает вольтметр?',
      },
      options: {
        en: ['A large constant voltage', 'Zero', 'A voltage that keeps changing sign', 'The maximum voltage'],
        uz: ['Katta oʻzgarmas kuchlanish', 'Nol', 'Ishorasi oʻzgarib turadigan kuchlanish', 'Eng katta kuchlanish'],
        ru: ['Большое постоянное напряжение', 'Ноль', 'Напряжение, меняющее знак', 'Максимальное напряжение'],
      },
      correctIndex: 1,
      explanation: {
        en: 'A voltage is induced only while the flux is changing. A stationary magnet gives a constant flux, so the EMF is zero.',
        uz: 'Kuchlanish faqat oqim oʻzgarayotganda induksiyalanadi. Harakatsiz magnit oʻzgarmas oqim beradi, shuning uchun EYuK nolga teng.',
        ru: 'Напряжение индуцируется только при изменении потока. Неподвижный магнит даёт постоянный поток, поэтому ЭДС равна нулю.',
      },
    },
    {
      id: 'faster',
      question: {
        en: 'You move the magnet in and out twice as fast. What happens to the peak voltage?',
        uz: 'Magnitni ikki marta tezroq kiritib-chiqaryapsiz. Eng katta kuchlanish nima boʻladi?',
        ru: 'Вы двигаете магнит вдвое быстрее. Что произойдёт с пиковым напряжением?',
      },
      options: {
        en: ['It quadruples', 'It halves', 'It stays the same', 'It doubles'],
        uz: ['Toʻrt marta ortadi', 'Ikki marta kamayadi', 'Oʻzgarmaydi', 'Ikki marta ortadi'],
        ru: ['Увеличится в 4 раза', 'Уменьшится вдвое', 'Не изменится', 'Удвоится'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The same change of flux happens in half the time, so ΔΦ/Δt and therefore the EMF doubles.',
        uz: 'Oqimning xuddi shu oʻzgarishi ikki marta qisqa vaqtda sodir boʻladi, shuning uchun ΔΦ/Δt va demak EYuK ikki marta ortadi.',
        ru: 'То же изменение потока происходит за вдвое меньшее время, поэтому ΔΦ/Δt, а значит и ЭДС, удваиваются.',
      },
    },
    {
      id: 'turns',
      question: {
        en: 'The coil is rewound with three times as many turns. How does the induced voltage change?',
        uz: 'Gʻaltak uch marta koʻp oʻram bilan qayta oʻraldi. Induksiya kuchlanishi qanday oʻzgaradi?',
        ru: 'Катушку перемотали, сделав втрое больше витков. Как изменится ЭДС индукции?',
      },
      options: {
        en: ['It falls to a third', 'It grows by √3', 'It triples', 'It does not change'],
        uz: ['Uch marta kamayadi', '√3 marta ortadi', 'Uch marta ortadi', 'Oʻzgarmaydi'],
        ru: ['Уменьшится в 3 раза', 'Увеличится в √3 раз', 'Увеличится в 3 раза', 'Не изменится'],
      },
      correctIndex: 2,
      explanation: {
        en: 'ε = −N ΔΦ/Δt: each turn contributes the same EMF, so the total is proportional to N.',
        uz: 'ε = −N ΔΦ/Δt: har bir oʻram bir xil EYuK qoʻshadi, shuning uchun jami N ga proporsional.',
        ru: 'ε = −N ΔΦ/Δt: каждый виток даёт одинаковую ЭДС, поэтому суммарная пропорциональна N.',
      },
    },
    {
      id: 'in-out',
      question: {
        en: 'How does the voltage while the magnet moves in compare with the voltage while it moves out?',
        uz: 'Magnit kirayotgandagi kuchlanish chiqayotgandagi kuchlanish bilan qanday farq qiladi?',
        ru: 'Чем отличается напряжение при вдвигании магнита от напряжения при его выдвигании?',
      },
      options: {
        en: ['It has the opposite sign', 'It is always larger', 'Only one of them is non-zero', 'It is the same'],
        uz: ['Ishorasi qarama-qarshi', 'Doimo kattaroq', 'Faqat bittasi noldan farqli', 'Bir xil'],
        ru: ['Противоположного знака', 'Всегда больше', 'Только одно из них не равно нулю', 'Одинаковое'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Moving in increases the flux and moving out decreases it, so ΔΦ/Δt and the EMF change sign (Lenz’s law).',
        uz: 'Kirishda oqim ortadi, chiqishda kamayadi, shuning uchun ΔΦ/Δt va EYuK ishorasini oʻzgartiradi (Lens qoidasi).',
        ru: 'При вдвигании поток растёт, при выдвигании убывает, поэтому ΔΦ/Δt и ЭДС меняют знак (правило Ленца).',
      },
    },
    {
      id: 'lenz',
      question: {
        en: 'A north pole is pushed towards a closed coil. What pole appears at the near end of the coil?',
        uz: 'Shimoliy qutb yopiq gʻaltakka yaqinlashtirilmoqda. Gʻaltakning yaqin uchida qanday qutb hosil boʻladi?',
        ru: 'Северный полюс приближают к замкнутой катушке. Какой полюс возникает на ближнем конце катушки?',
      },
      options: {
        en: ['A south pole, attracting the magnet', 'A north pole, repelling the magnet', 'No pole at all', 'It keeps switching'],
        uz: ['Janubiy qutb, magnitni tortadi', 'Shimoliy qutb, magnitni itaradi', 'Hech qanday qutb', 'Doimo almashib turadi'],
        ru: ['Южный, притягивающий магнит', 'Северный, отталкивающий магнит', 'Никакого полюса', 'Постоянно меняется'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Lenz’s law: the induced current opposes the change. To oppose the approaching north pole, the coil forms a north pole that repels it.',
        uz: 'Lens qoidasi: induksion tok oʻzgarishga qarshilik qiladi. Yaqinlashayotgan shimoliy qutbga qarshilik qilish uchun gʻaltak uni itaruvchi shimoliy qutb hosil qiladi.',
        ru: 'Правило Ленца: индукционный ток противодействует изменению. Чтобы противодействовать приближению северного полюса, катушка образует северный полюс, отталкивающий магнит.',
      },
    },
  ],
  'refraction-reflection': [
    {
      id: 'reflection-angle',
      question: {
        en: 'A ray hits a mirror at 35° to the normal. What is the angle of reflection?',
        uz: 'Nur koʻzguga normalga nisbatan 35° burchak ostida tushadi. Qaytish burchagi qancha?',
        ru: 'Луч падает на зеркало под углом 35° к нормали. Каков угол отражения?',
      },
      options: {
        en: ['35°', '55°', '70°', '145°'],
        uz: ['35°', '55°', '70°', '145°'],
        ru: ['35°', '55°', '70°', '145°'],
      },
      correctIndex: 0,
      explanation: {
        en: 'The angle of reflection always equals the angle of incidence, both measured from the normal.',
        uz: 'Qaytish burchagi doimo tushish burchagiga teng, ikkalasi ham normaldan oʻlchanadi.',
        ru: 'Угол отражения всегда равен углу падения; оба отсчитываются от нормали.',
      },
    },
    {
      id: 'into-glass',
      question: {
        en: 'Light passes from air into glass at an angle. How does the ray bend?',
        uz: 'Yorugʻlik havodan shishaga qiya oʻtadi. Nur qanday sinadi?',
        ru: 'Свет переходит из воздуха в стекло под углом. Как отклоняется луч?',
      },
      options: {
        en: ['It does not bend', 'It is fully reflected', 'Away from the normal', 'Towards the normal'],
        uz: ['Sinmaydi', 'Toʻliq qaytadi', 'Normaldan uzoqlashadi', 'Normalga yaqinlashadi'],
        ru: ['Не отклоняется', 'Полностью отражается', 'От нормали', 'К нормали'],
      },
      correctIndex: 3,
      explanation: {
        en: 'Light slows down in glass (n = 1.5), so by Snell’s law sin θ₂ < sin θ₁ and the ray bends towards the normal.',
        uz: 'Shishada yorugʻlik sekinlashadi (n = 1,5), shuning uchun Snell qonuniga koʻra sin θ₂ < sin θ₁ va nur normalga yaqinlashadi.',
        ru: 'В стекле свет замедляется (n = 1,5), поэтому по закону Снеллиуса sin θ₂ < sin θ₁ и луч отклоняется к нормали.',
      },
    },
    {
      id: 'tir-condition',
      question: {
        en: 'When can total internal reflection happen?',
        uz: 'Toʻliq ichki qaytish qachon sodir boʻlishi mumkin?',
        ru: 'Когда возможно полное внутреннее отражение?',
      },
      options: {
        en: ['Only at 90°', 'Going from air into water', 'Going from glass into air beyond the critical angle', 'At any angle in any medium'],
        uz: ['Faqat 90° da', 'Havodan suvga oʻtishda', 'Shishadan havoga chegaraviy burchakdan katta burchakda', 'Har qanday muhitda istalgan burchakda'],
        ru: ['Только при 90°', 'При переходе из воздуха в воду', 'При переходе из стекла в воздух за предельным углом', 'При любом угле в любой среде'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Total internal reflection needs light going into a medium with a lower refractive index and an angle of incidence larger than the critical angle.',
        uz: 'Toʻliq ichki qaytish uchun yorugʻlik sindirish koʻrsatkichi kichikroq muhitga oʻtishi va tushish burchagi chegaraviy burchakdan katta boʻlishi kerak.',
        ru: 'Для полного внутреннего отражения свет должен переходить в среду с меньшим показателем преломления под углом больше предельного.',
      },
    },
    {
      id: 'critical-angle',
      question: {
        en: 'Glass has n = 1.5. What is the critical angle for light going from glass into air? (sin 41.8° ≈ 0.667)',
        uz: 'Shishaning n = 1,5. Shishadan havoga oʻtayotgan yorugʻlik uchun chegaraviy burchak qancha? (sin 41,8° ≈ 0,667)',
        ru: 'У стекла n = 1,5. Каков предельный угол для света, выходящего из стекла в воздух? (sin 41,8° ≈ 0,667)',
      },
      options: {
        en: ['About 19°', 'About 30°', 'About 42°', 'About 67°'],
        uz: ['Taxminan 19°', 'Taxminan 30°', 'Taxminan 42°', 'Taxminan 67°'],
        ru: ['Около 19°', 'Около 30°', 'Около 42°', 'Около 67°'],
      },
      correctIndex: 2,
      explanation: {
        en: 'sin θc = n₂/n₁ = 1/1.5 ≈ 0.667, so θc ≈ 41.8°.',
        uz: 'sin θc = n₂/n₁ = 1/1,5 ≈ 0,667, demak θc ≈ 41,8°.',
        ru: 'sin θc = n₂/n₁ = 1/1,5 ≈ 0,667, значит θc ≈ 41,8°.',
      },
    },
    {
      id: 'light-speed',
      question: {
        en: 'Diamond has n ≈ 2.4. How fast does light travel in diamond compared with a vacuum?',
        uz: 'Olmosning n ≈ 2,4. Olmosda yorugʻlik vakuumdagiga nisbatan qanday tezlikda tarqaladi?',
        ru: 'У алмаза n ≈ 2,4. С какой скоростью свет распространяется в алмазе по сравнению с вакуумом?',
      },
      options: {
        en: ['2.4 times faster', 'At the same speed', 'About 2.4 times slower', '2.4² times slower'],
        uz: ['2,4 marta tez', 'Bir xil tezlikda', 'Taxminan 2,4 marta sekin', '2,4² marta sekin'],
        ru: ['В 2,4 раза быстрее', 'С той же скоростью', 'Примерно в 2,4 раза медленнее', 'В 2,4² раза медленнее'],
      },
      correctIndex: 2,
      explanation: {
        en: 'v = c/n ≈ 3×10⁸ / 2.4 ≈ 1.25×10⁸ m/s, about 2.4 times slower than in a vacuum.',
        uz: 'v = c/n ≈ 3×10⁸ / 2,4 ≈ 1,25×10⁸ m/s, vakuumdagidan taxminan 2,4 marta sekin.',
        ru: 'v = c/n ≈ 3×10⁸ / 2,4 ≈ 1,25×10⁸ м/с — примерно в 2,4 раза медленнее, чем в вакууме.',
      },
    },
  ],
  'heat-transfer': [
    {
      id: 'best-conductor',
      question: {
        en: 'Which of these materials conducts heat best?',
        uz: 'Quyidagi materiallardan qaysi biri issiqlikni eng yaxshi oʻtkazadi?',
        ru: 'Какой из этих материалов лучше всего проводит тепло?',
      },
      options: {
        en: ['Steel', 'Copper', 'Wood', 'Glass'],
        uz: ['Poʻlat', 'Mis', 'Yogʻoch', 'Shisha'],
        ru: ['Сталь', 'Медь', 'Дерево', 'Стекло'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Copper has a thermal conductivity of about 400 W/(m·K), far more than steel (about 50), glass (about 1) or wood (about 0.15).',
        uz: 'Misning issiqlik oʻtkazuvchanligi taxminan 400 Vt/(m·K), bu poʻlat (taxminan 50), shisha (taxminan 1) yoki yogʻochdan (taxminan 0,15) ancha koʻp.',
        ru: 'Теплопроводность меди около 400 Вт/(м·К) — намного больше, чем у стали (около 50), стекла (около 1) или дерева (около 0,15).',
      },
    },
    {
      id: 'direction',
      question: {
        en: 'In which direction does heat flow along the rod?',
        uz: 'Issiqlik sterjen boʻylab qaysi yoʻnalishda oqadi?',
        ru: 'В каком направлении тепло течёт по стержню?',
      },
      options: {
        en: ['From the hot end to the cold end', 'From the cold end to the hot end', 'Both ways equally', 'It depends on the material'],
        uz: ['Issiq uchidan sovuq uchiga', 'Sovuq uchidan issiq uchiga', 'Ikkala tomonga teng', 'Materialga bogʻliq'],
        ru: ['От горячего конца к холодному', 'От холодного конца к горячему', 'В обе стороны одинаково', 'Зависит от материала'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Heat always flows spontaneously from higher to lower temperature.',
        uz: 'Issiqlik doimo oʻz-oʻzidan yuqori haroratdan past haroratga oqadi.',
        ru: 'Тепло всегда самопроизвольно переходит от более высокой температуры к более низкой.',
      },
    },
    {
      id: 'length',
      question: {
        en: 'In the steady state, what happens to the heat flow if the rod is made twice as long?',
        uz: 'Barqaror holatda sterjen ikki marta uzun qilinsa, issiqlik oqimi nima boʻladi?',
        ru: 'Что произойдёт с установившимся тепловым потоком, если стержень сделать вдвое длиннее?',
      },
      options: {
        en: ['It does not change', 'It quarters', 'It doubles', 'It halves'],
        uz: ['Oʻzgarmaydi', 'Toʻrt marta kamayadi', 'Ikki marta ortadi', 'Ikki marta kamayadi'],
        ru: ['Не изменится', 'Уменьшится в 4 раза', 'Удвоится', 'Уменьшится вдвое'],
      },
      correctIndex: 3,
      explanation: {
        en: 'P = kAΔT/L: the heat flow is inversely proportional to the length of the rod.',
        uz: 'P = kAΔT/L: issiqlik oqimi sterjen uzunligiga teskari proporsional.',
        ru: 'P = kAΔT/L: тепловой поток обратно пропорционален длине стержня.',
      },
    },
    {
      id: 'steady-profile',
      question: {
        en: 'After a long time, how does the temperature vary along a uniform rod between the two baths?',
        uz: 'Uzoq vaqtdan keyin ikki vanna orasidagi bir jinsli sterjen boʻylab harorat qanday oʻzgaradi?',
        ru: 'Как меняется температура вдоль однородного стержня между банями спустя долгое время?',
      },
      options: {
        en: ['It changes randomly', 'It is the same everywhere', 'It falls in a straight line from hot to cold', 'It is hottest in the middle'],
        uz: ['Tasodifiy oʻzgaradi', 'Hamma joyda bir xil', 'Issiqdan sovuqqa toʻgʻri chiziq boʻylab kamayadi', 'Oʻrtasida eng issiq'],
        ru: ['Меняется случайно', 'Везде одинаковая', 'Убывает по прямой от горячего конца к холодному', 'Выше всего посередине'],
      },
      correctIndex: 2,
      explanation: {
        en: 'In the steady state the same heat flows through every section, so the temperature gradient is constant and the profile is a straight line.',
        uz: 'Barqaror holatda har bir kesimdan bir xil issiqlik oqadi, shuning uchun harorat gradiyenti oʻzgarmas va profil toʻgʻri chiziq.',
        ru: 'В установившемся режиме через каждое сечение проходит одинаковый поток, поэтому градиент температуры постоянен и профиль — прямая.',
      },
    },
    {
      id: 'metal-feels-cold',
      question: {
        en: 'A metal bench and a wooden bench are both at 10 °C. Why does the metal one feel colder to touch?',
        uz: 'Metall va yogʻoch skameykaning ikkalasi ham 10 °C da. Nima uchun metall ushlaganda sovuqroq tuyuladi?',
        ru: 'Металлическая и деревянная скамейки обе при 10 °C. Почему металлическая на ощупь холоднее?',
      },
      options: {
        en: ['The metal is really at a lower temperature', 'Metal conducts heat away from your hand faster', 'Wood produces its own heat', 'Metal reflects body heat'],
        uz: ['Metall haqiqatan ham sovuqroq', 'Metall qoʻlingizdan issiqlikni tezroq olib ketadi', 'Yogʻoch oʻzi issiqlik chiqaradi', 'Metall tana issiqligini qaytaradi'],
        ru: ['Металл на самом деле холоднее', 'Металл быстрее отводит тепло от руки', 'Дерево само выделяет тепло', 'Металл отражает тепло тела'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Both are at the same temperature, but metal is a much better conductor, so it draws heat from your skin faster and your skin cools more.',
        uz: 'Ikkalasining harorati bir xil, lekin metall ancha yaxshi oʻtkazgich, shuning uchun u terining issiqligini tezroq oladi va teri koʻproq soviydi.',
        ru: 'Температура у них одинаковая, но металл гораздо лучше проводит тепло, поэтому быстрее отбирает его у кожи, и кожа сильнее остывает.',
      },
    },
  ],
  'zeeman-effect': [
    {
      id: 'cause',
      question: {
        en: 'What causes a spectral line to split in the Zeeman effect?',
        uz: 'Zeeman effektida spektral chiziq nima sababdan ajraladi?',
        ru: 'Что вызывает расщепление спектральной линии в эффекте Зеемана?',
      },
      options: {
        en: [
          'The spectrometer is out of focus',
          'An electric field shifts the electrons',
          'A magnetic field splits the energy levels by m_l',
          'The lamp gets hotter',
        ],
        uz: [
          'Spektrometr fokusdan chiqqan',
          'Elektr maydon elektronlarni siljitadi',
          'Magnit maydon energiya sathlarini m_l boʻyicha ajratadi',
          'Lampa qiziydi',
        ],
        ru: [
          'Спектрометр расфокусирован',
          'Электрическое поле смещает электроны',
          'Магнитное поле расщепляет уровни энергии по m_l',
          'Лампа сильнее нагревается',
        ],
      },
      correctIndex: 2,
      explanation: {
        en: 'The orbital magnetic moment interacts with B, so each level splits into sublevels with energies shifted by μ_B·B·m_l.',
        uz: 'Orbital magnit momenti B bilan taʼsirlashadi, shuning uchun har bir sath energiyasi μ_B·B·m_l ga siljigan qism sathlarga ajraladi.',
        ru: 'Орбитальный магнитный момент взаимодействует с B, и каждый уровень расщепляется на подуровни, сдвинутые на μ_B·B·m_l.',
      },
    },
    {
      id: 'longitudinal',
      question: {
        en: 'Looking along the magnetic field (longitudinal view), how many components of the normal Zeeman triplet do you see?',
        uz: 'Magnit maydon boʻylab qaralganda (boʻylama kuzatish) normal Zeeman tripletining nechta komponenti koʻrinadi?',
        ru: 'Сколько компонент нормального зеемановского триплета видно вдоль магнитного поля (продольное наблюдение)?',
      },
      options: {
        en: ['Two (the σ lines)', 'Three', 'Five', 'One'],
        uz: ['Ikkita (σ chiziqlar)', 'Uchta', 'Beshta', 'Bitta'],
        ru: ['Две (σ-линии)', 'Три', 'Пять', 'Одну'],
      },
      correctIndex: 0,
      explanation: {
        en: 'The π line oscillates parallel to B, and light cannot travel along its own direction of oscillation, so only the two circularly polarised σ lines are seen.',
        uz: 'π chiziq B ga parallel tebranadi, yorugʻlik esa oʻz tebranish yoʻnalishi boʻylab tarqala olmaydi, shuning uchun faqat ikkita aylanma qutblangan σ chiziq koʻrinadi.',
        ru: 'π-линия колеблется параллельно B, а свет не распространяется вдоль направления своих колебаний, поэтому видны только две σ-линии с круговой поляризацией.',
      },
    },
    {
      id: 'formula',
      question: {
        en: 'Which formula gives the energy shift of a sublevel in the normal Zeeman effect?',
        uz: 'Normal Zeeman effektida qism sath energiyasining siljishi qaysi formula bilan topiladi?',
        ru: 'Какая формула даёт сдвиг энергии подуровня в нормальном эффекте Зеемана?',
      },
      options: {
        en: ['ΔE = h c / λ', 'ΔE = e · E · d', 'ΔE = ½ m v²', 'ΔE = μ_B · B · m_l'],
        uz: ['ΔE = h c / λ', 'ΔE = e · E · d', 'ΔE = ½ m v²', 'ΔE = μ_B · B · m_l'],
        ru: ['ΔE = h c / λ', 'ΔE = e · E · d', 'ΔE = ½ m v²', 'ΔE = μ_B · B · m_l'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The shift is the Bohr magneton times the field times the magnetic quantum number, so it grows in proportion to B.',
        uz: 'Siljish Bor magnetoni, maydon va magnit kvant sonining koʻpaytmasiga teng, shuning uchun B ga proporsional oʻsadi.',
        ru: 'Сдвиг равен произведению магнетона Бора, поля и магнитного квантового числа, поэтому растёт пропорционально B.',
      },
    },
    {
      id: 'bohr-magneton',
      question: {
        en: 'What is the Bohr magneton μ_B?',
        uz: 'Bor magnetoni μ_B nima?',
        ru: 'Что такое магнетон Бора μ_B?',
      },
      options: {
        en: [
          'The charge of a proton',
          'The natural unit of an electron’s magnetic moment, eħ/2m ≈ 9.27 × 10⁻²⁴ J/T',
          'The strength of the magnet in tesla',
          'The wavelength of the cadmium line',
        ],
        uz: [
          'Protonning zaryadi',
          'Elektron magnit momentining tabiiy birligi, eħ/2m ≈ 9,27 × 10⁻²⁴ J/T',
          'Magnitning tesladagi kuchi',
          'Kadmiy chizigʻining toʻlqin uzunligi',
        ],
        ru: [
          'Заряд протона',
          'Естественная единица магнитного момента электрона, eħ/2m ≈ 9,27 × 10⁻²⁴ Дж/Тл',
          'Сила магнита в теслах',
          'Длина волны линии кадмия',
        ],
      },
      correctIndex: 1,
      explanation: {
        en: 'μ_B = eħ/2m_e. Because it contains e/m, measuring the splitting lets you find the specific charge of the electron.',
        uz: 'μ_B = eħ/2m_e. Unda e/m bor, shuning uchun ajralishni oʻlchab elektronning solishtirma zaryadini topish mumkin.',
        ru: 'μ_B = eħ/2m_e. Он содержит e/m, поэтому по величине расщепления можно найти удельный заряд электрона.',
      },
    },
    {
      id: 'cadmium',
      question: {
        en: 'Why is the red cadmium line (643.8 nm) used to show the normal Zeeman effect?',
        uz: 'Nima uchun normal Zeeman effektini koʻrsatishda kadmiyning qizil chizigʻi (643,8 nm) ishlatiladi?',
        ru: 'Почему для демонстрации нормального эффекта Зеемана используют красную линию кадмия (643,8 нм)?',
      },
      options: {
        en: [
          'Cadmium is magnetic',
          'It is the brightest line of any element',
          'Both its levels are singlets (spin 0), so it splits into exactly three equally spaced lines',
          'Red light is not affected by magnetic fields',
        ],
        uz: [
          'Kadmiy magnitli modda',
          'Bu barcha elementlar ichida eng yorqin chiziq',
          'Uning ikkala sathi singlet (spin 0), shuning uchun u aynan uchta teng oraliqli chiziqqa ajraladi',
          'Qizil yorugʻlikka magnit maydon taʼsir qilmaydi',
        ],
        ru: [
          'Кадмий — магнитный металл',
          'Это самая яркая линия среди всех элементов',
          'Оба её уровня синглетные (спин 0), поэтому она расщепляется ровно на три равноотстоящие линии',
          'На красный свет магнитное поле не действует',
        ],
      },
      correctIndex: 2,
      explanation: {
        en: 'For the ¹D₂ → ¹P₁ transition the spin plays no part (g = 1), so the nine allowed transitions fall on just three lines: the normal Zeeman triplet.',
        uz: '¹D₂ → ¹P₁ oʻtishda spin rol oʻynamaydi (g = 1), shuning uchun toʻqqizta ruxsat etilgan oʻtish faqat uchta chiziqqa tushadi: normal Zeeman tripleti.',
        ru: 'В переходе ¹D₂ → ¹P₁ спин не участвует (g = 1), поэтому девять разрешённых переходов дают всего три линии — нормальный зеемановский триплет.',
      },
    },
  ],
  'density-measurement': [
    {
      id: 'formula',
      question: {
        en: 'A stone has a mass of 54 g and a volume of 20 cm³. What is its density?',
        uz: 'Toshning massasi 54 g, hajmi 20 cm³. Uning zichligi qancha?',
        ru: 'Масса камня 54 г, объём 20 см³. Какова его плотность?',
      },
      options: {
        en: ['2.7 g/cm³', '0.37 g/cm³', '74 g/cm³', '1080 g/cm³'],
        uz: ['2,7 g/cm³', '0,37 g/cm³', '74 g/cm³', '1080 g/cm³'],
        ru: ['2,7 г/см³', '0,37 г/см³', '74 г/см³', '1080 г/см³'],
      },
      correctIndex: 0,
      explanation: {
        en: 'ρ = m/V = 54 g / 20 cm³ = 2.7 g/cm³.',
        uz: 'ρ = m/V = 54 g / 20 cm³ = 2,7 g/cm³.',
        ru: 'ρ = m/V = 54 г / 20 см³ = 2,7 г/см³.',
      },
    },
    {
      id: 'units',
      question: {
        en: 'What is 2.7 g/cm³ in SI units?',
        uz: '2,7 g/cm³ SI birliklarida qancha boʻladi?',
        ru: 'Сколько 2,7 г/см³ в единицах СИ?',
      },
      options: {
        en: ['27 kg/m³', '2700 kg/m³', '0.0027 kg/m³', '2.7 kg/m³'],
        uz: ['27 kg/m³', '2700 kg/m³', '0,0027 kg/m³', '2,7 kg/m³'],
        ru: ['27 кг/м³', '2700 кг/м³', '0,0027 кг/м³', '2,7 кг/м³'],
      },
      correctIndex: 1,
      explanation: {
        en: '1 g/cm³ = 1000 kg/m³, because 1 m³ holds a million cm³ and 1 kg is 1000 g.',
        uz: '1 g/cm³ = 1000 kg/m³, chunki 1 m³ da million cm³ bor, 1 kg esa 1000 g.',
        ru: '1 г/см³ = 1000 кг/м³: в 1 м³ миллион см³, а 1 кг — это 1000 г.',
      },
    },
    {
      id: 'displacement',
      question: {
        en: 'The water in a cylinder rises from 50 mL to 71 mL when a stone is lowered in. What is the stone’s volume?',
        uz: 'Tosh tushirilganda silindrdagi suv 50 mL dan 71 mL gacha koʻtarildi. Toshning hajmi qancha?',
        ru: 'Когда в цилиндр опустили камень, уровень воды поднялся с 50 мл до 71 мл. Каков объём камня?',
      },
      options: {
        en: ['121 cm³', '71 cm³', '50 cm³', '21 cm³'],
        uz: ['121 cm³', '71 cm³', '50 cm³', '21 cm³'],
        ru: ['121 см³', '71 см³', '50 см³', '21 см³'],
      },
      correctIndex: 3,
      explanation: {
        en: 'A sinking object pushes aside its own volume of water: V = 71 − 50 = 21 mL = 21 cm³.',
        uz: 'Choʻkayotgan jism oʻz hajmicha suvni siqib chiqaradi: V = 71 − 50 = 21 mL = 21 cm³.',
        ru: 'Тонущее тело вытесняет объём воды, равный своему: V = 71 − 50 = 21 мл = 21 см³.',
      },
    },
    {
      id: 'floating',
      question: {
        en: 'A block has a density of 650 kg/m³. What happens when it is placed in water (≈ 1000 kg/m³)?',
        uz: 'Brusokning zichligi 650 kg/m³. U suvga (≈ 1000 kg/m³) qoʻyilsa nima boʻladi?',
        ru: 'Плотность бруска 650 кг/м³. Что произойдёт, если положить его в воду (≈ 1000 кг/м³)?',
      },
      options: {
        en: ['It dissolves', 'It sinks', 'It floats', 'It hangs halfway at any depth'],
        uz: ['Eriydi', 'Choʻkadi', 'Suzadi', 'Istalgan chuqurlikda muallaq turadi'],
        ru: ['Растворится', 'Утонет', 'Будет плавать', 'Зависнет на любой глубине'],
      },
      correctIndex: 2,
      explanation: {
        en: 'An object less dense than the liquid floats; this one floats with 65 % of its volume under water.',
        uz: 'Suyuqlikdan kam zichlikdagi jism suzadi; bu brusok hajmining 65 % i suv ostida boʻlib suzadi.',
        ru: 'Тело, плотность которого меньше плотности жидкости, плавает; этот брусок погружён на 65 % объёма.',
      },
    },
    {
      id: 'temperature',
      question: {
        en: 'What usually happens to the density of a liquid when it is heated?',
        uz: 'Suyuqlik isitilganda odatda uning zichligi qanday oʻzgaradi?',
        ru: 'Что обычно происходит с плотностью жидкости при нагревании?',
      },
      options: {
        en: [
          'It decreases, because the liquid expands',
          'It stays exactly the same',
          'It becomes zero at the boiling point',
          'It increases, because the particles move faster',
        ],
        uz: [
          'Kamayadi, chunki suyuqlik kengayadi',
          'Mutlaqo oʻzgarmaydi',
          'Qaynash nuqtasida nolga teng boʻladi',
          'Ortadi, chunki zarralar tezroq harakatlanadi',
        ],
        ru: [
          'Уменьшается, потому что жидкость расширяется',
          'Совсем не меняется',
          'Становится равной нулю при кипении',
          'Увеличивается, потому что частицы движутся быстрее',
        ],
      },
      correctIndex: 0,
      explanation: {
        en: 'The same mass takes up more volume, so ρ = m/V falls. Water is an exception between 0 and 4 °C, where it is densest at about 4 °C.',
        uz: 'Oʻsha massa kattaroq hajmni egallaydi, shuning uchun ρ = m/V kamayadi. Suv 0–4 °C oraligʻida istisno: u taxminan 4 °C da eng zich.',
        ru: 'Та же масса занимает больший объём, поэтому ρ = m/V уменьшается. Вода — исключение между 0 и 4 °C: её плотность максимальна около 4 °C.',
      },
    },
  ],
  'joules-experiment': [
    {
      id: 'conversion',
      question: {
        en: 'In Joule\'s experiment, what happens to the potential energy mgh of the falling weight?',
        uz: 'Joul tajribasida tushayotgan yukning mgh potensial energiyasi nimaga aylanadi?',
        ru: 'Во что превращается потенциальная энергия mgh падающего груза в опыте Джоуля?',
      },
      options: {
        en: ['It is stored in the string', 'It becomes light', 'It disappears', 'It becomes heat in the water through the paddles'],
        uz: ['Ipda saqlanib qoladi', 'Yorugʻlikka aylanadi', 'Yoʻqolib ketadi', 'Kurakchalar orqali suvda issiqlikka aylanadi'],
        ru: ['Запасается в нити', 'Превращается в свет', 'Исчезает', 'Через лопасти превращается в теплоту воды'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The paddles stir the water; friction turns the work into internal energy, and the temperature rises: mgh → Q = mcΔT.',
        uz: 'Kurakchalar suvni aralashtiradi; ishqalanish ishni ichki energiyaga aylantiradi va harorat koʻtariladi: mgh → Q = mcΔT.',
        ru: 'Лопасти перемешивают воду; трение превращает работу во внутреннюю энергию, и температура растёт: mgh → Q = mcΔT.',
      },
    },
    {
      id: 'specific-heat',
      question: {
        en: 'The specific heat capacity of water is about 4186 J/(kg·K). What does this mean?',
        uz: 'Suvning solishtirma issiqlik sigʻimi taxminan 4186 J/(kg·K). Bu nimani anglatadi?',
        ru: 'Удельная теплоёмкость воды около 4186 Дж/(кг·К). Что это означает?',
      },
      options: {
        en: ['Water loses 4186 J every second', '4186 J warm 1 kg of water by 1 K', '1 J warms 4186 kg of water by 1 K', 'Water boils after 4186 J'],
        uz: ['Suv har soniyada 4186 J yoʻqotadi', '4186 J 1 kg suvni 1 K ga isitadi', '1 J 4186 kg suvni 1 K ga isitadi', 'Suv 4186 J dan keyin qaynaydi'],
        ru: ['Вода теряет 4186 Дж каждую секунду', '4186 Дж нагревают 1 кг воды на 1 К', '1 Дж нагревает 4186 кг воды на 1 К', 'Вода закипает после 4186 Дж'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Specific heat capacity is the energy needed per kilogram per kelvin, so Q = m c ΔT.',
        uz: 'Solishtirma issiqlik sigʻimi — bir kilogrammni bir kelvinga isitish uchun kerak boʻlgan energiya, shuning uchun Q = m c ΔT.',
        ru: 'Удельная теплоёмкость — энергия на килограмм на кельвин, поэтому Q = m c ΔT.',
      },
    },
    {
      id: 'equivalent',
      question: {
        en: 'What value did Joule find for the mechanical equivalent of heat?',
        uz: 'Joul issiqlikning mexanik ekvivalenti uchun qanday qiymat topgan?',
        ru: 'Какое значение механического эквивалента теплоты получил Джоуль?',
      },
      options: {
        en: ['About 4.19 J per calorie', 'About 1 J per calorie', 'About 9.81 J per calorie', 'About 1000 J per calorie'],
        uz: ['Taxminan 4,19 J/kal', 'Taxminan 1 J/kal', 'Taxminan 9,81 J/kal', 'Taxminan 1000 J/kal'],
        ru: ['Около 4,19 Дж/кал', 'Около 1 Дж/кал', 'Около 9,81 Дж/кал', 'Около 1000 Дж/кал'],
      },
      correctIndex: 0,
      explanation: {
        en: 'J = W/Q ≈ 4.186 J/cal: the same amount of work always gives the same amount of heat, so heat is a form of energy.',
        uz: 'J = W/Q ≈ 4,186 J/kal: bir xil ish har doim bir xil issiqlik beradi, demak issiqlik energiyaning bir turi.',
        ru: 'J = W/Q ≈ 4,186 Дж/кал: одна и та же работа всегда даёт одно и то же количество теплоты, значит теплота — форма энергии.',
      },
    },
    {
      id: 'insulation',
      question: {
        en: 'Why is the water container insulated?',
        uz: 'Nima uchun suv idishi issiqlik izolyatsiyalangan?',
        ru: 'Зачем сосуд с водой теплоизолируют?',
      },
      options: {
        en: [
          'To make the weight fall more slowly',
          'To make the paddles turn faster',
          'To stop heat leaking to the room, which would make J come out too big',
          'To keep the water from evaporating instantly',
        ],
        uz: [
          'Yuk sekinroq tushishi uchun',
          'Kurakchalar tezroq aylanishi uchun',
          'Issiqlik xonaga chiqib ketmasligi uchun; aks holda J juda katta chiqadi',
          'Suv bir zumda bugʻlanmasligi uchun',
        ],
        ru: [
          'Чтобы груз падал медленнее',
          'Чтобы лопасти вращались быстрее',
          'Чтобы теплота не уходила в комнату, иначе J получится завышенным',
          'Чтобы вода мгновенно не испарилась',
        ],
      },
      correctIndex: 2,
      explanation: {
        en: 'Heat lost to the surroundings is not counted in Q, so the measured temperature rise is too small and W/Q too large.',
        uz: 'Atrofga yoʻqolgan issiqlik Q ga kirmaydi, shuning uchun oʻlchangan harorat koʻtarilishi kichik, W/Q esa katta chiqadi.',
        ru: 'Теплота, ушедшая в окружающую среду, не входит в Q: измеренный нагрев оказывается меньше, а W/Q — больше.',
      },
    },
    {
      id: 'proportional',
      question: {
        en: 'You double the falling mass and keep the height the same. How does the temperature rise per drop change?',
        uz: 'Tushayotgan massani ikki marta oshirdingiz, balandlik oʻzgarmadi. Har bir tushishdagi harorat koʻtarilishi qanday oʻzgaradi?',
        ru: 'Вы удвоили массу груза, не меняя высоту. Как изменится нагрев за одно падение?',
      },
      options: {
        en: ['It quadruples', 'It halves', 'It stays the same', 'It doubles'],
        uz: ['Toʻrt marta ortadi', 'Ikki marta kamayadi', 'Oʻzgarmaydi', 'Ikki marta ortadi'],
        ru: ['Увеличится в 4 раза', 'Уменьшится вдвое', 'Не изменится', 'Удвоится'],
      },
      correctIndex: 3,
      explanation: {
        en: 'ΔT = mgh / (m_w c + C_can), so the rise is proportional to both the mass and the height.',
        uz: 'ΔT = mgh / (m_w c + C_idish), demak koʻtarilish massaga ham, balandlikka ham proporsional.',
        ru: 'ΔT = mgh / (m_в c + C_сосуда), поэтому нагрев пропорционален и массе, и высоте.',
      },
    },
  ],
  'ballistic-pendulum': [
    {
      id: 'momentum',
      question: {
        en: 'Which quantity is conserved during the impact of the ball with the pendulum block?',
        uz: 'Shar mayatnik bloki bilan toʻqnashganda qaysi kattalik saqlanadi?',
        ru: 'Какая величина сохраняется при ударе шара о блок маятника?',
      },
      options: {
        en: ['Kinetic energy', 'Momentum', 'Height', 'Neither'],
        uz: ['Kinetik energiya', 'Impuls', 'Balandlik', 'Hech biri'],
        ru: ['Кинетическая энергия', 'Импульс', 'Высота', 'Ничего'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The impact is so short that no external impulse acts: m v = (M + m) V. Kinetic energy is not conserved.',
        uz: 'Toʻqnashuv shunchalik qisqaki, tashqi impuls taʼsir qilmaydi: m v = (M + m) V. Kinetik energiya saqlanmaydi.',
        ru: 'Удар настолько короткий, что внешний импульс не действует: m v = (M + m) V. Кинетическая энергия не сохраняется.',
      },
    },
    {
      id: 'energy',
      question: {
        en: 'After the impact the pendulum swings up. Which law gives the height h it reaches?',
        uz: 'Toʻqnashuvdan keyin mayatnik yuqoriga koʻtariladi. U yetadigan h balandlikni qaysi qonun beradi?',
        ru: 'После удара маятник поднимается. Какой закон определяет высоту h подъёма?',
      },
      options: {
        en: ['Ohm\'s law', 'Conservation of momentum', 'Conservation of mechanical energy: ½(M+m)V² = (M+m)gh', 'Hooke\'s law'],
        uz: ['Om qonuni', 'Impulsning saqlanishi', 'Mexanik energiyaning saqlanishi: ½(M+m)V² = (M+m)gh', 'Guk qonuni'],
        ru: ['Закон Ома', 'Сохранение импульса', 'Сохранение механической энергии: ½(M+m)V² = (M+m)gh', 'Закон Гука'],
      },
      correctIndex: 2,
      explanation: {
        en: 'During the swing only gravity does work, so the kinetic energy just after the impact becomes potential energy: h = V²/2g.',
        uz: 'Tebranishda faqat ogʻirlik kuchi ish bajaradi, shuning uchun toʻqnashuvdan keyingi kinetik energiya potensial energiyaga aylanadi: h = V²/2g.',
        ru: 'Во время подъёма работу совершает только сила тяжести, и кинетическая энергия после удара переходит в потенциальную: h = V²/2g.',
      },
    },
    {
      id: 'formula',
      question: {
        en: 'Which formula gives the launch speed v from the rise h?',
        uz: 'Koʻtarilish h boʻyicha uchish tezligi v qaysi formula bilan topiladi?',
        ru: 'Какая формула даёт начальную скорость v по высоте подъёма h?',
      },
      options: {
        en: ['v = (M + m)/m · √(2gh)', 'v = m/(M + m) · √(2gh)', 'v = 2gh', 'v = √(2gh)'],
        uz: ['v = (M + m)/m · √(2gh)', 'v = m/(M + m) · √(2gh)', 'v = 2gh', 'v = √(2gh)'],
        ru: ['v = (M + m)/m · √(2gh)', 'v = m/(M + m) · √(2gh)', 'v = 2gh', 'v = √(2gh)'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Energy gives V = √(2gh) after the impact; momentum then gives v = (M + m)V/m.',
        uz: 'Energiyadan toʻqnashuvdan keyingi V = √(2gh); impulsdan esa v = (M + m)V/m.',
        ru: 'Из энергии V = √(2gh) после удара; из импульса v = (M + m)V/m.',
      },
    },
    {
      id: 'inelastic',
      question: {
        en: 'What kind of collision happens when the ball sticks in the block?',
        uz: 'Shar blokka yopishib qolganda qanday toʻqnashuv sodir boʻladi?',
        ru: 'Какой это удар, если шар застревает в блоке?',
      },
      options: {
        en: ['Perfectly elastic', 'Perfectly inelastic', 'Super-elastic', 'It is not a collision'],
        uz: ['Mutlaq elastik', 'Mutlaq noelastik', 'Superelastik', 'Bu toʻqnashuv emas'],
        ru: ['Абсолютно упругий', 'Абсолютно неупругий', 'Сверхупругий', 'Это не удар'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The bodies move off together; momentum is conserved but most of the kinetic energy (all but m/(M + m)) becomes heat and deformation.',
        uz: 'Jismlar birga harakatlanadi; impuls saqlanadi, lekin kinetik energiyaning katta qismi (m/(M + m) dan tashqari) issiqlik va deformatsiyaga aylanadi.',
        ru: 'Тела движутся вместе; импульс сохраняется, но большая часть кинетической энергии (всё, кроме доли m/(M + m)) переходит в теплоту и деформацию.',
      },
    },
    {
      id: 'ranges',
      question: {
        en: 'The gun is switched from short to long range. What happens to the swing angle?',
        uz: 'Toʻpponcha qisqa masofadan uzoq masofaga oʻtkazildi. Tebranish burchagi qanday oʻzgaradi?',
        ru: 'Пушку переключили с ближней дальности на дальнюю. Что станет с углом отклонения?',
      },
      options: {
        en: ['It stays the same', 'The pendulum does not move', 'It gets smaller', 'It gets larger, because the ball is faster'],
        uz: ['Oʻzgarmaydi', 'Mayatnik qimirlamaydi', 'Kichiklashadi', 'Kattalashadi, chunki shar tezroq'],
        ru: ['Не изменится', 'Маятник не сдвинется', 'Уменьшится', 'Увеличится, потому что шар быстрее'],
      },
      correctIndex: 3,
      explanation: {
        en: 'A faster ball gives the block more momentum, so it rises higher; h grows with v², so the angle increases from short to medium to long.',
        uz: 'Tezroq shar blokka koʻproq impuls beradi va u balandroq koʻtariladi; h v² ga proporsional, shuning uchun burchak qisqadan oʻrta va uzoqqa qarab ortadi.',
        ru: 'Более быстрый шар передаёт блоку больший импульс, и он поднимается выше; h растёт как v², поэтому угол растёт от ближней к средней и дальней дальности.',
      },
    },
  ],
  'rc-circuit-charging': [
    {
      id: 'tau',
      question: {
        en: 'A 10 kΩ resistor charges a 470 µF capacitor. What is the time constant τ?',
        uz: '10 kΩ rezistor 470 µF kondensatorni zaryadlaydi. Vaqt doimiysi τ qancha?',
        ru: 'Резистор 10 кОм заряжает конденсатор 470 мкФ. Какова постоянная времени τ?',
      },
      options: {
        en: ['4.7 s', '47 s', '4700 s', '0.47 s'],
        uz: ['4,7 s', '47 s', '4700 s', '0,47 s'],
        ru: ['4,7 с', '47 с', '4700 с', '0,47 с'],
      },
      correctIndex: 0,
      explanation: {
        en: 'τ = RC = 10 000 Ω × 470 × 10⁻⁶ F = 4.7 s.',
        uz: 'τ = RC = 10 000 Ω × 470 × 10⁻⁶ F = 4,7 s.',
        ru: 'τ = RC = 10 000 Ом × 470 × 10⁻⁶ Ф = 4,7 с.',
      },
    },
    {
      id: 'asymptote',
      question: {
        en: 'What value does the capacitor voltage approach while charging?',
        uz: 'Zaryadlanayotganda kondensator kuchlanishi qaysi qiymatga yaqinlashadi?',
        ru: 'К какому значению стремится напряжение на конденсаторе при зарядке?',
      },
      options: {
        en: ['It keeps growing without limit', 'Zero', 'The battery voltage V₀', 'Twice the battery voltage'],
        uz: ['Cheksiz oʻsib boradi', 'Nolga', 'Batareya kuchlanishi V₀ ga', 'Batareya kuchlanishining ikki baravariga'],
        ru: ['Растёт неограниченно', 'К нулю', 'К напряжению батареи V₀', 'К удвоенному напряжению батареи'],
      },
      correctIndex: 2,
      explanation: {
        en: 'V_C = V₀(1 − e^(−t/RC)) approaches V₀: 63 % after τ, 99.3 % after 5τ.',
        uz: 'V_C = V₀(1 − e^(−t/RC)) V₀ ga yaqinlashadi: τ dan keyin 63 %, 5τ dan keyin 99,3 %.',
        ru: 'V_C = V₀(1 − e^(−t/RC)) стремится к V₀: 63 % через τ, 99,3 % через 5τ.',
      },
    },
    {
      id: 'current',
      question: {
        en: 'How does the current change while the capacitor charges?',
        uz: 'Kondensator zaryadlanayotganda tok qanday oʻzgaradi?',
        ru: 'Как меняется ток при зарядке конденсатора?',
      },
      options: {
        en: ['It starts at zero and grows to V₀/R', 'It oscillates', 'It stays constant', 'It starts at V₀/R and decays exponentially to zero'],
        uz: ['Noldan boshlanib V₀/R gacha oʻsadi', 'Tebranadi', 'Oʻzgarmaydi', 'V₀/R dan boshlanib eksponensial ravishda nolgacha kamayadi'],
        ru: ['Начинается с нуля и растёт до V₀/R', 'Колеблется', 'Остаётся постоянным', 'Начинается с V₀/R и экспоненциально спадает до нуля'],
      },
      correctIndex: 3,
      explanation: {
        en: 'I = (V₀/R)e^(−t/RC): as the capacitor voltage grows, less voltage is left across the resistor.',
        uz: 'I = (V₀/R)e^(−t/RC): kondensator kuchlanishi oʻsgan sari rezistorga kamroq kuchlanish qoladi.',
        ru: 'I = (V₀/R)e^(−t/RC): по мере роста напряжения на конденсаторе на резисторе остаётся всё меньше.',
      },
    },
    {
      id: 'farad',
      question: {
        en: 'What is the SI unit of capacitance?',
        uz: 'Sigʻimning SI birligi qaysi?',
        ru: 'Какова единица электроёмкости в СИ?',
      },
      options: {
        en: ['The henry (H)', 'The farad (F)', 'The ohm (Ω)', 'The coulomb (C)'],
        uz: ['Genri (H)', 'Farad (F)', 'Om (Ω)', 'Kulon (C)'],
        ru: ['Генри (Гн)', 'Фарад (Ф)', 'Ом (Ом)', 'Кулон (Кл)'],
      },
      correctIndex: 1,
      explanation: {
        en: '1 farad = 1 coulomb per volt (C = Q/V). Practical capacitors are usually in µF or nF.',
        uz: '1 farad = 1 kulon/volt (C = Q/V). Amaliy kondensatorlar odatda µF yoki nF da boʻladi.',
        ru: '1 фарад = 1 кулон на вольт (C = Q/V). Реальные конденсаторы обычно измеряют в мкФ или нФ.',
      },
    },
    {
      id: 'rc-effect',
      question: {
        en: 'You double the resistance R. What happens to the charging?',
        uz: 'Qarshilik R ni ikki marta oshirdingiz. Zaryadlanish qanday oʻzgaradi?',
        ru: 'Вы удвоили сопротивление R. Что произойдёт с зарядкой?',
      },
      options: {
        en: ['Nothing changes', 'It is twice as fast', 'It takes twice as long, but reaches the same final voltage', 'It reaches only half the voltage'],
        uz: [
          'Hech narsa oʻzgarmaydi',
          'Ikki marta tezlashadi',
          'Ikki marta uzoqroq davom etadi, lekin oxirgi kuchlanish oʻsha',
          'Faqat yarim kuchlanishga yetadi',
        ],
        ru: ['Ничего не изменится', 'Будет вдвое быстрее', 'Займёт вдвое больше времени, но конечное напряжение то же', 'Дойдёт только до половины напряжения'],
      },
      correctIndex: 2,
      explanation: {
        en: 'τ = RC doubles, so every stage of charging takes twice as long; the final voltage is still V₀.',
        uz: 'τ = RC ikki baravar ortadi, shuning uchun zaryadlanishning har bir bosqichi ikki marta uzoq davom etadi; oxirgi kuchlanish baribir V₀.',
        ru: 'τ = RC удваивается, и каждый этап зарядки длится вдвое дольше; конечное напряжение по-прежнему V₀.',
      },
    },
  ],
  'rc-circuit-discharging': [
    {
      id: 'decay',
      question: {
        en: 'How does the voltage of a capacitor discharging through a resistor change with time?',
        uz: 'Rezistor orqali razryadlanayotgan kondensator kuchlanishi vaqt oʻtishi bilan qanday oʻzgaradi?',
        ru: 'Как меняется со временем напряжение конденсатора, разряжающегося через резистор?',
      },
      options: {
        en: ['It stays at V₀', 'It drops to zero instantly', 'It falls linearly to zero', 'It decays exponentially: V = V₀e^(−t/RC)'],
        uz: ['V₀ da qoladi', 'Bir zumda nolga tushadi', 'Chiziqli ravishda nolgacha tushadi', 'Eksponensial kamayadi: V = V₀e^(−t/RC)'],
        ru: ['Остаётся равным V₀', 'Мгновенно падает до нуля', 'Линейно падает до нуля', 'Экспоненциально убывает: V = V₀e^(−t/RC)'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The current I = V/R removes charge, which lowers V and the current: each τ the voltage falls by the same factor 1/e.',
        uz: 'I = V/R tok zaryadni olib ketadi, bu V ni va tokni kamaytiradi: har τ da kuchlanish bir xil 1/e marta kamayadi.',
        ru: 'Ток I = V/R уносит заряд, снижая V и сам ток: за каждый τ напряжение уменьшается в одно и то же число раз — в e.',
      },
    },
    {
      id: 'tau-meaning',
      question: {
        en: 'What does the time constant τ = RC tell you during discharge?',
        uz: 'Razryadlanishda τ = RC vaqt doimiysi nimani bildiradi?',
        ru: 'Что означает постоянная времени τ = RC при разрядке?',
      },
      options: {
        en: [
          'The time for the voltage to fall to about 37 % of its start',
          'The time for the voltage to halve exactly',
          'The time the switch stays closed',
          'The time to discharge completely',
        ],
        uz: [
          'Kuchlanish boshlangʻich qiymatining taxminan 37 % igacha tushish vaqti',
          'Kuchlanish aniq yarmiga tushish vaqti',
          'Kalit yopiq turadigan vaqt',
          'Toʻliq razryadlanish vaqti',
        ],
        ru: [
          'Время, за которое напряжение падает примерно до 37 % от начального',
          'Время, за которое напряжение уменьшается ровно вдвое',
          'Время, пока ключ замкнут',
          'Время полной разрядки',
        ],
      },
      correctIndex: 0,
      explanation: {
        en: 'After one τ, V = V₀/e ≈ 0.37 V₀. The half-time is shorter: τ ln 2 ≈ 0.69 τ.',
        uz: 'Bir τ dan keyin V = V₀/e ≈ 0,37 V₀. Yarim kamayish vaqti qisqaroq: τ ln 2 ≈ 0,69 τ.',
        ru: 'Через τ напряжение V = V₀/e ≈ 0,37 V₀. Время уменьшения вдвое короче: τ ln 2 ≈ 0,69 τ.',
      },
    },
    {
      id: 'energy',
      question: {
        en: 'How much energy is stored in a 1000 µF capacitor charged to 12 V?',
        uz: '12 V gacha zaryadlangan 1000 µF kondensatorda qancha energiya saqlanadi?',
        ru: 'Какая энергия запасена в конденсаторе 1000 мкФ, заряженном до 12 В?',
      },
      options: {
        en: ['0.012 J', '0.072 J', '0.144 J', '12 J'],
        uz: ['0,012 J', '0,072 J', '0,144 J', '12 J'],
        ru: ['0,012 Дж', '0,072 Дж', '0,144 Дж', '12 Дж'],
      },
      correctIndex: 1,
      explanation: {
        en: 'E = ½CV² = ½ × 0.001 F × (12 V)² = 0.072 J. During discharge all of it becomes heat in the resistor.',
        uz: 'E = ½CV² = ½ × 0,001 F × (12 V)² = 0,072 J. Razryadlanishda hammasi rezistorda issiqlikka aylanadi.',
        ru: 'E = ½CV² = ½ × 0,001 Ф × (12 В)² = 0,072 Дж. При разрядке вся она превращается в теплоту в резисторе.',
      },
    },
    {
      id: 'direction',
      question: {
        en: 'How does the direction of the discharge current compare with the charging current?',
        uz: 'Razryadlanish toki yoʻnalishi zaryadlanish toki yoʻnalishiga nisbatan qanday?',
        ru: 'Как направлен ток разрядки по сравнению с током зарядки?',
      },
      options: {
        en: ['It changes direction every τ', 'The same direction', 'The opposite direction', 'There is no current during discharge'],
        uz: ['Har τ da yoʻnalishini oʻzgartiradi', 'Bir xil yoʻnalishda', 'Teskari yoʻnalishda', 'Razryadlanishda tok yoʻq'],
        ru: ['Меняет направление каждые τ', 'В ту же сторону', 'В противоположную сторону', 'При разрядке тока нет'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Charge flows back out of the positive plate, so the current is reversed: I = −(V₀/R)e^(−t/RC).',
        uz: 'Zaryad musbat qoplamadan qaytib chiqadi, shuning uchun tok teskari: I = −(V₀/R)e^(−t/RC).',
        ru: 'Заряд стекает обратно с положительной обкладки, поэтому ток обратный: I = −(V₀/R)e^(−t/RC).',
      },
    },
    {
      id: 'five-tau',
      question: {
        en: 'A capacitor starts at 10 V. Roughly what voltage is left after 5τ?',
        uz: 'Kondensator 10 V dan boshladi. 5τ dan keyin taxminan qancha kuchlanish qoladi?',
        ru: 'Начальное напряжение конденсатора 10 В. Какое напряжение останется примерно через 5τ?',
      },
      options: {
        en: ['Exactly 0 V', '5 V', '3.7 V', 'About 0.07 V (practically empty)'],
        uz: ['Aniq 0 V', '5 V', '3,7 V', 'Taxminan 0,07 V (amalda boʻsh)'],
        ru: ['Ровно 0 В', '5 В', '3,7 В', 'Около 0,07 В (практически разряжен)'],
      },
      correctIndex: 3,
      explanation: {
        en: 'e⁻⁵ ≈ 0.0067, so 0.67 % of 10 V ≈ 0.07 V. It never reaches exactly zero, but after 5τ it is practically empty.',
        uz: 'e⁻⁵ ≈ 0,0067, demak 10 V ning 0,67 % i ≈ 0,07 V. U hech qachon aniq nolga yetmaydi, lekin 5τ dan keyin amalda boʻsh.',
        ru: 'e⁻⁵ ≈ 0,0067, то есть 0,67 % от 10 В ≈ 0,07 В. Ровно нуля оно не достигает, но через 5τ конденсатор практически разряжен.',
      },
    },
  ],
  'archimedes-principle': [
    {
      id: 'formula',
      question: {
        en: 'Which formula gives the buoyant force on an object in a fluid?',
        uz: 'Suyuqlikdagi jismga taʼsir qiluvchi itarib chiqaruvchi kuch qaysi formula bilan topiladi?',
        ru: 'Какая формула даёт выталкивающую силу, действующую на тело в жидкости?',
      },
      options: {
        en: ['F_b = ρ_object · g · V', 'F_b = ρ_fluid · g · V_displaced', 'F_b = m · a', 'F_b = ρ_fluid / V'],
        uz: ['F_b = ρ_jism · g · V', 'F_b = ρ_suyuqlik · g · V_siqib chiqarilgan', 'F_b = m · a', 'F_b = ρ_suyuqlik / V'],
        ru: ['F_b = ρ_тела · g · V', 'F_b = ρ_жидкости · g · V_вытесненный', 'F_b = m · a', 'F_b = ρ_жидкости / V'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The buoyant force equals the weight of the fluid displaced, so it depends on the fluid’s density and the volume under the surface.',
        uz: 'Itarib chiqaruvchi kuch siqib chiqarilgan suyuqlik ogʻirligiga teng, shuning uchun suyuqlik zichligi va sirt ostidagi hajmga bogʻliq.',
        ru: 'Выталкивающая сила равна весу вытесненной жидкости, поэтому зависит от плотности жидкости и объёма погружённой части.',
      },
    },
    {
      id: 'weight-loss',
      question: {
        en: 'A spring balance reads 1.32 N in air and 0.83 N with the object in water. What is the buoyant force?',
        uz: 'Prujinali tarozi havoda 1,32 N, jism suvga botirilganda 0,83 N koʻrsatadi. Itarib chiqaruvchi kuch qancha?',
        ru: 'Динамометр показывает 1,32 Н в воздухе и 0,83 Н, когда тело в воде. Какова выталкивающая сила?',
      },
      options: {
        en: ['0.49 N', '0.83 N', '1.32 N', '2.15 N'],
        uz: ['0,49 N', '0,83 N', '1,32 N', '2,15 N'],
        ru: ['0,49 Н', '0,83 Н', '1,32 Н', '2,15 Н'],
      },
      correctIndex: 0,
      explanation: {
        en: 'The apparent loss of weight equals the buoyant force: 1.32 − 0.83 = 0.49 N.',
        uz: 'Ogʻirlikning koʻrinma kamayishi itarib chiqaruvchi kuchga teng: 1,32 − 0,83 = 0,49 N.',
        ru: 'Кажущаяся потеря веса равна выталкивающей силе: 1,32 − 0,83 = 0,49 Н.',
      },
    },
    {
      id: 'floating',
      question: {
        en: 'When does an object float in a liquid?',
        uz: 'Jism suyuqlikda qachon suzadi?',
        ru: 'Когда тело плавает в жидкости?',
      },
      options: {
        en: ['Only in water', 'When it is heavier than 1 N', 'When it is less dense than the liquid', 'When it is fully immersed'],
        uz: ['Faqat suvda', '1 N dan ogʻir boʻlganda', 'Suyuqlikdan kam zich boʻlganda', 'Toʻliq botirilganda'],
        ru: ['Только в воде', 'Когда тяжелее 1 Н', 'Когда его плотность меньше плотности жидкости', 'Когда полностью погружено'],
      },
      correctIndex: 2,
      explanation: {
        en: 'A less dense object reaches F_b = W before it is fully under, so it floats with the fraction ρ_object/ρ_liquid submerged.',
        uz: 'Kam zich jism toʻliq botmasdan F_b = W boʻladi, shuning uchun u hajmining ρ_jism/ρ_suyuqlik qismi botgan holda suzadi.',
        ru: 'Менее плотное тело достигает F_b = W, не погрузившись полностью, и плавает, погружённое на долю ρ_тела/ρ_жидкости.',
      },
    },
    {
      id: 'specific-gravity',
      question: {
        en: 'What is the specific gravity (relative density) of an object?',
        uz: 'Jismning nisbiy zichligi (solishtirma ogʻirligi) nima?',
        ru: 'Что такое относительная плотность (удельный вес) тела?',
      },
      options: {
        en: ['Its weight in newtons', 'The depth at which it floats', 'Its mass divided by its volume', 'Its density divided by the density of water'],
        uz: ['Nyutondagi ogʻirligi', 'Suzadigan chuqurligi', 'Massasining hajmiga nisbati', 'Zichligining suv zichligiga nisbati'],
        ru: ['Вес в ньютонах', 'Глубина, на которой оно плавает', 'Масса, делённая на объём', 'Плотность тела, делённая на плотность воды'],
      },
      correctIndex: 3,
      explanation: {
        en: 'SG = ρ_object/ρ_water. It can be measured as W / (W − W_in water) without measuring the volume.',
        uz: 'SG = ρ_jism/ρ_suv. Uni hajmni oʻlchamasdan W / (W − W_suvda) sifatida topish mumkin.',
        ru: 'SG = ρ_тела/ρ_воды. Её можно найти как W / (W − W_в воде), не измеряя объём.',
      },
    },
    {
      id: 'displaced',
      question: {
        en: 'A 50 cm³ metal cylinder is fully immersed in an overflow can of water. How much water runs out?',
        uz: '50 cm³ li metall silindr suvli quyilish idishiga toʻliq botirildi. Qancha suv toshib chiqadi?',
        ru: 'Металлический цилиндр объёмом 50 см³ полностью погрузили в отливной сосуд с водой. Сколько воды выльется?',
      },
      options: {
        en: ['50 cm³', '25 cm³', 'None', 'It depends on the metal'],
        uz: ['50 cm³', '25 cm³', 'Umuman chiqmaydi', 'Metallga bogʻliq'],
        ru: ['50 см³', '25 см³', 'Нисколько', 'Зависит от металла'],
      },
      correctIndex: 0,
      explanation: {
        en: 'A fully immersed object displaces its own volume of liquid, whatever it is made of: 50 cm³, which weighs about 0.49 N.',
        uz: 'Toʻliq botirilgan jism nimadan yasalganidan qatʼi nazar oʻz hajmicha suyuqlikni siqib chiqaradi: 50 cm³, uning ogʻirligi taxminan 0,49 N.',
        ru: 'Полностью погружённое тело вытесняет объём жидкости, равный своему, из чего бы оно ни было: 50 см³, это около 0,49 Н.',
      },
    },
  ],
  'exo-endo': [
    {
      id: 'exo-sign',
      question: {
        en: 'Dissolving a solid makes the water warmer. Which statement is true?',
        uz: 'Qattiq modda eriganda suv isidi. Qaysi fikr toʻgʻri?',
        ru: 'При растворении вещества вода нагрелась. Какое утверждение верно?',
      },
      options: {
        en: ['The process is endothermic and ΔH > 0', 'The process is exothermic and ΔH < 0', 'The process is exothermic and ΔH > 0', 'No energy change took place'],
        uz: ['Jarayon endotermik va ΔH > 0', 'Jarayon ekzotermik va ΔH < 0', 'Jarayon ekzotermik va ΔH > 0', 'Energiya oʻzgarishi boʻlmadi'],
        ru: ['Процесс эндотермический, ΔH > 0', 'Процесс экзотермический, ΔH < 0', 'Процесс экзотермический, ΔH > 0', 'Энергия не менялась'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Heat was released into the water, so the system lost energy: the process is exothermic and ΔH is negative.',
        uz: 'Issiqlik suvga ajraldi, demak sistema energiya yoʻqotdi: jarayon ekzotermik va ΔH manfiy.',
        ru: 'Теплота выделилась в воду, значит система потеряла энергию: процесс экзотермический и ΔH отрицательна.',
      },
    },
    {
      id: 'cold-pack',
      question: {
        en: 'Which substance from the lab is used in instant cold packs?',
        uz: 'Laboratoriyadagi qaysi modda tez sovutuvchi paketlarda ishlatiladi?',
        ru: 'Какое вещество из лаборатории используют в мгновенных охлаждающих пакетах?',
      },
      options: {
        en: ['Ammonium nitrate', 'Sodium chloride', 'Sodium hydroxide', 'Calcium chloride'],
        uz: ['Ammoniy nitrat', 'Natriy xlorid', 'Natriy gidroksid', 'Kalsiy xlorid'],
        ru: ['Нитрат аммония', 'Хлорид натрия', 'Гидроксид натрия', 'Хлорид кальция'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Ammonium nitrate dissolves endothermically (ΔH ≈ +25.7 kJ/mol), taking heat from its surroundings and cooling them.',
        uz: 'Ammoniy nitrat endotermik eriydi (ΔH ≈ +25,7 kJ/mol), atrofdan issiqlik olib, uni sovutadi.',
        ru: 'Нитрат аммония растворяется эндотермически (ΔH ≈ +25,7 кДж/моль), отбирая тепло у окружающей среды и охлаждая её.',
      },
    },
    {
      id: 'heat-calc',
      question: {
        en: '100 g of water warms up by 5 K. How much heat did it absorb? (c = 4.18 J/(g·K))',
        uz: '100 g suv 5 K ga isidi. U qancha issiqlik yutdi? (c = 4,18 J/(g·K))',
        ru: '100 г воды нагрелись на 5 K. Сколько теплоты они поглотили? (c = 4,18 Дж/(г·К))',
      },
      options: {
        en: ['20.9 J', '418 J', '2090 J', '20 900 J'],
        uz: ['20,9 J', '418 J', '2090 J', '20 900 J'],
        ru: ['20,9 Дж', '418 Дж', '2090 Дж', '20 900 Дж'],
      },
      correctIndex: 2,
      explanation: {
        en: 'q = mcΔT = 100 × 4.18 × 5 = 2090 J ≈ 2.1 kJ.',
        uz: 'q = mcΔT = 100 × 4,18 × 5 = 2090 J ≈ 2,1 kJ.',
        ru: 'q = mcΔT = 100 × 4,18 × 5 = 2090 Дж ≈ 2,1 кДж.',
      },
    },
    {
      id: 'more-water',
      question: {
        en: 'You dissolve the same mass of NaOH in twice as much water. What happens to ΔT?',
        uz: 'NaOH ning xuddi shu massasini ikki marta koʻp suvda eritdingiz. ΔT nima boʻladi?',
        ru: 'Вы растворили ту же массу NaOH в вдвое большем количестве воды. Что произойдёт с ΔT?',
      },
      options: {
        en: ['It changes sign', 'It doubles', 'It stays the same', 'It halves'],
        uz: ['Ishorasi oʻzgaradi', 'Ikki marta ortadi', 'Oʻzgarmaydi', 'Ikki marta kamayadi'],
        ru: ['Сменит знак', 'Удвоится', 'Не изменится', 'Уменьшится вдвое'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The same amount of heat is shared by twice the mass of water, so ΔT = q/(mc) is halved.',
        uz: 'Xuddi shu issiqlik ikki marta koʻp suvga taqsimlanadi, shuning uchun ΔT = q/(mc) ikki marta kamayadi.',
        ru: 'То же количество теплоты делится на вдвое большую массу воды, поэтому ΔT = q/(mc) уменьшается вдвое.',
      },
    },
    {
      id: 'heat-loss',
      question: {
        en: 'Why is the ΔH measured with a coffee-cup calorimeter usually a little smaller than the data-book value?',
        uz: 'Nima uchun qahva stakani kalorimetrida oʻlchangan ΔH odatda maʼlumotnomadagidan biroz kichik chiqadi?',
        ru: 'Почему ΔH, измеренная в калориметре из стаканчика, обычно немного меньше справочной?',
      },
      options: {
        en: ['Water has no heat capacity', 'The thermometer adds heat', 'Some heat is exchanged with the surroundings', 'The salt is too pure'],
        uz: ['Suvning issiqlik sigʻimi yoʻq', 'Termometr issiqlik qoʻshadi', 'Issiqlikning bir qismi atrof bilan almashinadi', 'Tuz juda toza'],
        ru: ['У воды нет теплоёмкости', 'Термометр добавляет тепло', 'Часть теплоты уходит в окружающую среду (или приходит из неё)', 'Соль слишком чистая'],
      },
      correctIndex: 2,
      explanation: {
        en: 'The cup is not perfectly insulated, so part of the heat leaks out (or in) and the measured temperature change is a bit smaller than the ideal one.',
        uz: 'Stakan toʻliq izolyatsiyalanmagan, shuning uchun issiqlikning bir qismi chiqib (yoki kirib) ketadi va oʻlchangan harorat oʻzgarishi idealdan biroz kichik boʻladi.',
        ru: 'Стаканчик не идеально теплоизолирован, поэтому часть теплоты уходит (или поступает), и измеренное изменение температуры немного меньше идеального.',
      },
    },
  ],
  solubility: [
    {
      id: 'saturated',
      question: {
        en: 'What is a saturated solution?',
        uz: 'Toʻyingan eritma nima?',
        ru: 'Что такое насыщенный раствор?',
      },
      options: {
        en: ['A solution with any undissolved solid', 'A solution that holds the most solute it can at that temperature', 'A very concentrated acid', 'A solution that contains no water'],
        uz: ['Erimagan qattiq moddasi bor har qanday eritma', 'Shu haroratda iloji boricha koʻp erigan modda tutgan eritma', 'Juda konsentrlangan kislota', 'Suvsiz eritma'],
        ru: ['Любой раствор с осадком', 'Раствор, содержащий максимум растворённого вещества при данной температуре', 'Очень концентрированная кислота', 'Раствор без воды'],
      },
      correctIndex: 1,
      explanation: {
        en: 'A saturated solution holds the maximum amount of solute at that temperature; any extra stays undissolved.',
        uz: 'Toʻyingan eritma shu haroratda eng koʻp erigan modda tutadi; ortiqchasi erimay qoladi.',
        ru: 'Насыщенный раствор содержит максимально возможное при данной температуре количество вещества; избыток не растворяется.',
      },
    },
    {
      id: 'kno3-temp',
      question: {
        en: 'How does the solubility of potassium nitrate change when the water is heated from 20 °C to 60 °C?',
        uz: 'Suv 20 °C dan 60 °C gacha qizdirilganda kaliy nitratning eruvchanligi qanday oʻzgaradi?',
        ru: 'Как меняется растворимость нитрата калия при нагревании воды с 20 °C до 60 °C?',
      },
      options: {
        en: ['It hardly changes', 'It increases about threefold', 'It becomes zero', 'It decreases'],
        uz: ['Deyarli oʻzgarmaydi', 'Taxminan uch marta ortadi', 'Nolga teng boʻladi', 'Kamayadi'],
        ru: ['Почти не меняется', 'Увеличивается примерно втрое', 'Становится равной нулю', 'Уменьшается'],
      },
      correctIndex: 1,
      explanation: {
        en: 'From the curve, about 32 g per 100 g of water dissolve at 20 °C and about 110 g at 60 °C.',
        uz: 'Egri chiziqqa koʻra 20 °C da 100 g suvda taxminan 32 g, 60 °C da esa taxminan 110 g eriydi.',
        ru: 'По кривой при 20 °C в 100 г воды растворяется около 32 г, а при 60 °C — около 110 г.',
      },
    },
    {
      id: 'nacl',
      question: {
        en: 'Which salt’s solubility changes least with temperature?',
        uz: 'Qaysi tuzning eruvchanligi harorat bilan eng kam oʻzgaradi?',
        ru: 'Растворимость какой соли меньше всего зависит от температуры?',
      },
      options: {
        en: ['Sodium chloride', 'Potassium nitrate', 'Copper(II) sulfate', 'Ammonium chloride'],
        uz: ['Natriy xlorid', 'Kaliy nitrat', 'Mis(II) sulfat', 'Ammoniy xlorid'],
        ru: ['Хлорид натрия', 'Нитрат калия', 'Сульфат меди(II)', 'Хлорид аммония'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Sodium chloride dissolves 35.7 g per 100 g at 0 °C and only 39.8 g at 100 °C, an almost flat curve.',
        uz: 'Natriy xlorid 0 °C da 100 g suvda 35,7 g, 100 °C da esa atigi 39,8 g eriydi — deyarli tekis egri chiziq.',
        ru: 'Хлорид натрия растворяется в количестве 35,7 г на 100 г воды при 0 °C и всего 39,8 г при 100 °C — кривая почти горизонтальна.',
      },
    },
    {
      id: 'crystallise',
      question: {
        en: 'A saturated KNO₃ solution in 100 g of water is cooled from 60 °C (110 g) to 20 °C (32 g). How much salt crystallises?',
        uz: '100 g suvdagi toʻyingan KNO₃ eritmasi 60 °C (110 g) dan 20 °C (32 g) gacha sovitildi. Qancha tuz kristallanadi?',
        ru: 'Насыщенный раствор KNO₃ в 100 г воды охладили с 60 °C (110 г) до 20 °C (32 г). Сколько соли выкристаллизуется?',
      },
      options: {
        en: ['32 g', '78 g', '110 g', '142 g'],
        uz: ['32 g', '78 g', '110 g', '142 g'],
        ru: ['32 г', '78 г', '110 г', '142 г'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The water can only hold 32 g at 20 °C, so 110 − 32 = 78 g comes out as crystals.',
        uz: '20 °C da suv faqat 32 g tuta oladi, shuning uchun 110 − 32 = 78 g kristall boʻlib chiqadi.',
        ru: 'При 20 °C вода удерживает только 32 г, поэтому 110 − 32 = 78 г выпадает в виде кристаллов.',
      },
    },
    {
      id: 'mass-percent',
      question: {
        en: '25 g of salt is dissolved in 100 g of water. What is the mass percentage of salt in the solution?',
        uz: '25 g tuz 100 g suvda eritildi. Eritmadagi tuzning massa ulushi qancha?',
        ru: '25 г соли растворили в 100 г воды. Какова массовая доля соли в растворе?',
      },
      options: {
        en: ['20 %', '25 %', '33 %', '75 %'],
        uz: ['20 %', '25 %', '33 %', '75 %'],
        ru: ['20 %', '25 %', '33 %', '75 %'],
      },
      correctIndex: 0,
      explanation: {
        en: 'w = 25 / (25 + 100) × 100 % = 20 %. The mass of the solution includes the salt as well as the water.',
        uz: 'w = 25 / (25 + 100) × 100 % = 20 %. Eritma massasiga suv bilan birga tuz ham kiradi.',
        ru: 'w = 25 / (25 + 100) × 100 % = 20 %. Масса раствора включает и воду, и соль.',
      },
    },
  ],
  'ph-indicators': [
    {
      id: 'ph-scale',
      question: {
        en: 'A solution has pH 3. What is it?',
        uz: 'Eritmaning pH i 3 ga teng. U qanday eritma?',
        ru: 'pH раствора равен 3. Какой это раствор?',
      },
      options: {
        en: ['Slightly basic', 'Strongly basic', 'Neutral', 'Acidic'],
        uz: ['Kuchsiz ishqoriy', 'Kuchli ishqoriy', 'Neytral', 'Kislotali'],
        ru: ['Слабощелочной', 'Сильно щелочной', 'Нейтральный', 'Кислый'],
      },
      correctIndex: 3,
      explanation: {
        en: 'pH below 7 means acidic, 7 is neutral and above 7 is basic.',
        uz: 'pH 7 dan past — kislotali, 7 — neytral, 7 dan yuqori — ishqoriy.',
        ru: 'pH ниже 7 — кислая среда, 7 — нейтральная, выше 7 — щелочная.',
      },
    },
    {
      id: 'phenolphthalein',
      question: {
        en: 'What colour is phenolphthalein in lemon juice (pH ≈ 2)?',
        uz: 'Limon sharbatida (pH ≈ 2) fenolftalein qanday rangda?',
        ru: 'Какого цвета фенолфталеин в лимонном соке (pH ≈ 2)?',
      },
      options: {
        en: ['Yellow', 'Pink', 'Colourless', 'Blue'],
        uz: ['Sariq', 'Pushti', 'Rangsiz', 'Koʻk'],
        ru: ['Жёлтый', 'Малиновый', 'Бесцветный', 'Синий'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Phenolphthalein only turns pink above about pH 8.2; in acidic and neutral solutions it is colourless.',
        uz: 'Fenolftalein faqat taxminan pH 8,2 dan yuqorida pushti boʻladi; kislotali va neytral eritmalarda u rangsiz.',
        ru: 'Фенолфталеин становится малиновым только выше pH ≈ 8,2; в кислых и нейтральных растворах он бесцветен.',
      },
    },
    {
      id: 'tenfold',
      question: {
        en: 'Solution A has pH 3 and solution B has pH 5. How do their hydrogen-ion concentrations compare?',
        uz: 'A eritmaning pH i 3, B eritmaning pH i 5. Ularning vodorod ionlari konsentratsiyalari qanday farq qiladi?',
        ru: 'У раствора A pH 3, у раствора B pH 5. Как соотносятся концентрации ионов водорода?',
      },
      options: {
        en: ['A has 2 times more', 'A has 100 times more', 'B has 100 times more', 'They are equal'],
        uz: ['A da 2 marta koʻp', 'A da 100 marta koʻp', 'B da 100 marta koʻp', 'Ular teng'],
        ru: ['В A в 2 раза больше', 'В A в 100 раз больше', 'В B в 100 раз больше', 'Они равны'],
      },
      correctIndex: 1,
      explanation: {
        en: 'pH = −log[H⁺]. Two pH units mean a factor of 10² = 100, and the lower pH has more H⁺.',
        uz: 'pH = −log[H⁺]. Ikki pH birligi 10² = 100 marta farqni bildiradi va pH i past eritmada H⁺ koʻp.',
        ru: 'pH = −log[H⁺]. Разница в две единицы pH — это множитель 10² = 100, и при меньшем pH H⁺ больше.',
      },
    },
    {
      id: 'btb-neutral',
      question: {
        en: 'Bromothymol blue changes from yellow to blue between pH 6.0 and 7.6. What colour is it in pure water?',
        uz: 'Bromtimol koʻki pH 6,0 va 7,6 oraligʻida sariqdan koʻkka oʻtadi. Toza suvda u qanday rangda?',
        ru: 'Бромтимоловый синий меняет цвет с жёлтого на синий между pH 6,0 и 7,6. Какого он цвета в чистой воде?',
      },
      options: {
        en: ['Green', 'Blue', 'Red', 'Yellow'],
        uz: ['Yashil', 'Koʻk', 'Qizil', 'Sariq'],
        ru: ['Зелёный', 'Синий', 'Красный', 'Жёлтый'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Pure water has pH 7, inside the transition range, so a mixture of the yellow and blue forms appears green.',
        uz: 'Toza suvning pH i 7, bu oʻtish oraligʻida, shuning uchun sariq va koʻk shakllar aralashmasi yashil koʻrinadi.',
        ru: 'У чистой воды pH 7 — внутри интервала перехода, поэтому смесь жёлтой и синей форм выглядит зелёной.',
      },
    },
    {
      id: 'universal',
      question: {
        en: 'Why can universal indicator estimate pH across the whole scale while litmus cannot?',
        uz: 'Nima uchun universal indikator butun shkala boʻyicha pH ni baholay oladi, lakmus esa yoʻq?',
        ru: 'Почему универсальный индикатор может оценить pH по всей шкале, а лакмус — нет?',
      },
      options: {
        en: ['It is more concentrated', 'It reacts with water', 'It only works in acids', 'It is a mixture of several indicators'],
        uz: ['U konsentrlanganroq', 'U suv bilan reaksiyaga kirishadi', 'U faqat kislotalarda ishlaydi', 'U bir nechta indikator aralashmasi'],
        ru: ['Он более концентрированный', 'Он реагирует с водой', 'Он работает только в кислотах', 'Это смесь нескольких индикаторов'],
      },
      correctIndex: 3,
      explanation: {
        en: 'Each dye in the mixture changes colour in a different pH range, so together they give a different colour for almost every pH.',
        uz: 'Aralashmadagi har bir boʻyoq turli pH oraligʻida rang oʻzgartiradi, shuning uchun birgalikda ular deyarli har bir pH da boshqa rang beradi.',
        ru: 'Каждый краситель смеси меняет цвет в своём интервале pH, поэтому вместе они дают свой цвет почти при каждом pH.',
      },
    },
  ],
  dilution: [
    {
      id: 'c2',
      question: {
        en: '10 mL of 1.0 mol/L solution is diluted to 100 mL. What is the new concentration?',
        uz: '1,0 mol/L li eritmaning 10 mL i 100 mL gacha suyultirildi. Yangi konsentratsiya qancha?',
        ru: '10 мл раствора 1,0 моль/л разбавили до 100 мл. Какова новая концентрация?',
      },
      options: {
        en: ['0.01 mol/L', '0.1 mol/L', '1.0 mol/L', '10 mol/L'],
        uz: ['0,01 mol/L', '0,1 mol/L', '1,0 mol/L', '10 mol/L'],
        ru: ['0,01 моль/л', '0,1 моль/л', '1,0 моль/л', '10 моль/л'],
      },
      correctIndex: 1,
      explanation: {
        en: 'c₂ = c₁V₁/V₂ = 1.0 × 10 / 100 = 0.1 mol/L.',
        uz: 'c₂ = c₁V₁/V₂ = 1,0 × 10 / 100 = 0,1 mol/L.',
        ru: 'c₂ = c₁V₁/V₂ = 1,0 × 10 / 100 = 0,1 моль/л.',
      },
    },
    {
      id: 'moles-constant',
      question: {
        en: 'What stays the same when water is added to a solution?',
        uz: 'Eritmaga suv qoʻshilganda nima oʻzgarmaydi?',
        ru: 'Что не меняется при добавлении воды к раствору?',
      },
      options: {
        en: ['The concentration', 'The volume', 'The amount (moles) of solute', 'The colour intensity'],
        uz: ['Konsentratsiya', 'Hajm', 'Erigan modda miqdori (mollar)', 'Rang intensivligi'],
        ru: ['Концентрация', 'Объём', 'Количество (моли) растворённого вещества', 'Интенсивность окраски'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Water adds no solute, so n = cV is unchanged; the concentration falls because the volume grows.',
        uz: 'Suv erigan modda qoʻshmaydi, shuning uchun n = cV oʻzgarmaydi; hajm ortgani uchun konsentratsiya kamayadi.',
        ru: 'Вода не добавляет растворённого вещества, поэтому n = cV не меняется; концентрация падает, потому что растёт объём.',
      },
    },
    {
      id: 'stock-volume',
      question: {
        en: 'What volume of 2.0 mol/L stock is needed to make 250 mL of 0.40 mol/L solution?',
        uz: '250 mL 0,40 mol/L eritma tayyorlash uchun 2,0 mol/L li boshlangʻich eritmadan qancha hajm kerak?',
        ru: 'Какой объём исходного раствора 2,0 моль/л нужен для приготовления 250 мл раствора 0,40 моль/л?',
      },
      options: {
        en: ['20 mL', '50 mL', '100 mL', '200 mL'],
        uz: ['20 mL', '50 mL', '100 mL', '200 mL'],
        ru: ['20 мл', '50 мл', '100 мл', '200 мл'],
      },
      correctIndex: 1,
      explanation: {
        en: 'V₁ = c₂V₂/c₁ = 0.40 × 250 / 2.0 = 50 mL.',
        uz: 'V₁ = c₂V₂/c₁ = 0,40 × 250 / 2,0 = 50 mL.',
        ru: 'V₁ = c₂V₂/c₁ = 0,40 × 250 / 2,0 = 50 мл.',
      },
    },
    {
      id: 'order',
      question: {
        en: 'Making a standard solution in a volumetric flask, when should you mix it by inverting?',
        uz: 'Oʻlchov kolbasida standart eritma tayyorlashda uni agʻdarib qachon aralashtirish kerak?',
        ru: 'Когда при приготовлении стандартного раствора в мерной колбе его нужно перемешать переворачиванием?',
      },
      options: {
        en: ['Before adding any water', 'Halfway through filling only', 'After filling exactly to the mark', 'It never needs mixing'],
        uz: ['Suv qoʻshishdan oldin', 'Faqat toʻldirishning yarmida', 'Aynan belgigacha toʻldirgandan keyin', 'Aralashtirish shart emas'],
        ru: ['До добавления воды', 'Только на середине заполнения', 'После заполнения точно до метки', 'Перемешивать не нужно'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Fill to the mark first so the volume is exact, then stopper and invert several times so the solution is uniform.',
        uz: 'Hajm aniq boʻlishi uchun avval belgigacha toʻldiring, soʻng eritma bir jinsli boʻlishi uchun tiqin bilan yopib, bir necha marta agʻdaring.',
        ru: 'Сначала доливают до метки, чтобы объём был точным, затем закрывают пробкой и несколько раз переворачивают для однородности.',
      },
    },
    {
      id: 'beer-lambert',
      question: {
        en: 'A solution has absorbance 0.60. What absorbance do you expect after diluting it to half the concentration?',
        uz: 'Eritmaning optik zichligi 0,60. Konsentratsiyani ikki marta kamaytirgandan keyin qanday optik zichlik kutiladi?',
        ru: 'Оптическая плотность раствора 0,60. Какую оптическую плотность ожидать после разбавления вдвое?',
      },
      options: {
        en: ['0.15', '0.30', '0.60', '1.20'],
        uz: ['0,15', '0,30', '0,60', '1,20'],
        ru: ['0,15', '0,30', '0,60', '1,20'],
      },
      correctIndex: 1,
      explanation: {
        en: 'By the Beer–Lambert law A = εlc, absorbance is proportional to concentration: half the concentration, half the absorbance.',
        uz: 'Ber–Lambert qonuniga koʻra A = εlc, optik zichlik konsentratsiyaga proporsional: konsentratsiya ikki marta kam — optik zichlik ham ikki marta kam.',
        ru: 'По закону Бугера–Ламберта–Бера A = εlc оптическая плотность пропорциональна концентрации: вдвое меньше концентрация — вдвое меньше A.',
      },
    },
  ],
  'chemical-equilibrium': [
    {
      id: 'dynamic',
      question: {
        en: 'What is true at dynamic equilibrium?',
        uz: 'Dinamik muvozanatda nima toʻgʻri?',
        ru: 'Что верно для динамического равновесия?',
      },
      options: {
        en: ['Both reactions have stopped', 'The forward and reverse rates are equal', 'Only products are present', 'The concentrations of all substances are equal'],
        uz: ['Ikkala reaksiya ham toʻxtagan', 'Toʻgʻri va teskari reaksiya tezliklari teng', 'Faqat mahsulotlar bor', 'Barcha moddalar konsentratsiyalari teng'],
        ru: ['Обе реакции остановились', 'Скорости прямой и обратной реакций равны', 'Присутствуют только продукты', 'Концентрации всех веществ равны'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Both reactions continue, but at equal rates, so the concentrations stay constant (not necessarily equal).',
        uz: 'Ikkala reaksiya ham davom etadi, lekin teng tezlikda, shuning uchun konsentratsiyalar oʻzgarmaydi (teng boʻlishi shart emas).',
        ru: 'Обе реакции продолжаются, но с равными скоростями, поэтому концентрации постоянны (но не обязательно равны).',
      },
    },
    {
      id: 'heating',
      question: {
        en: 'N₂O₄ ⇌ 2NO₂ is endothermic in the forward direction. What happens when the syringe is heated?',
        uz: 'N₂O₄ ⇌ 2NO₂ toʻgʻri yoʻnalishda endotermik. Shprits qizdirilganda nima boʻladi?',
        ru: 'Прямая реакция N₂O₄ ⇌ 2NO₂ эндотермическая. Что произойдёт при нагревании шприца?',
      },
      options: {
        en: ['The colour fades and K decreases', 'The colour darkens and K increases', 'Nothing changes', 'The colour darkens but K stays the same'],
        uz: ['Rang ochadi va K kamayadi', 'Rang toʻqlashadi va K ortadi', 'Hech narsa oʻzgarmaydi', 'Rang toʻqlashadi, lekin K oʻzgarmaydi'],
        ru: ['Цвет бледнеет, K уменьшается', 'Цвет темнеет, K увеличивается', 'Ничего не меняется', 'Цвет темнеет, но K не меняется'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Heating favours the endothermic direction, making more brown NO₂. For an endothermic reaction K increases with temperature.',
        uz: 'Qizdirish endotermik yoʻnalishga yordam beradi va koʻproq qoʻngʻir NO₂ hosil boʻladi. Endotermik reaksiya uchun K harorat bilan ortadi.',
        ru: 'Нагревание смещает равновесие в сторону эндотермической реакции, образуется больше бурого NO₂. Для эндотермической реакции K растёт с температурой.',
      },
    },
    {
      id: 'pressure',
      question: {
        en: 'At constant temperature you push the plunger in. Which way does the equilibrium shift?',
        uz: 'Oʻzgarmas haroratda porshenni ichkariga itardingiz. Muvozanat qaysi tomonga siljiydi?',
        ru: 'При постоянной температуре вы вдвинули поршень. Куда сместится равновесие?',
      },
      options: {
        en: ['Towards N₂O₄, the side with fewer gas molecules', 'Towards NO₂, the side with more gas molecules', 'It does not shift', 'It depends on the colour'],
        uz: ['N₂O₄ tomonga — gaz molekulalari kamroq tomon', 'NO₂ tomonga — gaz molekulalari koʻproq tomon', 'Siljimaydi', 'Rangga bogʻliq'],
        ru: ['К N₂O₄ — в сторону меньшего числа молекул газа', 'К NO₂ — в сторону большего числа молекул газа', 'Не сместится', 'Зависит от цвета'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Higher pressure is opposed by reducing the number of gas molecules: 2NO₂ → N₂O₄. K itself is unchanged.',
        uz: 'Bosim ortishiga gaz molekulalari sonini kamaytirish bilan qarshilik qilinadi: 2NO₂ → N₂O₄. K ning oʻzi oʻzgarmaydi.',
        ru: 'Повышению давления система противодействует, уменьшая число молекул газа: 2NO₂ → N₂O₄. Сама K не меняется.',
      },
    },
    {
      id: 'q-vs-k',
      question: {
        en: 'Right after extra NO₂ is injected, Q is larger than K. What happens next?',
        uz: 'Qoʻshimcha NO₂ kiritilgandan soʻng darhol Q K dan katta. Keyin nima boʻladi?',
        ru: 'Сразу после введения NO₂ оказалось, что Q больше K. Что произойдёт дальше?',
      },
      options: {
        en: ['K rises to match Q', 'Nothing, Q stays larger', 'More NO₂ forms', 'NO₂ combines to form N₂O₄ until Q = K'],
        uz: ['K ortib Q ga tenglashadi', 'Hech narsa, Q katta qoladi', 'Koʻproq NO₂ hosil boʻladi', 'Q = K boʻlguncha NO₂ birikib N₂O₄ hosil qiladi'],
        ru: ['K растёт до Q', 'Ничего, Q остаётся больше', 'Образуется больше NO₂', 'NO₂ соединяется в N₂O₄, пока Q не станет равным K'],
      },
      correctIndex: 3,
      explanation: {
        en: 'When Q > K there is too much product, so the reverse reaction runs until Q falls back to K. Only temperature changes K.',
        uz: 'Q > K boʻlganda mahsulot ortiqcha, shuning uchun Q yana K ga tushguncha teskari reaksiya boradi. K ni faqat harorat oʻzgartiradi.',
        ru: 'При Q > K продуктов слишком много, поэтому идёт обратная реакция, пока Q не снизится до K. K меняет только температура.',
      },
    },
    {
      id: 'k-expression',
      question: {
        en: 'Which expression gives the equilibrium constant Kc for N₂O₄ ⇌ 2NO₂?',
        uz: 'N₂O₄ ⇌ 2NO₂ uchun Kc muvozanat konstantasini qaysi ifoda beradi?',
        ru: 'Какое выражение даёт константу равновесия Kc для N₂O₄ ⇌ 2NO₂?',
      },
      options: {
        en: ['[NO₂] / [N₂O₄]', '[N₂O₄] / [NO₂]²', '2[NO₂] / [N₂O₄]', '[NO₂]² / [N₂O₄]'],
        uz: ['[NO₂] / [N₂O₄]', '[N₂O₄] / [NO₂]²', '2[NO₂] / [N₂O₄]', '[NO₂]² / [N₂O₄]'],
        ru: ['[NO₂] / [N₂O₄]', '[N₂O₄] / [NO₂]²', '2[NO₂] / [N₂O₄]', '[NO₂]² / [N₂O₄]'],
      },
      correctIndex: 3,
      explanation: {
        en: 'Products over reactants, each raised to the power of its coefficient: [NO₂]² / [N₂O₄].',
        uz: 'Mahsulotlar reagentlarga boʻlinadi, har biri oʻz koeffitsiyenti darajasida: [NO₂]² / [N₂O₄].',
        ru: 'Продукты делят на реагенты, каждый в степени своего коэффициента: [NO₂]² / [N₂O₄].',
      },
    },
  ],
  'diels-alder-reaction': [
    {
      id: 'cycloaddition',
      question: {
        en: 'What kind of reaction is the Diels–Alder reaction?',
        uz: 'Dils–Alder reaksiyasi qanday turdagi reaksiya?',
        ru: 'К какому типу относится реакция Дильса–Альдера?',
      },
      options: {
        en: ['A [4+2] cycloaddition', 'A free-radical substitution', 'An SN2 substitution', 'An elimination that forms two alkenes'],
        uz: ['[4+2] siklobirikish', 'Erkin radikal oʻrin olish', 'SN2 oʻrin olish', 'Ikki alken hosil qiluvchi ajralish'],
        ru: ['[4+2]-Циклоприсоединение', 'Свободнорадикальное замещение', 'Замещение SN2', 'Отщепление с образованием двух алкенов'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Four π electrons of the diene and two of the dienophile combine in one concerted step to form a new ring: a [4+2] cycloaddition.',
        uz: 'Diendagi toʻrtta va dienofildagi ikkita π elektron bitta kelishilgan bosqichda yangi halqa hosil qiladi: bu [4+2] siklobirikish.',
        ru: 'Четыре π-электрона диена и два π-электрона диенофила в одну согласованную стадию образуют новый цикл: это [4+2]-циклоприсоединение.',
      },
    },
    {
      id: 'ring-size',
      question: {
        en: 'What size of ring is formed when butadiene reacts with ethylene?',
        uz: 'Butadiyen etilen bilan reaksiyaga kirishganda necha aʼzoli halqa hosil boʻladi?',
        ru: 'Какой цикл образуется при реакции бутадиена с этиленом?',
      },
      options: {
        en: ['Four-membered', 'Five-membered', 'Six-membered (cyclohexene)', 'Eight-membered'],
        uz: ['Toʻrt aʼzoli', 'Besh aʼzoli', 'Olti aʼzoli (siklogeksen)', 'Sakkiz aʼzoli'],
        ru: ['Четырёхчленный', 'Пятичленный', 'Шестичленный (циклогексен)', 'Восьмичленный'],
      },
      correctIndex: 2,
      explanation: {
        en: 'The four carbons of the diene and the two of the dienophile make a six-membered ring with one remaining C=C bond: cyclohexene, C₆H₁₀.',
        uz: 'Dienning toʻrtta va dienofilning ikkita uglerodi bitta C=C bogʻ qolgan olti aʼzoli halqa hosil qiladi: siklogeksen, C₆H₁₀.',
        ru: 'Четыре атома углерода диена и два атома диенофила образуют шестичленный цикл с одной оставшейся связью C=C: циклогексен C₆H₁₀.',
      },
    },
    {
      id: 's-cis',
      question: {
        en: 'Why does cyclopentadiene react much faster than 1,3-butadiene?',
        uz: 'Nima uchun siklopentadiyen 1,3-butadiyenga qaraganda ancha tez reaksiyaga kirishadi?',
        ru: 'Почему циклопентадиен реагирует намного быстрее 1,3-бутадиена?',
      },
      options: {
        en: ['It is held in the s-cis shape the reaction needs', 'It has more carbon atoms', 'It is a gas at room temperature', 'It has no π bonds'],
        uz: ['U reaksiyaga kerak boʻlgan s-sis shaklda qotib turadi', 'Unda uglerod atomlari koʻproq', 'U xona haroratida gaz', 'Unda π bogʻlar yoʻq'],
        ru: ['Он закреплён в нужной для реакции s-цис-конформации', 'В нём больше атомов углерода', 'При комнатной температуре это газ', 'В нём нет π-связей'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Both ends of the diene must reach the dienophile, so the diene must be s-cis. Butadiene is mostly s-trans; the ring locks cyclopentadiene s-cis.',
        uz: 'Dienning ikkala uchi dienofilga yetishi kerak, shuning uchun dien s-sis boʻlishi lozim. Butadiyen asosan s-trans; halqa esa siklopentadiyenni s-sis holatda ushlab turadi.',
        ru: 'Оба конца диена должны достать до диенофила, поэтому диен должен быть s-цис. Бутадиен в основном s-транс, а цикл закрепляет циклопентадиен в s-цис.',
      },
    },
    {
      id: 'ewg',
      question: {
        en: 'Which dienophile reacts fastest with a given diene?',
        uz: 'Berilgan dien bilan qaysi dienofil eng tez reaksiyaga kirishadi?',
        ru: 'Какой диенофил быстрее всего реагирует с данным диеном?',
      },
      options: {
        en: ['Ethylene', 'Maleic anhydride (two C=O groups)', 'Ethane', 'An alkene with electron-donating groups'],
        uz: ['Etilen', 'Malein angidridi (ikkita C=O guruh)', 'Etan', 'Elektron beruvchi guruhli alken'],
        ru: ['Этилен', 'Малеиновый ангидрид (две группы C=O)', 'Этан', 'Алкен с электронодонорными группами'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Electron-withdrawing groups lower the dienophile LUMO, shrink the HOMO–LUMO gap and lower the activation energy.',
        uz: 'Elektron tortuvchi guruhlar dienofil LUMO sini pasaytiradi, HOMO–LUMO oraligʻini kamaytiradi va faollanish energiyasini pasaytiradi.',
        ru: 'Электроноакцепторные группы опускают НСМО диенофила, уменьшают зазор ВЗМО–НСМО и снижают энергию активации.',
      },
    },
    {
      id: 'endo',
      question: {
        en: 'Cyclopentadiene and maleic anhydride at room temperature give mainly which product?',
        uz: 'Xona haroratida siklopentadiyen va malein angidridi asosan qaysi mahsulotni beradi?',
        ru: 'Какой продукт в основном дают циклопентадиен и малеиновый ангидрид при комнатной температуре?',
      },
      options: {
        en: ['The exo adduct, because it is more stable', 'The endo adduct, because it forms faster', 'An equal mixture of endo and exo', 'No product at all'],
        uz: ['Ekzo addukt, chunki u barqarorroq', 'Endo addukt, chunki u tezroq hosil boʻladi', 'Endo va ekzoning teng aralashmasi', 'Umuman mahsulot yoʻq'],
        ru: ['Экзо-аддукт, так как он устойчивее', 'Эндо-аддукт, так как он образуется быстрее', 'Смесь эндо и экзо поровну', 'Никакого продукта'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Alder’s endo rule: secondary orbital overlap with the C=O groups lowers the endo transition state, so the endo product dominates under kinetic control.',
        uz: 'Alderning endo qoidasi: C=O guruhlar bilan ikkilamchi orbital qoplanish endo oʻtish holatini pasaytiradi, shuning uchun kinetik nazoratda endo mahsulot ustun.',
        ru: 'Правило эндо Альдера: вторичное перекрывание орбиталей с группами C=O понижает эндо-переходное состояние, поэтому при кинетическом контроле преобладает эндо-продукт.',
      },
    },
  ],
  'synthesis-of-aspirin': [
    {
      id: 'reactants',
      question: {
        en: 'Which two substances react to make aspirin in this experiment?',
        uz: 'Bu tajribada aspirin olish uchun qaysi ikki modda reaksiyaga kirishadi?',
        ru: 'Какие два вещества реагируют в этом опыте с образованием аспирина?',
      },
      options: {
        en: ['Salicylic acid and acetic anhydride', 'Benzoic acid and ethanol', 'Phenol and sodium hydroxide', 'Acetic acid and water'],
        uz: ['Salitsil kislota va sirka angidridi', 'Benzoy kislota va etanol', 'Fenol va natriy gidroksid', 'Sirka kislota va suv'],
        ru: ['Салициловая кислота и уксусный ангидрид', 'Бензойная кислота и этанол', 'Фенол и гидроксид натрия', 'Уксусная кислота и вода'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Acetic anhydride acetylates the phenol −OH of salicylic acid, giving acetylsalicylic acid (aspirin) and acetic acid.',
        uz: 'Sirka angidridi salitsil kislotaning fenol −OH guruhini atsetillaydi va atsetilsalitsil kislota (aspirin) hamda sirka kislota hosil boʻladi.',
        ru: 'Уксусный ангидрид ацетилирует фенольную группу −OH салициловой кислоты, образуя ацетилсалициловую кислоту (аспирин) и уксусную кислоту.',
      },
    },
    {
      id: 'catalyst',
      question: {
        en: 'What is the role of a few drops of concentrated H₂SO₄ or H₃PO₄?',
        uz: 'Bir necha tomchi konsentrlangan H₂SO₄ yoki H₃PO₄ ning vazifasi nima?',
        ru: 'Какова роль нескольких капель концентрированной H₂SO₄ или H₃PO₄?',
      },
      options: {
        en: ['They are a reactant that ends up in the aspirin', 'They catalyse the esterification', 'They neutralise the product', 'They are the FeCl₃ test reagent'],
        uz: ['Ular aspirin tarkibiga oʻtadigan reagent', 'Ular eterifikatsiyani katalizlaydi', 'Ular mahsulotni neytrallaydi', 'Ular FeCl₃ sinovi reaktivi'],
        ru: ['Это реагент, входящий в состав аспирина', 'Они катализируют этерификацию', 'Они нейтрализуют продукт', 'Это реактив для пробы с FeCl₃'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The strong acid speeds up the reaction without being used up. Without it, little aspirin forms in the same time.',
        uz: 'Kuchli kislota sarflanmasdan reaksiyani tezlashtiradi. Usiz xuddi shu vaqtda juda oz aspirin hosil boʻladi.',
        ru: 'Сильная кислота ускоряет реакцию, не расходуясь. Без неё за то же время образуется мало аспирина.',
      },
    },
    {
      id: 'product',
      question: {
        en: 'What is the molecular formula of aspirin?',
        uz: 'Aspirinning molekulyar formulasi qanday?',
        ru: 'Какова молекулярная формула аспирина?',
      },
      options: {
        en: ['C₇H₆O₃', 'C₉H₈O₄', 'C₄H₆O₃', 'C₂H₄O₂'],
        uz: ['C₇H₆O₃', 'C₉H₈O₄', 'C₄H₆O₃', 'C₂H₄O₂'],
        ru: ['C₇H₆O₃', 'C₉H₈O₄', 'C₄H₆O₃', 'C₂H₄O₂'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Aspirin, acetylsalicylic acid, is C₉H₈O₄ (180.16 g/mol). C₇H₆O₃ is salicylic acid, C₄H₆O₃ acetic anhydride and C₂H₄O₂ acetic acid.',
        uz: 'Aspirin, yaʼni atsetilsalitsil kislota C₉H₈O₄ (180,16 g/mol). C₇H₆O₃ salitsil kislota, C₄H₆O₃ sirka angidridi, C₂H₄O₂ esa sirka kislota.',
        ru: 'Аспирин (ацетилсалициловая кислота) — C₉H₈O₄ (180,16 г/моль). C₇H₆O₃ — салициловая кислота, C₄H₆O₃ — уксусный ангидрид, C₂H₄O₂ — уксусная кислота.',
      },
    },
    {
      id: 'limiting',
      question: {
        en: '2.76 g of salicylic acid (M = 138 g/mol) reacts with excess acetic anhydride. What is the theoretical yield of aspirin (M = 180 g/mol)?',
        uz: '2,76 g salitsil kislota (M = 138 g/mol) ortiqcha sirka angidridi bilan reaksiyaga kirishadi. Aspirinning (M = 180 g/mol) nazariy unumi qancha?',
        ru: '2,76 г салициловой кислоты (M = 138 г/моль) реагирует с избытком уксусного ангидрида. Каков теоретический выход аспирина (M = 180 г/моль)?',
      },
      options: {
        en: ['2.76 g', '3.60 g', '2.12 g', '5.52 g'],
        uz: ['2,76 g', '3,60 g', '2,12 g', '5,52 g'],
        ru: ['2,76 г', '3,60 г', '2,12 г', '5,52 г'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Salicylic acid is limiting: 2.76 / 138 = 0.0200 mol. In a 1 : 1 reaction this gives 0.0200 mol × 180 g/mol = 3.60 g of aspirin.',
        uz: 'Salitsil kislota chegaralovchi: 2,76 / 138 = 0,0200 mol. 1 : 1 reaksiyada bu 0,0200 mol × 180 g/mol = 3,60 g aspirin beradi.',
        ru: 'Лимитирует салициловая кислота: 2,76 / 138 = 0,0200 моль. При соотношении 1 : 1 это даёт 0,0200 моль × 180 г/моль = 3,60 г аспирина.',
      },
    },
    {
      id: 'fecl3',
      question: {
        en: 'Your product turns violet with FeCl₃ solution. What does this show?',
        uz: 'Mahsulotingiz FeCl₃ eritmasi bilan binafsha rangga kirdi. Bu nimani koʻrsatadi?',
        ru: 'Ваш продукт даёт фиолетовую окраску с раствором FeCl₃. О чём это говорит?',
      },
      options: {
        en: ['The aspirin is pure', 'Unreacted salicylic acid is present', 'Too much catalyst was used', 'The product contains iron'],
        uz: ['Aspirin toza', 'Reaksiyaga kirishmagan salitsil kislota bor', 'Katalizator juda koʻp ishlatilgan', 'Mahsulot tarkibida temir bor'],
        ru: ['Аспирин чистый', 'Присутствует непрореагировавшая салициловая кислота', 'Взято слишком много катализатора', 'Продукт содержит железо'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Fe³⁺ forms a violet complex with phenols. Salicylic acid has a free phenol −OH group; aspirin does not, so pure aspirin gives no violet colour.',
        uz: 'Fe³⁺ fenollar bilan binafsha kompleks hosil qiladi. Salitsil kislotada erkin fenol −OH guruhi bor, aspirinda yoʻq, shuning uchun toza aspirin binafsha rang bermaydi.',
        ru: 'Fe³⁺ образует с фенолами фиолетовый комплекс. У салициловой кислоты есть свободная фенольная группа −OH, у аспирина её нет, поэтому чистый аспирин фиолетовой окраски не даёт.',
      },
    },
  ],
  'weak-base-strong-acid-titration': [
    {
      id: 'eq-ph',
      question: {
        en: 'What is the pH at the equivalence point when aqueous ammonia is titrated with HCl?',
        uz: 'Ammiak eritmasi HCl bilan titrlanganda ekvivalentlik nuqtasidagi pH qanday?',
        ru: 'Каков pH в точке эквивалентности при титровании раствора аммиака соляной кислотой?',
      },
      options: {
        en: ['Exactly 7', 'Below 7', 'Above 7', 'Always 14'],
        uz: ['Aynan 7', '7 dan kichik', '7 dan katta', 'Doim 14'],
        ru: ['Ровно 7', 'Ниже 7', 'Выше 7', 'Всегда 14'],
      },
      correctIndex: 1,
      explanation: {
        en: 'At equivalence only NH₄Cl is present. NH₄⁺ is a weak acid (NH₄⁺ ⇌ NH₃ + H⁺), so the solution is acidic, about pH 5.3 for 0.1 M solutions.',
        uz: 'Ekvivalentlikda faqat NH₄Cl boʻladi. NH₄⁺ kuchsiz kislota (NH₄⁺ ⇌ NH₃ + H⁺), shuning uchun eritma kislotali, 0,1 M eritmalar uchun taxminan pH 5,3.',
        ru: 'В точке эквивалентности есть только NH₄Cl. NH₄⁺ — слабая кислота (NH₄⁺ ⇌ NH₃ + H⁺), поэтому раствор кислый, около pH 5,3 для 0,1 М растворов.',
      },
    },
    {
      id: 'buffer',
      question: {
        en: 'Which equation gives the pH in the buffer region before equivalence?',
        uz: 'Ekvivalentlikdan oldingi bufer sohasida pH qaysi tenglama bilan topiladi?',
        ru: 'Какое уравнение даёт pH в буферной области до точки эквивалентности?',
      },
      options: {
        en: ['pOH = pKb + log([NH₄⁺]/[NH₃])', 'pH = −log[HCl]', 'pH = 7', 'pH = ½(pKw + pKa)'],
        uz: ['pOH = pKb + log([NH₄⁺]/[NH₃])', 'pH = −log[HCl]', 'pH = 7', 'pH = ½(pKw + pKa)'],
        ru: ['pOH = pKb + lg([NH₄⁺]/[NH₃])', 'pH = −lg[HCl]', 'pH = 7', 'pH = ½(pKw + pKa)'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Before equivalence the flask contains NH₃ and NH₄⁺, a buffer. The Henderson–Hasselbalch equation for a base gives pOH from pKb and the ratio of the two.',
        uz: 'Ekvivalentlikdan oldin kolbada NH₃ va NH₄⁺ bor, yaʼni bufer. Asos uchun Henderson–Hasselbalx tenglamasi pOH ni pKb va ularning nisbatidan beradi.',
        ru: 'До эквивалентности в колбе есть NH₃ и NH₄⁺ — буфер. Уравнение Гендерсона–Хассельбаха для основания даёт pOH через pKb и соотношение этих частиц.',
      },
    },
    {
      id: 'indicator',
      question: {
        en: 'Which indicator is best for titrating ammonia with hydrochloric acid?',
        uz: 'Ammiakni xlorid kislota bilan titrlash uchun qaysi indikator eng yaxshi?',
        ru: 'Какой индикатор лучше всего подходит для титрования аммиака соляной кислотой?',
      },
      options: {
        en: ['Phenolphthalein (pH 8.2–10)', 'Methyl red (pH 4.4–6.2)', 'Thymolphthalein (pH 9.3–10.5)', 'No indicator works'],
        uz: ['Fenolftalein (pH 8,2–10)', 'Metil qizili (pH 4,4–6,2)', 'Timolftalein (pH 9,3–10,5)', 'Hech qaysi indikator ishlamaydi'],
        ru: ['Фенолфталеин (pH 8,2–10)', 'Метиловый красный (pH 4,4–6,2)', 'Тимолфталеин (pH 9,3–10,5)', 'Никакой индикатор не подходит'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The indicator must change colour in the steep part of the curve around the acidic equivalence point (~pH 5.3). Methyl red (or methyl orange) does; phenolphthalein changes far too early.',
        uz: 'Indikator rangi kislotali ekvivalentlik nuqtasi (~pH 5,3) atrofidagi egri chiziqning keskin qismida oʻzgarishi kerak. Metil qizili (yoki metil zargʻaldogʻi) shunday; fenolftalein esa juda erta oʻzgaradi.',
        ru: 'Индикатор должен менять окраску на крутом участке кривой около кислой точки эквивалентности (~pH 5,3). Метиловый красный (или метиловый оранжевый) подходит; фенолфталеин меняет цвет слишком рано.',
      },
    },
    {
      id: 'excess',
      question: {
        en: '25.0 mL of 0.100 M NH₃ is titrated with 0.100 M HCl. What is the pH after 30.0 mL of acid?',
        uz: '25,0 mL 0,100 M NH₃ 0,100 M HCl bilan titrlanmoqda. 30,0 mL kislotadan keyin pH qancha?',
        ru: '25,0 мл 0,100 М NH₃ титруют 0,100 М HCl. Каков pH после добавления 30,0 мл кислоты?',
      },
      options: {
        en: ['About 1.0', 'About 2.0', 'About 5.3', 'About 9.3'],
        uz: ['Taxminan 1,0', 'Taxminan 2,0', 'Taxminan 5,3', 'Taxminan 9,3'],
        ru: ['Около 1,0', 'Около 2,0', 'Около 5,3', 'Около 9,3'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Excess H⁺ = 3.00 − 2.50 = 0.50 mmol in 55.0 mL, so [H⁺] = 9.1 × 10⁻³ M and pH = 2.04.',
        uz: 'Ortiqcha H⁺ = 3,00 − 2,50 = 0,50 mmol, hajm 55,0 mL, demak [H⁺] = 9,1 × 10⁻³ M va pH = 2,04.',
        ru: 'Избыток H⁺ = 3,00 − 2,50 = 0,50 ммоль в 55,0 мл, значит [H⁺] = 9,1 × 10⁻³ М и pH = 2,04.',
      },
    },
    {
      id: 'half-eq',
      question: {
        en: 'At the half-equivalence point of an NH₃ / HCl titration, which statement is true?',
        uz: 'NH₃ / HCl titrlashining yarim ekvivalentlik nuqtasida qaysi fikr toʻgʻri?',
        ru: 'Какое утверждение верно для точки полуэквивалентности при титровании NH₃ / HCl?',
      },
      options: {
        en: ['pOH = pKb, so pH = 14 − pKb ≈ 9.26', 'pH = 7', 'pH = pKb ≈ 4.74', 'All the ammonia has reacted'],
        uz: ['pOH = pKb, demak pH = 14 − pKb ≈ 9,26', 'pH = 7', 'pH = pKb ≈ 4,74', 'Barcha ammiak reaksiyaga kirishgan'],
        ru: ['pOH = pKb, значит pH = 14 − pKb ≈ 9,26', 'pH = 7', 'pH = pKb ≈ 4,74', 'Весь аммиак прореагировал'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Half of the NH₃ has become NH₄⁺, so [NH₄⁺] = [NH₃] and the log term is zero: pOH = pKb = 4.74. The pH is 14 − 4.74 = 9.26, which is the pKa of NH₄⁺.',
        uz: 'NH₃ ning yarmi NH₄⁺ ga aylangan, demak [NH₄⁺] = [NH₃] va logarifm hadi nolga teng: pOH = pKb = 4,74. pH = 14 − 4,74 = 9,26, bu NH₄⁺ ning pKa qiymati.',
        ru: 'Половина NH₃ превратилась в NH₄⁺, поэтому [NH₄⁺] = [NH₃] и логарифмический член равен нулю: pOH = pKb = 4,74. pH = 14 − 4,74 = 9,26 — это pKa иона NH₄⁺.',
      },
    },
  ],
  'flame-test': [
    {
      id: 'identify',
      question: {
        en: 'An unknown salt gives a brick-red flame. Which cation is it most likely to contain?',
        uz: 'Nomaʼlum tuz gʻisht-qizil alanga beradi. Unda qaysi kation boʻlishi ehtimoli koʻproq?',
        ru: 'Неизвестная соль окрашивает пламя в кирпично-красный цвет. Какой катион в ней, скорее всего?',
      },
      options: {
        en: ['Na⁺', 'Ca²⁺', 'Ba²⁺', 'Cu²⁺'],
        uz: ['Na⁺', 'Ca²⁺', 'Ba²⁺', 'Cu²⁺'],
        ru: ['Na⁺', 'Ca²⁺', 'Ba²⁺', 'Cu²⁺'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Calcium gives a brick-red (orange-red) flame. Sodium is yellow, barium apple green and copper blue-green.',
        uz: 'Kalsiy gʻisht-qizil (zargʻaldoq-qizil) alanga beradi. Natriy sariq, bariy olma-yashil, mis esa koʻkish-yashil.',
        ru: 'Кальций окрашивает пламя в кирпично-красный (оранжево-красный) цвет. Натрий — жёлтый, барий — яблочно-зелёный, медь — сине-зелёный.',
      },
    },
    {
      id: 'sodium',
      question: {
        en: 'Which metal ion gives an intense yellow flame (589 nm)?',
        uz: 'Qaysi metall ioni kuchli sariq alanga (589 nm) beradi?',
        ru: 'Какой ион металла даёт яркое жёлтое пламя (589 нм)?',
      },
      options: {
        en: ['Potassium', 'Strontium', 'Sodium', 'Copper'],
        uz: ['Kaliy', 'Stronsiy', 'Natriy', 'Mis'],
        ru: ['Калий', 'Стронций', 'Натрий', 'Медь'],
      },
      correctIndex: 2,
      explanation: {
        en: 'The sodium D lines at 589.0 and 589.6 nm (3p → 3s) give the yellow colour. ΔE = hc/λ ≈ 2.1 eV.',
        uz: '589,0 va 589,6 nm dagi natriy D chiziqlari (3p → 3s) sariq rang beradi. ΔE = hc/λ ≈ 2,1 eV.',
        ru: 'Жёлтый цвет дают D-линии натрия 589,0 и 589,6 нм (3p → 3s). ΔE = hc/λ ≈ 2,1 эВ.',
      },
    },
    {
      id: 'potassium',
      question: {
        en: 'A potassium salt gives a lilac flame, but a trace of sodium hides it. How can the lilac still be seen?',
        uz: 'Kaliy tuzi nafis binafsha alanga beradi, lekin natriy izi uni yashiradi. Nafis binafsha rangni qanday koʻrish mumkin?',
        ru: 'Соль калия даёт сиреневое пламя, но следы натрия его маскируют. Как всё же увидеть сиреневый цвет?',
      },
      options: {
        en: ['Look through cobalt-blue glass', 'Use a bigger flame', 'Add more sodium chloride', 'Close the air hole of the burner'],
        uz: ['Kobalt-koʻk shisha orqali qarash', 'Kattaroq alanga ishlatish', 'Koʻproq natriy xlorid qoʻshish', 'Gorelkaning havo teshigini yopish'],
        ru: ['Смотреть через кобальтовое стекло', 'Сделать пламя больше', 'Добавить ещё хлорида натрия', 'Закрыть воздушное отверстие горелки'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Cobalt-blue glass absorbs the yellow sodium light but lets through the violet and deep-red potassium lines, so the lilac becomes visible.',
        uz: 'Kobalt-koʻk shisha natriyning sariq nurini yutadi, lekin kaliyning binafsha va toʻq qizil chiziqlarini oʻtkazadi, shuning uchun nafis binafsha rang koʻrinadi.',
        ru: 'Кобальтовое стекло поглощает жёлтый свет натрия, но пропускает фиолетовые и тёмно-красные линии калия, и сиреневый цвет становится виден.',
      },
    },
    {
      id: 'hcl',
      question: {
        en: 'Why is the nichrome wire dipped in hydrochloric acid and heated between tests?',
        uz: 'Nima uchun sinovlar orasida nixrom sim xlorid kislotaga botirilib qizdiriladi?',
        ru: 'Зачем между опытами нихромовую проволоку смачивают соляной кислотой и прокаливают?',
      },
      options: {
        en: ['To make the flame hotter', 'To remove traces of the previous salt', 'To colour the flame red', 'To stop the wire from melting'],
        uz: ['Alangani issiqroq qilish uchun', 'Oldingi tuz izlarini yoʻqotish uchun', 'Alangani qizil rangga boʻyash uchun', 'Sim erib ketmasligi uchun'],
        ru: ['Чтобы пламя стало горячее', 'Чтобы удалить следы предыдущей соли', 'Чтобы окрасить пламя в красный цвет', 'Чтобы проволока не расплавилась'],
      },
      correctIndex: 1,
      explanation: {
        en: 'HCl turns leftover salts into volatile chlorides that burn off. A clean wire gives no colour, so the next test is not contaminated.',
        uz: 'HCl qolgan tuzlarni uchuvchan xloridlarga aylantiradi va ular yonib ketadi. Toza sim rang bermaydi, shuning uchun keyingi sinov ifloslanmaydi.',
        ru: 'HCl превращает остатки солей в летучие хлориды, которые сгорают. Чистая проволока не окрашивает пламя, и следующий опыт не загрязняется.',
      },
    },
    {
      id: 'emission',
      question: {
        en: 'Where does the coloured light in a flame test come from?',
        uz: 'Alanga sinovidagi rangli nur qayerdan keladi?',
        ru: 'Откуда берётся цветной свет при окрашивании пламени?',
      },
      options: {
        en: [
          'Electrons falling back to lower energy levels emit photons (emission)',
          'The salt absorbs some colours of the flame (absorption)',
          'The wire glows because it is hot',
          'The metal burns with oxygen',
        ],
        uz: [
          'Elektronlar pastroq energiya sathlariga qaytib tushib foton chiqaradi (emissiya)',
          'Tuz alangadagi baʼzi ranglarni yutadi (yutilish)',
          'Sim issiq boʻlgani uchun yonadi',
          'Metall kislorod bilan yonadi',
        ],
        ru: [
          'Электроны, возвращаясь на более низкие уровни, испускают фотоны (испускание)',
          'Соль поглощает часть цветов пламени (поглощение)',
          'Проволока светится, потому что раскалена',
          'Металл горит в кислороде',
        ],
      },
      correctIndex: 0,
      explanation: {
        en: 'Heat excites electrons to higher levels; when they fall back, they emit photons with ΔE = hc/λ. This is an emission spectrum. In absorption the same wavelengths would be taken in instead.',
        uz: 'Issiqlik elektronlarni yuqoriroq sathlarga qoʻzgʻatadi; ular qaytib tushganda ΔE = hc/λ energiyali fotonlar chiqaradi. Bu emissiya spektri. Yutilishda esa aynan shu toʻlqin uzunliklari yutiladi.',
        ru: 'Нагрев возбуждает электроны на более высокие уровни; возвращаясь, они испускают фотоны с ΔE = hc/λ. Это спектр испускания. При поглощении те же длины волн, наоборот, поглощались бы.',
      },
    },
  ],
  'gc-ms-analysis': [
    {
      id: 'gc-separates',
      question: {
        en: 'What does gas chromatography separate the compounds of a mixture by?',
        uz: 'Gaz xromatografiyasi aralashmadagi moddalarni nima boʻyicha ajratadi?',
        ru: 'По какому признаку газовая хроматография разделяет вещества смеси?',
      },
      options: {
        en: ['Colour', 'Volatility and interaction (polarity) with the stationary phase', 'Electrical charge only', 'Particle size'],
        uz: ['Rang', 'Uchuvchanlik va statsionar faza bilan taʼsirlashuv (qutblilik)', 'Faqat elektr zaryadi', 'Zarracha oʻlchami'],
        ru: ['По цвету', 'По летучести и взаимодействию (полярности) с неподвижной фазой', 'Только по электрическому заряду', 'По размеру частиц'],
      },
      correctIndex: 1,
      explanation: {
        en: 'More volatile compounds spend more time in the gas and elute first; compounds that interact strongly with the stationary phase (similar polarity) are held back.',
        uz: 'Uchuvchanroq moddalar gazda koʻproq vaqt oʻtkazadi va birinchi chiqadi; statsionar faza bilan kuchli taʼsirlashadigan (qutbliligi oʻxshash) moddalar ushlanib qoladi.',
        ru: 'Более летучие вещества больше времени проводят в газе и выходят первыми; вещества, сильно взаимодействующие с неподвижной фазой (близкой полярности), задерживаются.',
      },
    },
    {
      id: 'ms-identifies',
      question: {
        en: 'How does the mass spectrometer identify a compound?',
        uz: 'Mass-spektrometr moddani qanday aniqlaydi?',
        ru: 'Как масс-спектрометр идентифицирует вещество?',
      },
      options: {
        en: ['By its boiling point', 'By the pattern of m/z values of its ion and fragments', 'By the colour of its vapour', 'By its retention time alone'],
        uz: ['Qaynash harorati boʻyicha', 'Ioni va boʻlaklarining m/z qiymatlari manzarasi boʻyicha', 'Bugʻining rangi boʻyicha', 'Faqat ushlanish vaqti boʻyicha'],
        ru: ['По температуре кипения', 'По набору значений m/z его иона и фрагментов', 'По цвету паров', 'Только по времени удерживания'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Electron ionisation breaks each molecule into a characteristic set of ions. The pattern of mass-to-charge ratios is a fingerprint that is matched against a library.',
        uz: 'Elektron ionlash har bir molekulani oʻziga xos ionlar toʻplamiga parchalaydi. Massa/zaryad nisbatlari manzarasi kutubxona bilan solishtiriladigan barmoq izidir.',
        ru: 'Электронная ионизация разбивает каждую молекулу на характерный набор ионов. Набор отношений массы к заряду — «отпечаток», который сравнивают с библиотекой.',
      },
    },
    {
      id: 'retention',
      question: {
        en: 'You raise the GC oven temperature from 60 °C to 120 °C. What happens to the retention times?',
        uz: 'GX pechi haroratini 60 °C dan 120 °C gacha oshirdingiz. Ushlanish vaqtlari bilan nima boʻladi?',
        ru: 'Вы повысили температуру термостата ГХ с 60 °C до 120 °C. Что произойдёт с временами удерживания?',
      },
      options: {
        en: ['They get shorter', 'They get longer', 'They stay the same', 'Only the first peak changes'],
        uz: ['Qisqaradi', 'Uzayadi', 'Oʻzgarmaydi', 'Faqat birinchi choʻqqi oʻzgaradi'],
        ru: ['Уменьшатся', 'Увеличатся', 'Не изменятся', 'Изменится только первый пик'],
      },
      correctIndex: 0,
      explanation: {
        en: 'At a higher temperature compounds spend more time in the gas phase (smaller retention factor k), so every peak elutes earlier, though peaks also move closer together.',
        uz: 'Yuqori haroratda moddalar gaz fazada koʻproq vaqt oʻtkazadi (ushlanish koeffitsiyenti k kichikroq), shuning uchun har bir choʻqqi ertaroq chiqadi, lekin choʻqqilar bir-biriga yaqinlashadi ham.',
        ru: 'При более высокой температуре вещества больше времени проводят в газовой фазе (меньше коэффициент удерживания k), поэтому каждый пик выходит раньше, хотя пики и сближаются.',
      },
    },
    {
      id: 'base-peak',
      question: {
        en: 'What is the base peak in a mass spectrum?',
        uz: 'Mass-spektrdagi asosiy choʻqqi nima?',
        ru: 'Что такое базовый пик в масс-спектре?',
      },
      options: {
        en: ['The peak with the highest m/z', 'The tallest peak, set to 100 % abundance', 'The first peak in the chromatogram', 'The peak of the carrier gas'],
        uz: ['m/z qiymati eng katta choʻqqi', 'Eng baland choʻqqi, koʻpligi 100 % deb olinadi', 'Xromatogrammadagi birinchi choʻqqi', 'Tashuvchi gaz choʻqqisi'],
        ru: ['Пик с наибольшим m/z', 'Самый высокий пик, его интенсивность принята за 100 %', 'Первый пик хроматограммы', 'Пик газа-носителя'],
      },
      correctIndex: 1,
      explanation: {
        en: 'The base peak is the most abundant ion, often a stable fragment such as C₇H₇⁺ (m/z 91) for toluene. All other peaks are given relative to it.',
        uz: 'Asosiy choʻqqi eng koʻp hosil boʻlgan ion, koʻpincha barqaror boʻlak, masalan toluol uchun C₇H₇⁺ (m/z 91). Boshqa barcha choʻqqilar unga nisbatan beriladi.',
        ru: 'Базовый пик — самый интенсивный ион, часто устойчивый фрагмент, например C₇H₇⁺ (m/z 91) у толуола. Все остальные пики даются относительно него.',
      },
    },
    {
      id: 'molecular-ion',
      question: {
        en: 'The molecular ion of an unknown appears at m/z 58. What does this tell you?',
        uz: 'Nomaʼlum moddaning molekulyar ioni m/z 58 da paydo boʻldi. Bu nimani bildiradi?',
        ru: 'Молекулярный ион неизвестного вещества виден при m/z 58. О чём это говорит?',
      },
      options: {
        en: ['Its molar mass is 58 g/mol', 'It contains 58 carbon atoms', 'It boils at 58 °C', 'It elutes after 58 minutes'],
        uz: ['Uning molyar massasi 58 g/mol', 'Unda 58 ta uglerod atomi bor', 'U 58 °C da qaynaydi', 'U 58 daqiqadan keyin chiqadi'],
        ru: ['Его молярная масса 58 г/моль', 'В нём 58 атомов углерода', 'Оно кипит при 58 °C', 'Оно выходит через 58 минут'],
      },
      correctIndex: 0,
      explanation: {
        en: 'M⁺• is the whole molecule minus one electron, so with charge 1+ its m/z equals the molar mass. 58 fits acetone, C₃H₆O.',
        uz: 'M⁺• bitta elektroni yoʻqolgan butun molekula, zaryadi 1+ boʻlgani uchun uning m/z qiymati molyar massaga teng. 58 aseton, C₃H₆O ga mos keladi.',
        ru: 'M⁺• — целая молекула без одного электрона, при заряде 1+ её m/z равно молярной массе. 58 соответствует ацетону C₃H₆O.',
      },
    },
  ],
  'dna-extraction': [
    {
      id: 'detergent',
      question: {
        en: 'What is the job of the detergent in the extraction buffer?',
        uz: 'Ajratish buferidagi yuvish vositasining vazifasi nima?',
        ru: 'Зачем в буфере для выделения нужно моющее средство?',
      },
      options: {
        en: ['It makes the DNA white', 'It dissolves the cell and nuclear membranes so the DNA is released', 'It digests the proteins', 'It makes the DNA insoluble'],
        uz: ['DNKni oq qiladi', 'Hujayra va yadro membranalarini eritadi va DNK ajralib chiqadi', 'Oqsillarni parchalaydi', 'DNKni erimaydigan qiladi'],
        ru: ['Делает ДНК белой', 'Растворяет мембраны клетки и ядра, и ДНК высвобождается', 'Расщепляет белки', 'Делает ДНК нерастворимой'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Membranes are made of lipids. Detergent dissolves them (cell lysis), so the DNA can get out into the buffer.',
        uz: 'Membranalar lipidlardan iborat. Yuvish vositasi ularni eritadi (hujayra lizisi) va DNK buferga chiqadi.',
        ru: 'Мембраны состоят из липидов. Моющее средство растворяет их (лизис клетки), и ДНК выходит в буфер.',
      },
    },
    {
      id: 'ethanol',
      question: {
        en: 'Why is ice-cold ethanol poured on top of the filtrate?',
        uz: 'Nega filtrat ustidan muzdek etanol quyiladi?',
        ru: 'Зачем на фильтрат наливают ледяной этанол?',
      },
      options: {
        en: ['DNA is insoluble in ethanol, so it precipitates', 'To kill bacteria', 'To dissolve the DNA', 'To break the cell walls'],
        uz: ['DNK etanolda erimaydi, shuning uchun choʻkadi', 'Bakteriyalarni oʻldirish uchun', 'DNKni eritish uchun', 'Hujayra devorlarini buzish uchun'],
        ru: ['ДНК не растворяется в этаноле и выпадает в осадок', 'Чтобы убить бактерии', 'Чтобы растворить ДНК', 'Чтобы разрушить клеточные стенки'],
      },
      correctIndex: 0,
      explanation: {
        en: 'DNA dissolves in water but not in ethanol. Where the two layers meet it comes out of solution; cold ethanol makes this more complete.',
        uz: 'DNK suvda eriydi, lekin etanolda erimaydi. Ikki qatlam uchrashgan joyda u eritmadan chiqadi; sovuq etanol buni toʻliqroq qiladi.',
        ru: 'ДНК растворяется в воде, но не в этаноле. На границе слоёв она выходит из раствора; холодный этанол делает осаждение полнее.',
      },
    },
    {
      id: 'purity',
      question: {
        en: 'A DNA sample has A260/A280 = 1.4. What does this suggest?',
        uz: 'DNK namunasida A260/A280 = 1,4. Bu nimani bildiradi?',
        ru: 'У образца ДНК A260/A280 = 1,4. О чём это говорит?',
      },
      options: {
        en: ['Very pure DNA', 'The sample contains no DNA', 'It is contaminated with protein', 'The DNA has been copied by PCR'],
        uz: ['Juda toza DNK', 'Namunada DNK yoʻq', 'Oqsil bilan ifloslangan', 'DNK PZR bilan koʻchirilgan'],
        ru: ['Очень чистая ДНК', 'В образце нет ДНК', 'Он загрязнён белком', 'ДНК скопирована с помощью ПЦР'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Pure DNA gives about 1.8. Proteins absorb strongly at 280 nm, so protein contamination lowers the ratio.',
        uz: 'Toza DNKda nisbat taxminan 1,8. Oqsillar 280 nm da kuchli yutadi, shuning uchun oqsil aralashmasi nisbatni pasaytiradi.',
        ru: 'Чистая ДНК даёт около 1,8. Белки сильно поглощают при 280 нм, поэтому примесь белка снижает отношение.',
      },
    },
    {
      id: 'visible',
      question: {
        en: 'What does the extracted DNA look like in the ethanol layer?',
        uz: 'Ajratilgan DNK etanol qatlamida qanday koʻrinadi?',
        ru: 'Как выглядит выделенная ДНК в слое этанола?',
      },
      options: {
        en: ['A red liquid', 'A double helix you can see with the naked eye', 'Tiny blue crystals', 'White, stringy strands that can be wound onto a rod'],
        uz: ['Qizil suyuqlik', 'Oddiy koʻz bilan koʻrinadigan qoʻsh spiral', 'Mayda koʻk kristallar', 'Tayoqchaga oʻrash mumkin boʻlgan oq, ipsimon tolalar'],
        ru: ['Красная жидкость', 'Двойная спираль, видимая невооружённым глазом', 'Мелкие синие кристаллы', 'Белые нити, которые можно намотать на палочку'],
      },
      correctIndex: 3,
      explanation: {
        en: 'A single DNA molecule is far too thin to see. Millions of them clump together into white strands, which are spooled onto a glass rod.',
        uz: 'Bitta DNK molekulasi koʻrish uchun juda ingichka. Millionlab molekulalar oq tolalarga toʻplanadi va ular shisha tayoqchaga oʻraladi.',
        ru: 'Отдельная молекула ДНК слишком тонкая, чтобы её увидеть. Миллионы молекул слипаются в белые нити, которые наматывают на стеклянную палочку.',
      },
    },
    {
      id: 'source',
      question: {
        en: 'Why are strawberries a popular source for classroom DNA extraction?',
        uz: 'Nega qulupnay maktabda DNK ajratish uchun mashhur manba?',
        ru: 'Почему клубника — популярный материал для выделения ДНК на уроке?',
      },
      options: {
        en: ['They have no cell walls', 'They are soft and octoploid (eight copies of each chromosome), so they give a lot of DNA', 'Their DNA is already outside the cells', 'They contain no proteins'],
        uz: ['Ularda hujayra devori yoʻq', 'Ular yumshoq va oktaploid (har xromosomaning sakkiz nusxasi), shuning uchun koʻp DNK beradi', 'Ularning DNKsi allaqachon hujayradan tashqarida', 'Ularda oqsil yoʻq'],
        ru: ['У них нет клеточных стенок', 'Они мягкие и октоплоидные (восемь копий каждой хромосомы), поэтому дают много ДНК', 'Их ДНК уже находится вне клеток', 'В них нет белков'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Ripe strawberries are easy to mash and each cell holds eight sets of chromosomes, so the yield is large enough to see. Cheek cells give much less.',
        uz: 'Pishgan qulupnayni ezish oson va har bir hujayrada sakkiz toʻplam xromosoma bor, shuning uchun unum koʻrinadigan darajada katta. Lunj hujayralari ancha kam beradi.',
        ru: 'Спелую клубнику легко растереть, а в каждой клетке восемь наборов хромосом, поэтому выход достаточен, чтобы его увидеть. Клетки щеки дают гораздо меньше.',
      },
    },
  ],
  pcr: [
    {
      id: 'steps',
      question: {
        en: 'What is the correct order of the three steps in each PCR cycle?',
        uz: 'Har bir PZR siklidagi uch qadamning toʻgʻri tartibi qanday?',
        ru: 'Каков правильный порядок трёх этапов каждого цикла ПЦР?',
      },
      options: {
        en: ['Annealing → extension → denaturation', 'Extension → denaturation → annealing', 'Denaturation → annealing → extension', 'Denaturation → extension → annealing'],
        uz: ['Gibridlanish → uzaytirish → denaturatsiya', 'Uzaytirish → denaturatsiya → gibridlanish', 'Denaturatsiya → gibridlanish → uzaytirish', 'Denaturatsiya → uzaytirish → gibridlanish'],
        ru: ['Отжиг → элонгация → денатурация', 'Элонгация → денатурация → отжиг', 'Денатурация → отжиг → элонгация', 'Денатурация → элонгация → отжиг'],
      },
      correctIndex: 2,
      explanation: {
        en: 'First ~95 °C separates the strands, then ~50–65 °C lets the primers bind, then at 72 °C the polymerase extends them.',
        uz: 'Avval ~95 °C zanjirlarni ajratadi, soʻng ~50–65 °C da praymerlar bogʻlanadi, keyin 72 °C da polimeraza ularni uzaytiradi.',
        ru: 'Сначала ~95 °C разделяет цепи, затем при ~50–65 °C связываются праймеры, а при 72 °C полимераза их удлиняет.',
      },
    },
    {
      id: 'taq',
      question: {
        en: 'Why is Taq polymerase used in PCR instead of a polymerase from E. coli?',
        uz: 'Nega PZRda E. coli polimerazasi oʻrniga Taq polimeraza ishlatiladi?',
        ru: 'Почему в ПЦР используют Taq-полимеразу, а не полимеразу E. coli?',
      },
      options: {
        en: ['It is heat-stable and survives the 95 °C steps', 'It works without primers', 'It is cheaper to buy', 'It copies RNA'],
        uz: ['U issiqqa chidamli va 95 °C qadamlarga bardosh beradi', 'U praymersiz ishlaydi', 'Uni sotib olish arzonroq', 'U RNKni koʻchiradi'],
        ru: ['Она термостабильна и выдерживает этапы при 95 °C', 'Она работает без праймеров', 'Она дешевле', 'Она копирует РНК'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Taq comes from a bacterium living in hot springs. Ordinary enzymes are destroyed in the first denaturation step.',
        uz: 'Taq issiq buloqlarda yashovchi bakteriyadan olinadi. Oddiy fermentlar birinchi denaturatsiyadayoq buziladi.',
        ru: 'Taq получена из бактерии горячих источников. Обычные ферменты разрушаются уже на первой денатурации.',
      },
    },
    {
      id: 'doubling',
      question: {
        en: 'You start with 100 copies of the target. With perfect efficiency, how many copies are there after 10 cycles?',
        uz: 'Nishonning 100 ta nusxasidan boshladingiz. Mukammal samaradorlikda 10 sikldan keyin nechta nusxa boʻladi?',
        ru: 'Вы начали со 100 копий мишени. Сколько копий будет после 10 циклов при идеальной эффективности?',
      },
      options: {
        en: ['1 000', '2 000', '20 000', 'About 102 400'],
        uz: ['1 000', '2 000', '20 000', 'Taxminan 102 400'],
        ru: ['1 000', '2 000', '20 000', 'Около 102 400'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The copies double every cycle: N = N₀ · 2ⁿ = 100 · 2¹⁰ = 100 · 1024 = 102 400.',
        uz: 'Nusxalar har siklda ikki baravar oshadi: N = N₀ · 2ⁿ = 100 · 2¹⁰ = 100 · 1024 = 102 400.',
        ru: 'Число копий удваивается каждый цикл: N = N₀ · 2ⁿ = 100 · 2¹⁰ = 100 · 1024 = 102 400.',
      },
    },
    {
      id: 'primers',
      question: {
        en: 'What decides which part of the DNA is copied in PCR?',
        uz: 'PZRda DNKning qaysi qismi koʻchirilishini nima belgilaydi?',
        ru: 'Что определяет, какой участок ДНК копируется в ПЦР?',
      },
      options: {
        en: ['The temperature of the denaturation step', 'The two primers, which bind either end of the target', 'The amount of dNTPs', 'The number of cycles'],
        uz: ['Denaturatsiya qadamining harorati', 'Nishonning ikki uchiga bogʻlanadigan ikki praymer', 'dNTP lar miqdori', 'Sikllar soni'],
        ru: ['Температура денатурации', 'Два праймера, которые связываются с концами мишени', 'Количество dNTP', 'Число циклов'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Primers are short single strands that match the two ends of the target. The polymerase can only start from a primer, so only the region between them is amplified.',
        uz: 'Praymerlar nishonning ikki uchiga mos keladigan qisqa bir zanjirli boʻlaklar. Polimeraza faqat praymerdan boshlay oladi, shuning uchun faqat ular orasidagi qism koʻpaytiriladi.',
        ru: 'Праймеры — короткие одноцепочечные фрагменты, комплементарные концам мишени. Полимераза может начать только с праймера, поэтому амплифицируется лишь участок между ними.',
      },
    },
    {
      id: 'gel',
      question: {
        en: 'Your primers should copy a 720 bp fragment. How do you check the PCR product?',
        uz: 'Praymerlaringiz 720 bp boʻlakni koʻchirishi kerak. PZR mahsulotini qanday tekshirasiz?',
        ru: 'Ваши праймеры должны скопировать фрагмент 720 п. н. Как проверить продукт ПЦР?',
      },
      options: {
        en: ['Measure its temperature', 'Look at it under a light microscope', 'Run it on a gel next to a ladder and look for a band at 720 bp', 'Add ethanol and spool it'],
        uz: ['Haroratini oʻlchash', 'Yorugʻlik mikroskopida koʻrish', 'Marker yonida gelda yuritib, 720 bp dagi chiziqni izlash', 'Etanol qoʻshib, tayoqchaga oʻrash'],
        ru: ['Измерить его температуру', 'Посмотреть в световой микроскоп', 'Провести электрофорез рядом с маркером и найти полосу на 720 п. н.', 'Добавить этанол и намотать'],
      },
      correctIndex: 2,
      explanation: {
        en: 'Gel electrophoresis separates DNA by size. A single band level with the 700 bp ladder band shows the right fragment was copied.',
        uz: 'Gel elektroforez DNKni oʻlchami boʻyicha ajratadi. Markerning 700 bp chizigʻi bilan bir darajadagi bitta chiziq toʻgʻri boʻlak koʻchirilganini koʻrsatadi.',
        ru: 'Гель-электрофорез разделяет ДНК по размеру. Одна полоса на уровне полосы маркера 700 п. н. показывает, что скопирован нужный фрагмент.',
      },
    },
  ],
  'gel-electrophoresis': [
    {
      id: 'anode',
      question: {
        en: 'Toward which electrode does DNA move in gel electrophoresis, and why?',
        uz: 'Gel elektroforezda DNK qaysi elektrod tomon harakatlanadi va nega?',
        ru: 'К какому электроду движется ДНК при гель-электрофорезе и почему?',
      },
      options: {
        en: ['The negative electrode, because DNA is positive', 'The positive electrode, because its phosphate backbone is negative', 'Neither, it only spreads by diffusion', 'Whichever electrode is closer'],
        uz: ['Manfiy elektrod tomon, chunki DNK musbat', 'Musbat elektrod tomon, chunki uning fosfat skeleti manfiy', 'Hech biriga, u faqat diffuziya bilan tarqaladi', 'Qaysi elektrod yaqin boʻlsa, oʻsha tomon'],
        ru: ['К отрицательному, потому что ДНК заряжена положительно', 'К положительному, потому что её фосфатный остов заряжен отрицательно', 'Ни к какому, она только диффундирует', 'К тому, который ближе'],
      },
      correctIndex: 1,
      explanation: {
        en: 'Each phosphate group carries a negative charge, so DNA is pulled toward the anode (+). That is why the wells are placed at the negative end.',
        uz: 'Har bir fosfat guruhi manfiy zaryadga ega, shuning uchun DNK anod (+) tomon tortiladi. Shu sababli quduqlar manfiy uchiga joylashtiriladi.',
        ru: 'Каждая фосфатная группа несёт отрицательный заряд, поэтому ДНК притягивается к аноду (+). Поэтому лунки располагают у отрицательного конца.',
      },
    },
    {
      id: 'size',
      question: {
        en: 'Which fragment travels furthest from the well in the same time?',
        uz: 'Bir xil vaqtda qaysi boʻlak quduqdan eng uzoqqa boradi?',
        ru: 'Какой фрагмент за одно и то же время уйдёт дальше всего от лунки?',
      },
      options: {
        en: ['250 bp', '1 800 bp', '3 000 bp', 'They all travel the same distance'],
        uz: ['250 bp', '1 800 bp', '3 000 bp', 'Hammasi bir xil masofani bosadi'],
        ru: ['250 п. н.', '1 800 п. н.', '3 000 п. н.', 'Все проходят одинаковое расстояние'],
      },
      correctIndex: 0,
      explanation: {
        en: 'Smaller fragments slip through the pores of the gel more easily, so they migrate faster and further.',
        uz: 'Kichik boʻlaklar gel gʻovaklaridan osonroq oʻtadi, shuning uchun tezroq va uzoqroq boradi.',
        ru: 'Мелкие фрагменты легче проходят через поры геля, поэтому движутся быстрее и уходят дальше.',
      },
    },
    {
      id: 'ladder',
      question: {
        en: 'What is the DNA ladder used for?',
        uz: 'DNK markeri nima uchun ishlatiladi?',
        ru: 'Для чего нужен ДНК-маркер?',
      },
      options: {
        en: ['To make the DNA move faster', 'To stain the DNA', 'To estimate the size of unknown fragments from a standard curve', 'To stop the gel from melting'],
        uz: ['DNKni tezroq harakatlantirish uchun', 'DNKni boʻyash uchun', 'Standart egri chiziq orqali nomaʼlum boʻlaklar oʻlchamini aniqlash uchun', 'Gel erib ketmasligi uchun'],
        ru: ['Чтобы ДНК двигалась быстрее', 'Чтобы окрасить ДНК', 'Чтобы по калибровочной кривой оценить размер неизвестных фрагментов', 'Чтобы гель не расплавился'],
      },
      correctIndex: 2,
      explanation: {
        en: 'The ladder contains fragments of known sizes. Plotting log(distance) against log(size) gives a line from which an unknown band’s size can be read.',
        uz: 'Markerda oʻlchami maʼlum boʻlaklar bor. log(masofa) ni log(oʻlcham) ga qarab chizish chiziq beradi va undan nomaʼlum chiziq oʻlchamini oʻqish mumkin.',
        ru: 'В маркере фрагменты известных размеров. График log(расстояние) от log(размер) даёт прямую, по которой определяют размер неизвестной полосы.',
      },
    },
    {
      id: 'agarose',
      question: {
        en: 'What does the agarose gel do in electrophoresis?',
        uz: 'Elektroforezda agaroza geli qanday vazifani bajaradi?',
        ru: 'Какую роль играет агарозный гель при электрофорезе?',
      },
      options: {
        en: ['It gives the DNA its charge', 'It forms a mesh of pores that slows long fragments more than short ones', 'It copies the DNA', 'It makes the DNA glow'],
        uz: ['DNKga zaryad beradi', 'Uzun boʻlaklarni qisqalariga qaraganda koʻproq sekinlatadigan gʻovakli toʻr hosil qiladi', 'DNKni koʻchiradi', 'DNKni nurlantiradi'],
        ru: ['Придаёт ДНК заряд', 'Образует пористую сетку, которая тормозит длинные фрагменты сильнее коротких', 'Копирует ДНК', 'Заставляет ДНК светиться'],
      },
      correctIndex: 1,
      explanation: {
        en: 'In free solution all DNA moves at almost the same speed. The agarose mesh acts as a sieve; a higher percentage makes smaller pores.',
        uz: 'Erkin eritmada barcha DNK deyarli bir xil tezlikda harakatlanadi. Agaroza toʻri elak vazifasini bajaradi; foiz yuqoriroq boʻlsa, gʻovaklar kichikroq.',
        ru: 'В свободном растворе вся ДНК движется почти с одинаковой скоростью. Агарозная сетка работает как сито; чем выше процент, тем мельче поры.',
      },
    },
    {
      id: 'stain',
      question: {
        en: 'How are the DNA bands made visible after the run?',
        uz: 'Jarayondan keyin DNK chiziqlari qanday koʻrinadigan qilinadi?',
        ru: 'Как сделать полосы ДНК видимыми после электрофореза?',
      },
      options: {
        en: ['They are visible without any treatment', 'By heating the gel', 'By adding ethanol', 'With a stain such as ethidium bromide or a safe stain that glows under UV light'],
        uz: ['Ular hech qanday ishlovsiz koʻrinadi', 'Gelni qizdirib', 'Etanol qoʻshib', 'UB nurda nurlanadigan etidiy bromid yoki xavfsiz boʻyoq yordamida'],
        ru: ['Они видны без обработки', 'Нагреванием геля', 'Добавлением этанола', 'Красителем, например бромистым этидием или безопасным аналогом, который светится в УФ-свете'],
      },
      correctIndex: 3,
      explanation: {
        en: 'The stain binds between DNA bases and fluoresces under a UV transilluminator. The blue loading dye only shows how far the run has gone.',
        uz: 'Boʻyoq DNK asoslari orasiga bogʻlanadi va UB transilluminatorda nurlanadi. Koʻk yuklash boʻyogʻi faqat jarayon qancha borganini koʻrsatadi.',
        ru: 'Краситель встраивается между основаниями ДНК и флуоресцирует на УФ-трансиллюминаторе. Синий краситель для нанесения лишь показывает, как далеко прошёл электрофорез.',
      },
    },
  ],
}

export const hasQuiz = (experimentId: string) => (QUIZZES[experimentId]?.length ?? 0) > 0

function resolveLanguage(lang: string): QuizLanguage {
  const base = lang.split('-')[0]
  return (QUIZ_LANGUAGES as readonly string[]).includes(base) ? (base as QuizLanguage) : 'en'
}

/** Questions for one experiment in one language, or `null` when the experiment has no quiz. */
export function getQuiz(experimentId: string, lang: string): QuizQuestion[] | null {
  const source = QUIZZES[experimentId]
  if (!source?.length) return null
  const l = resolveLanguage(lang)
  return source.map((q) => ({
    id: q.id,
    question: q.question[l],
    options: q.options[l],
    correctIndex: q.correctIndex,
    explanation: q.explanation[l],
  }))
}
