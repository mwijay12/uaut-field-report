// What Altra knows, and nothing else.
//
// Every line below is a fact the site already publishes, in the words the site
// already uses: the studio page, the five services, the packages, the questions
// on the pricing page, the projects on the work page. Prices, phone lines and
// the email are read from content/site.json through `site`, so a price that
// changes in the admin changes here too.
//
// The rule: if it is not published on one of the six pages, it does not belong
// in this file. No client that has not agreed to be named, no number we have not
// counted, no promise about a delivery date. An answer that is not here is the
// fallback in answer.js, which says so and opens WhatsApp.
//
// `when` is how a question is recognised: single words and short phrases, in
// English and in Kiswahili, lower case and without accents. A phrase counts for
// more than a word. Every entry needs both answers, because the panel can be
// switched to either language at any time.

/**
 * @param {{ price: Record<string, string>, email: string, person: { number: string, whatsapp: string },
 *           chatbot: { number: string }, social: { instagram: string, linkedin: string } }} site
 */
export function knowledge(site) {
  const tsh = (key) => `TSh ${site.price[key]}`;

  return [
    {
      id: 'hello',
      chip: { en: 'What can you do?', sw: 'Unaweza nini?' },
      when: ['hello', 'hi', 'hey', 'habari', 'mambo', 'hujambo', 'salama', 'niaje', 'good morning', 'good afternoon', 'start', 'anza', 'help', 'what can you do', 'what can you help', 'nisaidie', 'msaada', 'unaweza'],
      en: `Hello. I am Altra, Altraware's assistant. I answer from our own notes: what we build, what it costs, how long it takes and how to start. Ask in English or Kiswahili.`,
      sw: `Habari! Mimi ni Altra, msaidizi wa Altraware. Najibu kutoka maelezo yetu wenyewe: tunachojenga, bei, muda, na jinsi ya kuanza. Uliza kwa Kiswahili au Kiingereza.`,
      next: ['services', 'price', 'process', 'contact'],
    },
    {
      id: 'who',
      chip: { en: 'Who is Altraware?', sw: 'Altraware ni nani?' },
      when: ['who are you', 'who is altraware', 'about you', 'about altraware', 'company', 'altraware ni nani', 'nyinyi ni nani', 'kampuni', 'kuhusu', 'history', 'founded', 'mwijay', 'brela'],
      en: `Altraware Technology Ltd is a Tanzanian software company with its office in Dar es Salaam. It was founded by David Mwijage and Clemence Ng'unda, was Mwijay Studio in 2025, and is registered with BRELA. We design and build websites, apps and management systems in Kiswahili and English.`,
      sw: `Altraware Technology Ltd ni kampuni ya programu ya Tanzania, yenye ofisi Dar es Salaam. Ilianzishwa na David Mwijage na Clemence Ng'unda, ilikuwa Mwijay Studio mwaka 2025, na imeandikishwa BRELA. Tunabuni na kujenga tovuti, apu na mifumo ya usimamizi kwa Kiswahili na Kiingereza.`,
      go: [{ label: 'The studio', href: '/studio/' }],
      next: ['services', 'work', 'where'],
    },
    {
      id: 'services',
      chip: { en: 'What do you build?', sw: 'Mnajenga nini?' },
      when: ['what do you build', 'what do you do', 'services', 'products', 'offer', 'website', 'web site', 'tovuti', 'app', 'apu', 'system', 'mfumo', 'mifumo', 'software', 'mlango', 'huduma', 'mnajenga', 'mnafanya', 'kazi gani'],
      en: `Five kinds of work: websites (a landing page up to a portal with bookings), web and mobile apps, business systems (sales, stock, attendance, fees, messages to guardians), payment integrations, and local search (Google Maps and local SEO). Every project runs in clear phases with a written scope and a fixed quote.`,
      sw: `Aina tano za kazi: tovuti (kuanzia ukurasa mmoja hadi portal yenye nafasi za kuweka nafasi), apu za wavuti na simu, mifumo ya biashara (mauzo, hisa, mahudhurio, ada, ujumbe kwa wazazi), uunganishaji wa malipo, na utafutaji wa ndani (Google Maps na SEO ya karibu). Kila mradi una hatua wazi, wigo ulioandikwa na bei maalum.`,
      go: [{ label: 'Services', href: '/services/' }],
      next: ['price', 'process', 'work'],
    },
    {
      id: 'price',
      chip: { en: 'What does it cost?', sw: 'Bei ni ngapi?' },
      when: ['price', 'cost', 'how much', 'how much does', 'charge', 'quote', 'budget', 'package', 'bei', 'bei gani', 'gharama', 'kiasi gani', 'ngapi', 'shilingi', 'pesa ngapi', 'vifurushi', 'kifurushi', 'mnatoza'],
      en: `Packages, in Tanzanian shillings before VAT: Web Starter ${tsh('starter')} (1 to 2 weeks), Growth Business Site ${tsh('growth')} (2 to 3 weeks), Pro Web Portal ${tsh('portal')} (2 to 4 weeks). A custom app starts at ${tsh('app')} and a turnkey business system at ${tsh('system')}. Add-ons: payment integration ${tsh('mpesa')}, Kiswahili and English ${tsh('bilingual')}, booking and orders ${tsh('booking')}, offline-first sync ${tsh('offline')}, notifications ${tsh('notifications')}, training and manuals ${tsh('training')}.`,
      sw: `Vifurushi, kwa Shilingi za Tanzania kabla ya VAT: Web Starter ${tsh('starter')} (wiki 1 hadi 2), Growth Business Site ${tsh('growth')} (wiki 2 hadi 3), Pro Web Portal ${tsh('portal')} (wiki 2 hadi 4). Apu maalum inaanzia ${tsh('app')} na mfumo kamili wa biashara ${tsh('system')}. Nyongeza: malipo ${tsh('mpesa')}, Kiswahili na Kiingereza ${tsh('bilingual')}, nafasi na oda ${tsh('booking')}, offline-first ${tsh('offline')}, notifications ${tsh('notifications')}, mafunzo na miongozo ${tsh('training')}.`,
      go: [
        { label: 'Pricing', href: '/pricing/' },
        { label: 'Estimate it yourself', href: '/pricing/#estimator' },
      ],
      next: ['estimator', 'timeline', 'vat'],
    },
    {
      id: 'estimator',
      chip: { en: 'The estimator', sw: 'Kikokotoo' },
      when: ['estimator', 'estimate', 'calculator', 'calculate', 'kikokotoo', 'kadirio', 'hesabu', 'kokotoa'],
      en: `On the pricing page you choose what you need and watch the range, the timeline and the monthly cost move. Three or more add-ons take 10% off the add-ons, and VAT at 18% is shown when you ask for it. An estimate is a guide; the real quote is fixed and written, and it is the signed agreement that counts.`,
      sw: `Kwenye ukurasa wa Bei unachagua unachohitaji, kisha unaona kiwango cha bei, muda na gharama ya mwezi. Nyongeza tatu au zaidi zinapunguza 10% kwenye nyongeza, na VAT ya 18% inaonekana ukiichagua. Kadirio ni mwongozo; bei halisi ni ile iliyoandikwa kwenye makubaliano.`,
      go: [{ label: 'Open the estimator', href: '/pricing/#estimator' }],
      next: ['price', 'start'],
    },
    {
      id: 'timeline',
      chip: { en: 'How long it takes', sw: 'Muda gani?' },
      when: ['how long', 'timeline', 'deadline', 'weeks', 'duration', 'when will', 'muda gani', 'wiki ngapi', 'lini', 'haraka', 'muda'],
      en: `Websites take 1 to 2 weeks (Web Starter), 2 to 3 weeks (Growth) or 2 to 4 weeks (Pro Web Portal). A custom app takes 3 to 5 weeks as a package, web applications start at 4 weeks, Flutter mobile apps take 4 to 6 weeks, and full business systems about 6 to 10 weeks.`,
      sw: `Tovuti: wiki 1 hadi 2 (Web Starter), wiki 2 hadi 3 (Growth), wiki 2 hadi 4 (Pro Web Portal). Apu maalum: wiki 3 hadi 5 kama kifurushi; apu za wavuti zinaanzia wiki 4, apu za Flutter wiki 4 hadi 6, na mifumo kamili ya biashara takriban wiki 6 hadi 10.`,
      go: [{ label: 'Pricing', href: '/pricing/' }],
      next: ['process', 'price'],
    },
    {
      id: 'process',
      chip: { en: 'How a project runs', sw: 'Mradi unaendaje?' },
      when: ['process', 'phases', 'steps', 'how does a project', 'how do you work', 'start a project', 'workflow', 'mchakato', 'hatua', 'mradi', 'unaendaje', 'fanyaje kazi', 'naanza vipi'],
      en: `Five stops, in order. Week 1: discovery and scope, with a written scope, a fixed quote and a launch date agreed upfront. Week 1 to 2: a clickable prototype, tested on your phone before any code. Week 2 to 6: short sprints with a demo every week. Final week: launch, training for your team and 30 days of close support. Then care and support for as long as you want it.`,
      sw: `Hatua tano, kwa mpangilio. Wiki 1: uchunguzi na wigo — wigo ulioandikwa, bei maalum na tarehe ya uzinduzi vinakubaliwa mwanzo. Wiki 1 hadi 2: mfano wa kubofya, unaojaribiwa kwenye simu yako kabla ya code. Wiki 2 hadi 6: kazi kwa vipindi vifupi, na demo kila wiki. Wiki ya mwisho: uzinduzi, mafunzo kwa timu yako na siku 30 za usaidizi wa karibu. Baada ya hapo: huduma na usaidizi kwa muda unaotaka.`,
      go: [{ label: 'How a project runs', href: '/services/#process' }],
      next: ['timeline', 'train', 'support'],
    },
    {
      id: 'offline',
      chip: { en: 'Offline, no internet?', sw: 'Bila intaneti?' },
      when: ['offline', 'no internet', 'without internet', 'connection', 'network', 'data bundle', 'bila intaneti', 'mtandao', 'hakuna intaneti', 'offline first', 'sync', 'sawazisha'],
      en: `Yes. Faida POS and our custom systems are built offline-first: your staff can sell, record transactions and check stock with no internet at all. The data is stored on the device and syncs by itself when the connection returns.`,
      sw: `Ndiyo. Faida POS na mifumo yetu maalum imejengwa offline-first: wafanyakazi wako wanaweza kuuza, kurekodi miamala na kuangalia hisa bila intaneti kabisa. Data inahifadhiwa kwenye kifaa na inajisawazisha yenyewe mtandao unaporejea.`,
      next: ['services', 'work'],
    },
    {
      id: 'train',
      chip: { en: 'Training for staff', sw: 'Mafunzo kwa timu' },
      when: ['train', 'training', 'manual', 'teach', 'onboarding', 'mafunzo', 'miongozo', 'kufundisha', 'wafanyakazi'],
      en: `Yes. Every system includes hands-on training, at your premises or by video, with illustrated PDF manuals and video walkthroughs your team can watch again at any time. Team training and manuals is also an add-on (${tsh('training')}) when a project needs more of it.`,
      sw: `Ndiyo. Kila mfumo unajumuisha mafunzo ya vitendo, ofisini kwako au kwa video, pamoja na miongozo ya PDF yenye michoro na video za hatua kwa hatua ambazo timu yako inaweza kurudia wakati wowote. Mafunzo na miongozo ni nyongeza pia (${tsh('training')}) pale mradi unahitaji zaidi.`,
      next: ['support', 'process'],
    },
    {
      id: 'own',
      chip: { en: 'Who owns the code?', sw: 'Nani anamiliki?' },
      when: ['own', 'owner', 'ownership', 'source code', 'code', 'data', 'handover', 'who keeps', 'milik', 'mmiliki', 'nani anamiliki', 'code ni ya nani', 'data ni ya nani', 'kabidhi'],
      en: `You do. On completion and full payment we hand over the code repositories, credentials, databases and assets, as set out in the written agreement.`,
      sw: `Wewe. Baada ya kukamilisha kazi na kulipa yote, tunakabidhi code, vitambulisho, database na maudhui yote, kama ilivyoandikwa kwenye makubaliano.`,
      next: ['privacy', 'support'],
    },
    {
      id: 'privacy',
      chip: { en: 'Privacy and data', sw: 'Faragha na data' },
      when: ['privacy', 'personal data', 'pdpa', 'gdpr', 'secure', 'security', 'encrypted', 'data protection', 'faragha', 'ulinzi', 'taarifa binafsi', 'usalama', 'siri'],
      en: `We work under Tanzania's Personal Data Protection Act, No. 11 of 2022. We collect only the data a system genuinely needs, and privacy is designed in: CareTrack, for example, keeps health and attendance records encrypted, with access limited to the people who need it.`,
      sw: `Tunafanya kazi kwa mujibu wa Sheria ya Ulinzi wa Taarifa Binafsi ya Tanzania, Na. 11 ya 2022. Tunakusanya taarifa zinazohitajika tu, na faragha imejengwa ndani: mfano, CareTrack inahifadhi kumbukumbu za afya na mahudhurio kwa usimbaji fiche, na ufikiaji unapunguzwa kwa wanaohitaji.`,
      next: ['own', 'work'],
    },
    {
      id: 'pay',
      chip: { en: 'M-Pesa payments', sw: 'Malipo ya M-Pesa' },
      when: ['mpesa', 'm pesa', 'mobile money', 'payment', 'tigo', 'airtel', 'halopesa', 'daraja', 'stk', 'malipo', 'pesa kwa simu', 'risiti', 'receipt'],
      en: `Yes. Vodacom M-Pesa through the Daraja API (STK push, with callbacks reconciled automatically), plus Tigo Pesa, Airtel Money and Halopesa. Every payment produces a receipt the customer can read, an SMS confirmation, and one reconciliation line for the owner. The integration is an add-on at ${tsh('mpesa')}.`,
      sw: `Ndiyo. M-Pesa ya Vodacom kupitia Daraja API (STK push, na callbacks zinazolinganishwa zenyewe), pamoja na Tigo Pesa, Airtel Money na Halopesa. Kila malipo yanatoa risiti ambayo mteja anaweza kuisoma, ujumbe wa SMS, na mstari mmoja wa hesabu kwa mmiliki. Uunganishaji ni nyongeza ya ${tsh('mpesa')}.`,
      go: [{ label: 'Services', href: '/services/' }],
      next: ['price', 'work'],
    },
    {
      id: 'lang',
      chip: { en: 'Kiswahili too?', sw: 'Lugha mbili?' },
      when: ['language', 'languages', 'kiswahili', 'swahili', 'english', 'bilingual', 'translation', 'lugha', 'kiingereza', 'tafsiri'],
      en: `Both. We work in Kiswahili and English, and a site, app or system can hold both languages. Bilingual delivery is an add-on at ${tsh('bilingual')}.`,
      sw: `Zote mbili. Tunafanya kazi kwa Kiswahili na Kiingereza, na tovuti, apu au mfumo unaweza kuwa na lugha zote mbili. Kukabidhi kwa lugha mbili ni nyongeza ya ${tsh('bilingual')}.`,
      next: ['price', 'services'],
    },
    {
      id: 'support',
      chip: { en: 'After launch', sw: 'Baada ya uzinduzi' },
      when: ['support', 'maintenance', 'after launch', 'hosting', 'backup', 'sla', 'monthly', 'tunza', 'kuza', 'imara', 'baada ya uzinduzi', 'huduma ya baada', 'matengenezo', 'nakala rudufu', 'kila mwezi'],
      en: `Every project includes 30 days of close support. After that: Essential Support (Tunza) at ${tsh('tunza')} a month, with hosting, SSL, daily backups, security patches and WhatsApp support within 48 hours. Growth Support (Kuza) at ${tsh('kuza')} a month adds four content and design updates, a monthly report on visitors and speed, and a priority channel within 12 hours. A custom SLA (Imara) is agreed separately.`,
      sw: `Kila mradi unajumuisha siku 30 za usaidizi wa karibu. Baada ya hapo: Tunza kwa ${tsh('tunza')} kwa mwezi — hosting, SSL, nakala rudufu za kila siku, viraka vya usalama na usaidizi wa WhatsApp ndani ya saa 48. Kuza kwa ${tsh('kuza')} kwa mwezi inaongeza marekebisho manne ya maudhui na muundo, ripoti ya kila mwezi ya wageni na kasi, na kipaumbele cha saa 12. SLA maalum (Imara) hukubaliwa tofauti.`,
      go: [{ label: 'Support plans', href: '/pricing/#support' }],
      next: ['price', 'train'],
    },
    {
      id: 'work',
      chip: { en: 'What have you built?', sw: 'Mmejenga nini?' },
      when: ['work', 'project', 'portfolio', 'example', 'case study', 'faida', 'caretrack', 'uaut', 'shule', 'kazi zenu', 'mifano', 'mmejenga', 'projects gani'],
      en: `Faida POS, a shop and supermarket system that keeps selling with no internet. CareTrack, attendance and health notes for care centres, with SMS to guardians. UAUT Connect, the admissions portal for the United African University of Tanzania in Kigamboni. Shule Altra, NECTA-aligned school management and grading. Five more are on the work page, from AYMI Africa to Volta Rentals, Bongo Foodie and Audenic.`,
      sw: `Faida POS, mfumo wa duka na supermarket unaoendelea kuuza bila intaneti. CareTrack, mahudhurio na kumbukumbu za afya kwa vituo vya watoto, na SMS kwa wazazi. UAUT Connect, lango la udahili la Chuo Kikuu cha Afrika ya Mashariki (UAUT) Kigamboni. Shule Altra, usimamizi na upangaji wa madaraja unaofuata NECTA. Nyingine tano ziko kwenye ukurasa wa Kazi — kutoka AYMI Africa hadi Volta Rentals, Bongo Foodie na Audenic.`,
      go: [{ label: 'Work', href: '/work/' }],
      next: ['services', 'where'],
    },
    {
      id: 'where',
      chip: { en: 'Where and when', sw: 'Mko wapi?' },
      when: ['where', 'location', 'office', 'address', 'dar es salaam', 'hours', 'open', 'working hours', 'time', 'wapi', 'ofisi', 'anwani', 'mko wapi', 'saa ngapi', 'saa za kazi', 'mnafungua', 'mnafunga', 'jumatatu'],
      en: `Our office is in Dar es Salaam, Tanzania, and we work Monday to Saturday, 8:00 to 18:00 East Africa Time. Much of a project can run remotely, and we come to your premises for training when that is what the team needs.`,
      sw: `Ofisi yetu iko Dar es Salaam, Tanzania, na tunafanya kazi Jumatatu hadi Jumamosi, saa 2 asubuhi hadi saa 12 jioni (8:00–18:00 EAT). Sehemu kubwa ya mradi inaweza kuendeshwa kwa mbali, na tunakuja ofisini kwako kwa mafunzo pale timu inahitaji hivyo.`,
      go: [{ label: 'Contact', href: '/contact/' }],
      next: ['contact', 'who'],
    },
    {
      id: 'contact',
      chip: { en: 'Talk to a person', sw: 'Tuongee na mtu' },
      when: ['contact', 'phone', 'phone number', 'email', 'email address', 'whatsapp', 'call', 'reach', 'talk to', 'human', 'person', 'mawasiliano', 'simu', 'namba ya simu', 'barua pepe', 'wasiliana', 'nifikie', 'mtu'],
      en: `For a written quote, send the brief on the Start a project page: it opens WhatsApp with your message ready for a person on our team at ${site.person.number}. By email: ${site.email}. The other WhatsApp line, ${site.chatbot.number}, is an automated chatbot — useful for quick questions, but a brief should go to a person.`,
      sw: `Kwa bei iliyoandikwa, tuma brief kwenye ukurasa wa "Anza mradi": inafungua WhatsApp na ujumbe wako ukiwa tayari kwa mtu wa timu yetu — ${site.person.number}. Kwa barua pepe: ${site.email}. Namba nyingine ya WhatsApp, ${site.chatbot.number}, ni chatbot inayojibu yenyewe — nzuri kwa maswali ya haraka, lakini brief iende kwa mtu.`,
      go: [
        { label: 'Start a project', href: '/contact/' },
        { label: 'WhatsApp a person', href: site.person.whatsapp },
      ],
      next: ['price', 'start'],
    },
    {
      id: 'social',
      chip: { en: 'Follow us', sw: 'Nifuate wapi?' },
      when: ['instagram', 'linkedin', 'social media', 'follow you', 'your page', 'mitandao ya jamii', 'nifuate', 'kufuata', 'ukurasa wenu'],
      en: `On Instagram (${site.social.instagram}) and LinkedIn (${site.social.linkedin}). The buttons at the bottom of every page go straight there.`,
      sw: `Instagram (${site.social.instagram}) na LinkedIn (${site.social.linkedin}). Vitufe vilivyo chini ya kila ukurasa vinakupeleka moja kwa moja.`,
      go: [
        { label: 'Instagram', href: site.social.instagram },
        { label: 'LinkedIn', href: site.social.linkedin },
      ],
    },
    {
      id: 'start',
      chip: { en: 'How do I start?', sw: 'Nianze vipi?' },
      when: ['how do i start', 'get started', 'begin', 'next step', 'sign up', 'book', 'meeting', 'demo', 'consultation', 'nianze', 'kuanza', 'hatua ijayo', 'tukutane', 'miadi', 'ushauri', 'naomba'],
      en: `Three ways in. Open the estimator to price it yourself, pick a package on the pricing page, or send a short brief on the Start a project page and it opens WhatsApp for you. Not sure which one? Tell us the problem and we will suggest where to start — advice is free.`,
      sw: `Njia tatu. Fungua kikokotoo upate bei mwenyewe, chagua kifurushi kwenye ukurasa wa Bei, au tuma brief fupi kwenye ukurasa wa "Anza mradi" na itafungua WhatsApp. Hujui pa kuanza? Tueleze tatizo na tutakushauri pa kuanza — ushauri ni bure.`,
      go: [
        { label: 'Start a project', href: '/contact/' },
        { label: 'Pricing', href: '/pricing/' },
      ],
      next: ['price', 'process'],
    },
    {
      id: 'vat',
      chip: { en: 'Prices and VAT', sw: 'VAT na bei' },
      when: ['vat', 'tax', 'ushuru', 'kodi', 'bila vat', 'na vat', '18'],
      en: `Yes. Prices are in Tanzanian shillings and exclude VAT. The estimator adds VAT at 18% when you tick it, so the figure is on the page before anything is agreed.`,
      sw: `Ndiyo. Bei ni Shilingi za Tanzania na hazijumuishi VAT. Kikokotoo kinaongeza VAT ya 18% ukiichagua, kwa hiyo namba inaonekana kabla ya kukubaliana.`,
      next: ['price', 'estimator'],
    },
    {
      id: 'whofor',
      chip: { en: 'Who we serve', sw: 'Mnafanya na nani?' },
      when: ['who do you work for', 'client', 'customer', 'sme', 'ngo', 'school', 'clinic', 'wateja', 'mnafanya kazi na', 'biashara ndogo', 'shule', 'kliniki', 'ngos', 'wakandarasi'],
      en: `Small and medium businesses, schools and universities, clinics and care centres, NGOs, community centres and contractors in Tanzania, with growing work for clients elsewhere in East Africa and beyond.`,
      sw: `Biashara ndogo na za kati, shule na vyuo, kliniki na vituo vya watoto, NGOs, vituo vya jamii na wakandarasi Tanzania, pamoja na wateja zaidi Afrika Mashariki na nje.`,
      go: [{ label: 'Services', href: '/services/' }],
      next: ['work', 'services'],
    },
    {
      id: 'stack',
      chip: { en: 'What we build with', sw: 'Teknolojia gani?' },
      when: ['stack', 'technology', 'flutter', 'react', 'nextjs', 'next js', 'webgl', 'teknolojia', 'zana', 'mnatumia nini'],
      en: `Flutter for Android and iOS, offline-first architecture for the systems, the M-Pesa Daraja API for payments, and on the web, sites built to be fast on Tanzanian mobile networks: optimised images, caching and a CDN. This site adds WebGL and GSAP for the motion.`,
      sw: `Flutter kwa Android na iOS, usanifu wa offline-first kwa mifumo, Daraja API ya M-Pesa kwa malipo, na kwa wavuti, tovuti zilizojengwa kwa kasi kwenye mitandao ya simu ya Tanzania: picha zilizoboreshwa, caching na CDN. Tovuti hii inaongeza WebGL na GSAP kwa mwendo.`,
      next: ['offline', 'services'],
    },
    {
      id: 'thanks',
      when: ['thank', 'thanks', 'asante', 'ahsante', 'shukran', 'ok', 'sawa', 'nice', 'good'],
      en: `You are welcome. If you would like a written quote, the brief on the Start a project page goes straight to a person on the team.`,
      sw: `Karibu. Ukipenda bei iliyoandikwa, brief iliyo kwenye ukurasa wa "Anza mradi" inamfikia mtu wa timu moja kwa moja.`,
      go: [{ label: 'Start a project', href: '/contact/' }],
      next: ['start', 'price'],
    },
    {
      id: 'human',
      chip: { en: 'Are you a person?', sw: 'Wewe ni mtu?' },
      when: ['are you a person', 'are you human', 'are you real', 'robot', 'bot', 'ai', 'chatbot', 'script', 'wewe ni mtu', 'robot', 'akili bandia', 'unajibu mwenyewe'],
      en: `No. I am a script on this site: I answer from a page of notes the team wrote, and I do not invent anything. For a conversation with a person, WhatsApp ${site.person.number}, or send the brief.`,
      sw: `Hapana. Mimi ni script iliyo kwenye tovuti hii: najibu kutoka maelezo ambayo timu imeandika, na siwezi kubuni kitu. Kwa mazungumzo na mtu, WhatsApp ${site.person.number}, au tuma brief.`,
      go: [{ label: 'WhatsApp a person', href: site.person.whatsapp }],
      next: ['contact'],
    },
  ];
}
