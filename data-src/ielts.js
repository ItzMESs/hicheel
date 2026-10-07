/* IELTS / CEFR A1–C1 англи хэл.
   Үг бүр: [үг, үгсийн аймаг, монгол, жишээ өгүүлбэр] */
window.IELTS = {
  name: "IELTS англи хэл",
  levels: ["A1", "A2", "B1", "B2", "C1"],
  info: {
    "A1": { band: "1.0 – 2.5", desc: "Анхан шат. Өөрийгөө танилцуулах, энгийн асуулт асууж хариулах." },
    "A2": { band: "3.0 – 3.5", desc: "Суурь шат. Өдөр тутмын энгийн нөхцөлд харилцах." },
    "B1": { band: "4.0 – 5.0", desc: "Дунд шат. Аялал, ажил, сургуулийн танил сэдвээр харилцах." },
    "B2": { band: "5.5 – 6.5", desc: "Дундаас дээш. Нарийн сэдвээр санаагаа тодорхой илэрхийлэх. Ихэнх их сургуулийн шаардлага." },
    "C1": { band: "7.0 – 8.0", desc: "Ахисан шат. Эрдэм шинжилгээ, мэргэжлийн орчинд чөлөөтэй хэрэглэх." }
  },
  words: {
    "A1": [
      ["apple", "n.", "алим", "I eat an apple every day."],
      ["book", "n.", "ном", "This is my favourite book."],
      ["brother", "n.", "ах, дүү (эрэгтэй)", "My brother is ten years old."],
      ["cat", "n.", "муур", "The cat is sleeping."],
      ["city", "n.", "хот", "Ulaanbaatar is a big city."],
      ["cold", "adj.", "хүйтэн", "It is cold in winter."],
      ["drink", "v.", "уух", "I drink milk in the morning."],
      ["family", "n.", "гэр бүл", "I love my family."],
      ["friend", "n.", "найз", "She is my best friend."],
      ["happy", "adj.", "баяртай", "I am very happy today."],
      ["house", "n.", "байшин", "Their house is near the school."],
      ["learn", "v.", "сурах", "I learn English at school."],
      ["morning", "n.", "өглөө", "Good morning, teacher!"],
      ["name", "n.", "нэр", "What is your name?"],
      ["play", "v.", "тоглох", "Children play in the park."],
      ["school", "n.", "сургууль", "I go to school by bus."],
      ["teacher", "n.", "багш", "Our teacher is kind."],
      ["water", "n.", "ус", "Can I have some water, please?"],
      ["work", "v.", "ажиллах", "My father works in a bank."],
      ["yesterday", "adv.", "өчигдөр", "I was at home yesterday."]
    ],
    "A2": [
      ["borrow", "v.", "зээлж авах", "Can I borrow your pen?"],
      ["cheap", "adj.", "хямд", "This shirt is very cheap."],
      ["dangerous", "adj.", "аюултай", "It is dangerous to swim here."],
      ["decide", "v.", "шийдэх", "We decided to stay at home."],
      ["expensive", "adj.", "үнэтэй", "That car is too expensive."],
      ["forget", "v.", "мартах", "Don't forget your keys."],
      ["healthy", "adj.", "эрүүл", "Vegetables are healthy."],
      ["holiday", "n.", "амралт", "We went to the lake on holiday."],
      ["invite", "v.", "урих", "She invited me to her party."],
      ["journey", "n.", "аялал, зам", "The journey took five hours."],
      ["luggage", "n.", "ачаа тээш", "Please check your luggage."],
      ["noisy", "adj.", "чимээ шуугиантай", "The street is very noisy."],
      ["prefer", "v.", "илүүд үзэх", "I prefer tea to coffee."],
      ["quiet", "adj.", "нам гүм", "The library is quiet."],
      ["remember", "v.", "санах", "I remember my first day at school."],
      ["sometimes", "adv.", "заримдаа", "I sometimes walk to work."],
      ["ticket", "n.", "тасалбар", "I bought a train ticket."],
      ["weather", "n.", "цаг агаар", "The weather is nice today."],
      ["worried", "adj.", "санаа зовсон", "She is worried about the exam."],
      ["neighbour", "n.", "хөрш", "Our neighbour has a big dog."]
    ],
    "B1": [
      ["achieve", "v.", "хүрэх, биелүүлэх", "She achieved her goal."],
      ["advantage", "n.", "давуу тал", "Living in a city has many advantages."],
      ["afford", "v.", "төлөх чадалтай байх", "I can't afford a new phone."],
      ["available", "adj.", "боломжтой, бэлэн", "Is this room available?"],
      ["career", "n.", "карьер, мэргэжлийн зам", "He wants a career in medicine."],
      ["challenge", "n.", "сорилт", "Learning Chinese is a challenge."],
      ["community", "n.", "олон нийт", "The community built a new park."],
      ["convenient", "adj.", "тохиромжтой", "Online shopping is convenient."],
      ["environment", "n.", "байгаль орчин", "We must protect the environment."],
      ["experience", "n.", "туршлага", "Do you have any work experience?"],
      ["improve", "v.", "сайжруулах", "I want to improve my English."],
      ["opinion", "n.", "санал бодол", "In my opinion, it's a good idea."],
      ["pollution", "n.", "бохирдол", "Air pollution is a big problem in winter."],
      ["reduce", "v.", "бууруулах", "We should reduce plastic waste."],
      ["solution", "n.", "шийдэл", "We need to find a solution."],
      ["technology", "n.", "технологи", "Technology changes our lives."],
      ["traditional", "adj.", "уламжлалт", "Tsagaan Sar is a traditional holiday."],
      ["unemployment", "n.", "ажилгүйдэл", "Unemployment has fallen this year."],
      ["volunteer", "n./v.", "сайн дурын ажилтан", "She volunteers at a hospital."],
      ["benefit", "n.", "ашиг тус", "Exercise has many health benefits."]
    ],
    "B2": [
      ["accommodate", "v.", "багтаах, байрлуулах", "The hotel can accommodate 200 guests."],
      ["affordable", "adj.", "боломжийн үнэтэй", "We need more affordable housing."],
      ["approach", "n./v.", "арга барил; ойртох", "We need a new approach to the problem."],
      ["consequence", "n.", "үр дагавар", "Climate change has serious consequences."],
      ["contribute", "v.", "хувь нэмэр оруулах", "Everyone can contribute to society."],
      ["controversial", "adj.", "маргаантай", "It is a controversial topic."],
      ["crucial", "adj.", "нэн чухал", "Sleep is crucial for good health."],
      ["decline", "v./n.", "буурах; уналт", "Sales declined sharply in 2020."],
      ["emphasise", "v.", "онцлох", "The report emphasises the need for change."],
      ["essential", "adj.", "зайлшгүй шаардлагатай", "Water is essential for life."],
      ["fluctuate", "v.", "хэлбэлзэх", "Prices fluctuated throughout the year."],
      ["globalisation", "n.", "даяаршил", "Globalisation has changed the economy."],
      ["implement", "v.", "хэрэгжүүлэх", "The government implemented a new policy."],
      ["significant", "adj.", "мэдэгдэхүйц, чухал", "There was a significant increase in sales."],
      ["sustainable", "adj.", "тогтвортой", "We need sustainable energy sources."],
      ["urbanisation", "n.", "хотжилт", "Urbanisation is increasing rapidly."],
      ["whereas", "conj.", "харин", "Some people prefer cities, whereas others like the countryside."],
      ["drawback", "n.", "сул тал", "The main drawback is the cost."],
      ["overcome", "v.", "даван туулах", "She overcame many difficulties."],
      ["prohibit", "v.", "хориглох", "Smoking is prohibited here."]
    ],
    "C1": [
      ["albeit", "conj.", "хэдийгээр ... ч", "It was a successful, albeit expensive, project."],
      ["alleviate", "v.", "хөнгөвчлөх", "The new road will alleviate traffic congestion."],
      ["ambiguous", "adj.", "хоёрдмол утгатай", "The question was ambiguous."],
      ["coherent", "adj.", "уялдаатай", "Your essay should be clear and coherent."],
      ["comprehensive", "adj.", "иж бүрэн", "The report gives a comprehensive overview."],
      ["detrimental", "adj.", "хортой", "Stress can be detrimental to health."],
      ["exacerbate", "v.", "улам дордуулах", "Poverty can exacerbate health problems."],
      ["feasible", "adj.", "хэрэгжих боломжтой", "Is this plan financially feasible?"],
      ["inevitable", "adj.", "зайлшгүй", "Change is inevitable."],
      ["mitigate", "v.", "сааруулах", "Trees help mitigate the effects of pollution."],
      ["notwithstanding", "prep.", "үл харгалзан", "Notwithstanding the cost, the project went ahead."],
      ["paramount", "adj.", "хамгийн чухал", "Safety is of paramount importance."],
      ["pervasive", "adj.", "өргөн тархсан", "Social media has a pervasive influence."],
      ["proliferation", "n.", "хурдацтай олшрол", "the proliferation of smartphones"],
      ["scrutinise", "v.", "нягтлан шалгах", "The data was carefully scrutinised."],
      ["substantial", "adj.", "их хэмжээний", "There is substantial evidence for this."],
      ["undermine", "v.", "сулруулах, гутаах", "Corruption undermines public trust."],
      ["unprecedented", "adj.", "урьд өмнө байгаагүй", "The pandemic caused unprecedented disruption."],
      ["viable", "adj.", "амьдрах чадвартай, бодитой", "Solar power is a viable alternative."],
      ["nuance", "n.", "нарийн ялгаа", "Translators must understand every nuance."]
    ]
  },
  // [англи, монгол]
  sentences: {
    "A1": [
      ["My name is Bat. I am from Mongolia.", "Намайг Бат гэдэг. Би Монголоос ирсэн."],
      ["I have two brothers and one sister.", "Би хоёр ах дүү, нэг эгч дүүтэй."],
      ["She drinks tea every morning.", "Тэр өглөө бүр цай уудаг."],
      ["Where is the bus station?", "Автобусны буудал хаана байдаг вэ?"],
      ["It is very cold today.", "Өнөөдөр маш хүйтэн байна."],
      ["I like reading books.", "Би ном унших дуртай."]
    ],
    "A2": [
      ["I went to the cinema last weekend.", "Би өнгөрсөн амралтын өдөр кино театр явсан."],
      ["This bag is cheaper than that one.", "Энэ цүнх тэрнээс хямд."],
      ["We are going to visit our grandparents.", "Бид өвөө эмээ дээрээ очих гэж байна."],
      ["Could you help me with my luggage?", "Ачаа тээшинд минь туслаж өгөхгүй юу?"],
      ["I was worried about the test.", "Би шалгалтын талаар санаа зовж байсан."],
      ["How long does the journey take?", "Аялал хэр удаан үргэлжлэх вэ?"]
    ],
    "B1": [
      ["I have lived in Ulaanbaatar for five years.", "Би Улаанбаатарт таван жил амьдарч байна."],
      ["If it rains tomorrow, we will stay at home.", "Маргааш бороо орвол бид гэртээ байна."],
      ["The bridge was built in 1990.", "Энэ гүүрийг 1990 онд барьсан."],
      ["In my opinion, technology makes life easier.", "Миний бодлоор технологи амьдралыг хялбар болгодог."],
      ["We should reduce air pollution in winter.", "Бид өвлийн агаарын бохирдлыг бууруулах ёстой."],
      ["I'd like to improve my speaking skills.", "Би ярих чадвараа сайжруулмаар байна."]
    ],
    "B2": [
      ["If I had studied harder, I would have passed the exam.", "Хэрэв би илүү хичээсэн бол шалгалтад тэнцэх байсан."],
      ["She said that she was moving to London.", "Тэр Лондон руу нүүх гэж байгаа гэж хэлсэн."],
      ["The number of tourists increased significantly.", "Жуулчдын тоо мэдэгдэхүйц өссөн."],
      ["Some people prefer cities, whereas others prefer the countryside.", "Зарим хүмүүс хотыг, харин бусад нь хөдөөг илүүд үздэг."],
      ["Sustainable energy is essential for the future.", "Тогтвортой эрчим хүч ирээдүйд зайлшгүй шаардлагатай."],
      ["The man who lives next door is a doctor.", "Хажуу айлд амьдардаг эрэгтэй эмч хүн."]
    ],
    "C1": [
      ["Not only did she pass the exam, but she also got the highest score.", "Тэр шалгалтад тэнцээд зогсохгүй хамгийн өндөр оноо авсан."],
      ["Rarely have I seen such an impressive performance.", "Би ийм гайхалтай тоглолтыг ховорхон үзсэн."],
      ["What concerns me most is the lack of funding.", "Намайг хамгийн их санаа зовоож байгаа зүйл бол санхүүжилтийн дутагдал."],
      ["Had I known about the problem, I would have helped.", "Асуудлын талаар мэдсэн бол би туслах байсан."],
      ["The policy, albeit controversial, has reduced crime.", "Энэ бодлого маргаантай ч гэмт хэргийг бууруулсан."],
      ["Urgent measures are needed to mitigate climate change.", "Уур амьсгалын өөрчлөлтийг сааруулахад яаралтай арга хэмжээ шаардлагатай."]
    ]
  },
  grammar: {
    "A1": [
      {
        title: "To be: am / is / are",
        explain: "«Байх» үйл үг. I → am, he/she/it → is, you/we/they → are. Үгүйсгэл: am not, isn't, aren't. Асуулт: Are you...? Is he...?",
        examples: [["I am a student.", "Би оюутан."], ["They are not at home.", "Тэд гэртээ байхгүй."]],
        quiz: [
          { q: "She ___ my sister.", o: ["am", "is", "are", "be"], a: 1 },
          { q: "We ___ from Mongolia.", o: ["is", "am", "are", "be"], a: 2 }
        ]
      },
      {
        title: "Present Simple — Энгийн одоо цаг",
        explain: "Байнгын үйл, зуршил. he/she/it-д үйл үгэнд -s/-es залгана. Үгүйсгэл: don't/doesn't + үйл үг. Асуулт: Do/Does ... ?",
        examples: [["He plays football every day.", "Тэр өдөр бүр хөл бөмбөг тоглодог."], ["I don't like coffee.", "Би кофе дургүй."]],
        quiz: [
          { q: "My mother ___ in a hospital.", o: ["work", "works", "working", "is work"], a: 1 },
          { q: "___ you speak English?", o: ["Does", "Are", "Do", "Is"], a: 2 }
        ]
      },
      {
        title: "Articles: a / an / the",
        explain: "a — гийгүүлэгчээр эхэлсэн тоолж болох ганц тоо (a book), an — эгшиг авиагаар эхэлсэн (an apple, an hour). the — тодорхой, өмнө дурдсан зүйл.",
        examples: [["I have a dog. The dog is black.", "Би нохойтой. Тэр нохой хар."], ["She is an engineer.", "Тэр инженер."]],
        quiz: [
          { q: "I want ___ orange.", o: ["a", "an", "the", "—"], a: 1 }
        ]
      }
    ],
    "A2": [
      {
        title: "Past Simple — Энгийн өнгөрсөн цаг",
        explain: "Өнгөрсөнд дууссан үйл. Зөв үйл үгэнд -ed (worked), буруу үйл үг (went, saw, ate). Үгүйсгэл/асуулт: didn't / Did + үндсэн хэлбэр.",
        examples: [["I visited my aunt yesterday.", "Би өчигдөр нагац эгч дээрээ очсон."], ["Did you see the film?", "Чи тэр киног үзсэн үү?"]],
        quiz: [
          { q: "We ___ to the museum last Sunday.", o: ["go", "goes", "went", "gone"], a: 2 },
          { q: "She didn't ___ the email.", o: ["read", "reads", "reading", "readed"], a: 0 }
        ]
      },
      {
        title: "Comparatives & Superlatives — Харьцуулах зэрэг",
        explain: "Богино тэмдэг нэр: -er / -est (tall → taller → the tallest). Урт: more / the most (more expensive). Онцгой: good → better → best, bad → worse → worst.",
        examples: [["Tokyo is bigger than Ulaanbaatar.", "Токио Улаанбаатараас том."], ["This is the most beautiful place.", "Энэ бол хамгийн үзэсгэлэнтэй газар."]],
        quiz: [
          { q: "My test score was ___ than yours.", o: ["good", "better", "best", "more good"], a: 1 }
        ]
      },
      {
        title: "Going to — Төлөвлөсөн ирээдүй",
        explain: "Төлөвлөгөө, нотолгоонд суурилсан таамаглал: am/is/are + going to + үйл үг.",
        examples: [["I'm going to study in Korea.", "Би Солонгост суралцах гэж байна."], ["Look at the clouds! It's going to rain.", "Үүл хар! Бороо орох нь."]],
        quiz: [
          { q: "They ___ going to buy a new car.", o: ["is", "am", "are", "be"], a: 2 }
        ]
      }
    ],
    "B1": [
      {
        title: "Present Perfect — Төгс одоо цаг",
        explain: "have/has + V3. Өнгөрсөнд эхэлж одоо хүртэл үргэлжилж буй, эсвэл туршлага, үр дүн одоо мэдэгдэж буй үйл. for (хугацаа), since (эхлэх цэг)-тэй хэрэглэнэ.",
        examples: [["I have lived here since 2015.", "Би 2015 оноос хойш энд амьдарч байна."], ["Have you ever been to China?", "Чи Хятадад очиж байсан уу?"]],
        quiz: [
          { q: "She ___ in this company for three years.", o: ["works", "has worked", "worked", "is working"], a: 1 },
          { q: "I have known him ___ 2010.", o: ["for", "since", "from", "at"], a: 1 }
        ]
      },
      {
        title: "First & Second Conditional — Нөхцөлт өгүүлбэр",
        explain: "1-р: бодит боломж — If + present, will + V. 2-р: бодит бус/төсөөлөл — If + past, would + V.",
        examples: [["If you study, you will pass.", "Хичээвэл тэнцэнэ."], ["If I were rich, I would travel the world.", "Хэрэв би баян байсан бол дэлхийгээр аялах байсан."]],
        quiz: [
          { q: "If it ___ tomorrow, we'll cancel the trip.", o: ["rains", "will rain", "rained", "rain"], a: 0 },
          { q: "If I ___ you, I would accept the offer.", o: ["am", "was being", "were", "will be"], a: 2 }
        ]
      },
      {
        title: "Passive Voice — Үйлдэгдэх хэв",
        explain: "be + V3. Үйлдэгч чухал биш эсвэл үл мэдэгдэх үед хэрэглэнэ. IELTS Writing Task 1-ийн процесс диаграмд маш чухал.",
        examples: [["English is spoken all over the world.", "Англи хэлээр дэлхий даяар ярьдаг."], ["The tea leaves are dried and packed.", "Цайны навчийг хатааж, савлана."]],
        quiz: [
          { q: "The letter ___ yesterday.", o: ["was sent", "sent", "is sending", "has send"], a: 0 }
        ]
      }
    ],
    "B2": [
      {
        title: "Third Conditional — Гуравдугаар нөхцөл",
        explain: "Өнгөрсөнд болоогүй зүйлийн төсөөлөл: If + had + V3, would have + V3.",
        examples: [["If we had left earlier, we wouldn't have missed the train.", "Эрт гарсан бол галт тэрэгнээс хоцрохгүй байсан."]],
        quiz: [
          { q: "If she had asked me, I ___ her.", o: ["would help", "will help", "would have helped", "helped"], a: 2 }
        ]
      },
      {
        title: "Reported Speech — Шууд бус яриа",
        explain: "Цагийг нэг алхам ухраана: am → was, will → would, have done → had done. Асуултад үгийн дараалал хүүрнэх хэлбэрт шилжинэ.",
        examples: [["He said, \"I am tired.\" → He said (that) he was tired.", "Тэр ядарсан гэж хэлсэн."], ["She asked where I lived.", "Тэр намайг хаана амьдардгийг асуусан."]],
        quiz: [
          { q: "\"I will call you.\" → She said she ___ call me.", o: ["will", "would", "can", "shall"], a: 1 },
          { q: "He asked me where ___.", o: ["did I work", "I worked", "do I work", "I work did"], a: 1 }
        ]
      },
      {
        title: "Relative Clauses — Тодотгол өгүүлбэр",
        explain: "who (хүн), which (юм), that (хоёуланд), whose (хамаатуулах), where (газар). Тодорхойлох бус тодотгол таслалаар тусгаарлагдах ба that хэрэглэхгүй.",
        examples: [["The woman who called you is my aunt.", "Чам руу залгасан эмэгтэй миний нагац эгч."], ["Darkhan, which is in the north, is a big city.", "Хойд хэсэгт байдаг Дархан бол том хот."]],
        quiz: [
          { q: "This is the house ___ I was born.", o: ["which", "who", "where", "whose"], a: 2 }
        ]
      }
    ],
    "C1": [
      {
        title: "Inversion — Урвуу дараалал",
        explain: "Never, Rarely, Seldom, Not only, Hardly ... when, No sooner ... than зэрэг сөрөг утгатай үгээр эхлэхэд туслах үйл үг эзэн үгийн өмнө ирнэ. Албан бичигт өндөр оноо авахад тусална.",
        examples: [["Never have I seen such a mess.", "Ийм эмх замбараагүй байдлыг би хэзээ ч харж байгаагүй."], ["No sooner had we arrived than it started to rain.", "Бид ирмэгц бороо орж эхэлсэн."]],
        quiz: [
          { q: "Not only ___ late, but he also forgot the documents.", o: ["he was", "was he", "he is", "did he was"], a: 1 },
          { q: "Seldom ___ such dedication.", o: ["we see", "do we see", "we do see", "see we"], a: 1 }
        ]
      },
      {
        title: "Cleft Sentences — Онцлох бүтэц",
        explain: "It is/was ... that/who ... эсвэл What ... is/was ... бүтцээр өгүүлбэрийн нэг хэсгийг онцолно.",
        examples: [["It was my sister who told me the news.", "Энэ мэдээг надад хэлсэн хүн бол миний эгч."], ["What I need is more time.", "Надад хэрэгтэй зүйл бол илүү их цаг."]],
        quiz: [
          { q: "___ I like most about Mongolia is its nature.", o: ["That", "Which", "What", "It"], a: 2 }
        ]
      },
      {
        title: "Mixed Conditionals — Холимог нөхцөл",
        explain: "Өнгөрсөн нөхцөл → одоогийн үр дүн: If + had + V3, would + V. Одоогийн нөхцөл → өнгөрсөн үр дүн: If + past, would have + V3.",
        examples: [["If I had taken the job, I would be rich now.", "Тэр ажлыг авсан бол одоо баян байх байсан."]],
        quiz: [
          { q: "If she had studied medicine, she ___ a doctor now.", o: ["would have been", "would be", "will be", "is"], a: 1 }
        ]
      }
    ]
  },
  // Түвшин бүрийн унших дасгал
  reading: {
    "A1": {
      title: "My Day",
      text: "My name is Saraa. I am twelve years old. I live in Ulaanbaatar with my family. Every morning I get up at seven o'clock. I eat breakfast and go to school by bus. My favourite subject is English. After school I play with my friends. In the evening I do my homework and watch TV.",
      questions: [
        { q: "How old is Saraa?", o: ["10", "12", "7", "20"], a: 1 },
        { q: "How does she go to school?", o: ["By car", "On foot", "By bus", "By bike"], a: 2 },
        { q: "What is her favourite subject?", o: ["Maths", "Music", "English", "Art"], a: 2 }
      ]
    },
    "A2": {
      title: "A Trip to Khuvsgul",
      text: "Last summer, my family went to Lake Khuvsgul. The journey was long — it took two days by car. We stayed in a ger near the lake. The water was very clean but too cold for swimming. We rode horses and went fishing. On the last day it rained, so we stayed inside and played cards. It was the best holiday of my life.",
      questions: [
        { q: "How long did the journey take?", o: ["Two hours", "One day", "Two days", "A week"], a: 2 },
        { q: "Why didn't they swim?", o: ["The water was dirty", "The water was too cold", "It was raining", "They were tired"], a: 1 },
        { q: "What did they do on the last day?", o: ["Went fishing", "Rode horses", "Played cards", "Went home"], a: 2 }
      ]
    },
    "B1": {
      title: "Working from Home",
      text: "Since 2020, many people have started working from home. There are several advantages. Workers save time and money because they don't need to travel to the office. Many also say they can concentrate better. However, there are disadvantages too. Some people feel lonely, and it can be difficult to separate work from private life. Experts believe that a mix of office and home working is the best solution for most companies.",
      questions: [
        { q: "What is one advantage of working from home?", o: ["Feeling lonely", "Saving travel time", "Meeting colleagues", "Longer hours"], a: 1 },
        { q: "What is a disadvantage mentioned?", o: ["Saving money", "Better concentration", "Separating work and private life", "Less travel"], a: 2 },
        { q: "What do experts recommend?", o: ["Only office work", "Only home work", "A mix of both", "Shorter weeks"], a: 2 }
      ]
    },
    "B2": {
      title: "The Rise of Urbanisation",
      text: "Over half of the world's population now lives in urban areas, and this figure is expected to rise to nearly 70 per cent by 2050. Urbanisation brings significant economic benefits, as cities concentrate jobs, education and healthcare. Nevertheless, rapid and unplanned growth can lead to overcrowding, traffic congestion and air pollution. In Mongolia, for instance, almost half of the population lives in the capital, which places enormous pressure on infrastructure. Sustainable urban planning is therefore crucial to ensure that cities remain liveable.",
      questions: [
        { q: "What percentage is expected to live in cities by 2050?", o: ["About 50%", "Nearly 70%", "Over 90%", "About 30%"], a: 1 },
        { q: "Which is NOT mentioned as a problem of rapid growth?", o: ["Traffic congestion", "Overcrowding", "Unemployment", "Air pollution"], a: 2 },
        { q: "According to the text, what is crucial?", o: ["Moving to the countryside", "Sustainable urban planning", "Building more roads", "Reducing population"], a: 1 }
      ]
    },
    "C1": {
      title: "Artificial Intelligence and Employment",
      text: "The proliferation of artificial intelligence has sparked a contentious debate about the future of work. Proponents argue that, much like previous technological revolutions, AI will ultimately generate more jobs than it eliminates, albeit in sectors that do not yet exist. Sceptics, however, contend that the pace of change is unprecedented, leaving insufficient time for workers to retrain. What seems inevitable is that routine cognitive tasks will be increasingly automated. Consequently, governments must invest substantially in lifelong learning if they are to mitigate the detrimental effects on vulnerable workers.",
      questions: [
        { q: "What do proponents of AI argue?", o: ["AI will destroy most jobs", "AI will create more jobs than it removes", "AI should be banned", "AI only affects factories"], a: 1 },
        { q: "What is the sceptics' main concern?", o: ["The cost of AI", "The speed of change", "Privacy", "Energy use"], a: 1 },
        { q: "The word 'mitigate' is closest in meaning to:", o: ["worsen", "ignore", "reduce", "measure"], a: 2 }
      ]
    }
  },
  tips: [
    { title: "Listening (30 мин)", text: "4 хэсэг, 40 асуулт. Бичлэгийг ганцхан удаа сонсгоно. Сонсохоос өмнө асуултаа уншиж, түлхүүр үгсийг тэмдэглээрэй. Үгийн хязгаарыг (NO MORE THAN TWO WORDS) анхаар." },
    { title: "Reading (60 мин)", text: "3 эх, 40 асуулт. Skimming (ерөнхий санаа) болон scanning (тодорхой мэдээлэл хайх) аргыг хэрэглэ. True / False / Not Given асуултад эхийн мэдээлэлд л тулгуурла." },
    { title: "Writing (60 мин)", text: "Task 1: график, диаграм тайлбарлах (150+ үг, 20 мин). Task 2: эсээ (250+ үг, 40 мин). Үнэлгээ: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy." },
    { title: "Speaking (11–14 мин)", text: "Part 1: өөрийн тухай асуулт. Part 2: картан дээрх сэдвээр 1–2 минут ярих (1 минут бэлтгэнэ). Part 3: гүнзгий хэлэлцүүлэг. Хариултаа жишээ, шалтгаанаар өргөжүүл." }
  ]
};

/* IELTS Writing & Speaking дадлага */
window.IELTS_PRACTICE = {
  writing: [
    { id: "t1-line", task: 1, minutes: 20, min: 150, title: "Line graph — Internet users",
      prompt: "The graph below shows the percentage of households with internet access in three countries (Mongolia, Japan and Brazil) between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      tips: ["Overview-д ерөнхий чиг хандлагыг (бүгд өссөн гэх мэт) заавал бич.", "Тоо баримтыг яг тодорхой дурд: rose from 5% to 70%.", "Өөрийн бодлыг бүү бич — зөвхөн өгөгдлийг тайлбарла."] },
    { id: "t1-process", task: 1, minutes: 20, min: 150, title: "Process — Making tea",
      prompt: "The diagram below shows the stages in the production of black tea, from picking the leaves to packaging. Summarise the information by selecting and reporting the main features.",
      tips: ["Процессыг Passive voice-оор тайлбарла: The leaves are picked...", "First, Next, After that, Finally гэх мэт дарааллын үг ашигла.", "Нийт хэдэн үе шаттайг overview-д дурд."] },
    { id: "t2-tech", task: 2, minutes: 40, min: 250, title: "Opinion — Technology and children",
      prompt: "Some people believe that children today spend too much time using smartphones and computers, and that this has a negative effect on their development. To what extent do you agree or disagree?",
      tips: ["Оршилд байр сууриа тодорхой илэрхийл.", "Биеийн 2 догол мөр, тус бүрт нэг гол санаа + жишээ.", "Дүгнэлтэд байр сууриа дахин сануул, шинэ санаа бүү нэм."] },
    { id: "t2-city", task: 2, minutes: 40, min: 250, title: "Discussion — City or countryside",
      prompt: "Some people prefer to live in a big city, while others prefer to live in the countryside. Discuss both views and give your own opinion.",
      tips: ["Хоёр талын үзлийг тус тусад нь догол мөрөөр бич.", "Өөрийн байр суурийг оршил ба дүгнэлтэд тодорхой хэл.", "whereas, on the other hand зэрэг харьцуулах үг ашигла."] },
    { id: "t2-pollution", task: 2, minutes: 40, min: 250, title: "Problem/Solution — Air pollution",
      prompt: "Air pollution is a serious problem in many cities around the world. What are the main causes of this problem, and what measures could be taken to solve it?",
      tips: ["Шалтгаан ба шийдлийг тус бүр нэг догол мөрөнд бич.", "Шийдэл бүрийг бодит жишээгээр баталгаажуул.", "should, could, it is essential that гэх мэт бүтэц хэрэглэ."] }
  ],
  criteria: ["Task Response / Achievement — асуултад бүрэн хариулсан уу?", "Coherence & Cohesion — догол мөр, холбоос үг", "Lexical Resource — үгийн баялаг, давталтгүй", "Grammatical Range & Accuracy — нийлмэл өгүүлбэр, алдаагүй"],
  linking: [
    ["Нэмэх", "Furthermore, Moreover, In addition, Not only... but also"],
    ["Эсрэгцүүлэх", "However, Nevertheless, On the other hand, Whereas, Although"],
    ["Шалтгаан/үр дагавар", "Therefore, As a result, Consequently, Due to, Owing to"],
    ["Жишээ", "For example, For instance, Such as, To illustrate"],
    ["Дүгнэх", "In conclusion, To sum up, Overall, All things considered"],
    ["Байр суурь", "In my opinion, I strongly believe that, From my perspective"]
  ],
  speaking: [
    { topic: "Home & Hometown",
      part1: ["Where is your hometown?", "What do you like most about your hometown?", "Do you live in a house or an apartment?", "Would you like to move to another place in the future?"],
      part2: { cue: "Describe a place in your country that you would recommend to visitors.", points: ["where it is", "how you know about it", "what people can do there", "and explain why you would recommend it"] },
      part3: ["Why do people like to travel to other countries?", "How does tourism affect local communities?", "Should governments spend more money on promoting tourism?"] },
    { topic: "Study & Work",
      part1: ["Do you work or are you a student?", "What subject do you enjoy the most?", "What do you usually do after class or work?", "Is it difficult to learn a foreign language?"],
      part2: { cue: "Describe a teacher who has influenced you.", points: ["who the teacher was", "what subject they taught", "what they were like", "and explain how they influenced you"] },
      part3: ["What makes a good teacher?", "Will online learning replace traditional classrooms?", "Should education be free for everyone?"] },
    { topic: "Technology",
      part1: ["How often do you use your phone?", "What apps do you use most?", "Did you use computers when you were a child?", "Do you think you spend too much time online?"],
      part2: { cue: "Describe a piece of technology that you find useful.", points: ["what it is", "when you started using it", "how you use it", "and explain why it is useful to you"] },
      part3: ["How has technology changed the way people communicate?", "Are there any disadvantages of modern technology?", "What technology will be important in the future?"] },
    { topic: "Health & Free time",
      part1: ["What do you do in your free time?", "Do you like doing sport?", "What kind of food do you usually eat?", "How do you relax after a busy day?"],
      part2: { cue: "Describe a healthy habit you have.", points: ["what the habit is", "when you started it", "how often you do it", "and explain how it helps you"] },
      part3: ["Why do some people find it hard to live a healthy life?", "Should the government encourage people to exercise?", "How have eating habits changed in your country?"] }
  ]
};
