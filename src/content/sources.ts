/**
 * Source registry. Every reference shown in the experience lives here, typed.
 * See docs/02-RESEARCH-REFERENCES.md for verification notes.
 *
 * RULE: `summary` is a project summary for orientation — NEVER a meal.
 * `meal` stays null until verified, licensed text is inserted.
 */

export type SourceType =
  | 'quran'
  | 'meal'
  | 'tafsir'
  | 'hadith'
  | 'athar'
  | 'scholar'
  | 'original'

export type VerifyStatus = 'ref-verified' | 'check-numbering' | 'pending-review'

export interface Source {
  id: string
  type: SourceType
  /** Human-readable reference, e.g. "Fussilet 41:53" */
  ref: string
  /** Project summary of meaning — labelled on screen as not a translation */
  summary: string
  /** Verified meal text; null until inserted from a licensed source */
  meal: string | null
  mealSource?: string
  link?: string
  grade?: string
  status: VerifyStatus
  note?: string
}

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  quran: 'Kur’an-ı Kerîm',
  meal: 'Meal',
  tafsir: 'Tefsir',
  hadith: 'Hadis',
  athar: 'Eser (sahâbî sözü)',
  scholar: 'Âlim / klasik eser',
  original: 'SIRR — özgün metin',
}

const DIYANET = 'Diyanet İşleri Başkanlığı — Kur’an Yolu (doğrulanmış metin eklenecek)'
const DIYANET_URL = 'https://kuran.diyanet.gov.tr'

export const SOURCES: Record<string, Source> = {
  'q.41.53': {
    id: 'q.41.53',
    type: 'quran',
    ref: 'Fussilet 41:53',
    summary:
      'Allah’ın âyetlerini (işaretlerini) ufuklarda (âfâk) ve insanın kendi içinde (enfüs) göstereceği bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'SIRR’ın temel tasarım ilkesi: dış dünya ile iç dünyanın birbirini yansıtması.',
  },
  'q.51.20-21': {
    id: 'q.51.20-21',
    type: 'quran',
    ref: 'Zâriyât 51:20–21',
    summary:
      'Yeryüzünde kesin inanca erenler için işaretler olduğu ve insanın kendisinde de işaretler bulunduğu; “Görmüyor musunuz?” sorusu.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'q.50.16': {
    id: 'q.50.16',
    type: 'quran',
    ref: 'Kāf 50:16',
    summary:
      'İnsanı Allah’ın yarattığı, nefsinin ona fısıldadıklarını bildiği ve ona şah damarından daha yakın olduğu bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'q.95.4-8': {
    id: 'q.95.4-8',
    type: 'quran',
    ref: 'Tîn 95:4–8',
    summary:
      'İnsanın en güzel biçim ve kıvamda (ahsen-i takvîm) yaratıldığı; sonra aşağıların aşağısına (esfel-i sâfilîn) döndürüldüğü; iman edip salih amel işleyenlerin bundan istisna tutulduğu ve onlara kesintisiz bir karşılık olduğu bildirilir. Sûre, hesap gününü neyin yalanlattığını ve Allah’ın hâkimlerin en hâkimi olmadığını sorarak biter.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'Bu bölüm sûreyi “kendini sev” mesajına indirgemez: değer, sorumlulukla birlikte verilmiştir.',
  },
  'tafsir.95.5': {
    id: 'tafsir.95.5',
    type: 'tafsir',
    ref: 'Tîn 95:5 — iki klasik yorum',
    summary:
      '“Esfel-i sâfilîn” ifadesi klasik tefsirlerde (ör. Taberî) iki ana şekilde anlaşılmıştır: ileri yaşlılığın getirdiği düşkünlük ya da ahlaki düşüş ve onun âhiretteki karşılığı.',
    meal: null,
    mealSource: 'Diyanet Kur’an Yolu tefsiri ve Taberî üzerinden kontrol edilecek',
    link: DIYANET_URL,
    status: 'pending-review',
    note: 'Bölümdeki solan yaprak bu yorumlardan birini seçmez; bir tefsir değil, bir tefekkür imgesidir.',
  },
  'q.91.7-10': {
    id: 'q.91.7-10',
    type: 'quran',
    ref: 'Şems 91:7–10',
    summary:
      'Nefse ve onu düzenleyene yemin edilir; ona kötülüğün (fücûr) ve sakınmanın (takvâ) ilham edildiği, onu arındıranın (tezkiye) kurtuluşa erdiği, onu kirletip örtenin ise kaybettiği bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'q.3.190-191': {
    id: 'q.3.190-191',
    type: 'quran',
    ref: 'Âl-i İmrân 3:190–191',
    summary:
      'Göklerin ve yerin yaratılışında, gece ile gündüzün birbirini izlemesinde akıl sahipleri için işaretler olduğu; onların ayaktayken, otururken ve yanları üzerine yatarken Allah’ı andıkları ve yaratılış üzerine düşündükleri bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'Bu bölümün yakın bakışı, tefekkürün görsel karşılığı olarak tasarlandı.',
  },
  'scholar.ghazali.tefekkur': {
    id: 'scholar.ghazali.tefekkur',
    type: 'scholar',
    ref: 'Gazzâlî, İhyâu Ulûmi’d-Dîn — Tefekkür Kitabı',
    summary:
      'Gazzâlî, yaratılmış varlıkların ayrıntıları üzerine düşünmeyi marifete götüren bir ibadet olarak ele alır; insanın kendi yaratılışı, yeryüzü, sular ve bitkiler bu tefekkürün örnekleri arasındadır.',
    meal: null,
    status: 'pending-review',
    note: 'Doğrudan alıntı yapılmamıştır; özet, yayımlanmış bir çeviriyle karşılaştırılacak.',
  },
  'orig.creation': {
    id: 'orig.creation',
    type: 'original',
    ref: 'Bölüm 02 soruları',
    summary:
      'Bu bölümde ekranda görünen bütün cümleler SIRR projesinin özgün metnidir. “Güzellik bir emanetti” cümlesi bir tefsir iddiası değil, sûre üzerine bir tefekkür denemesidir.',
    meal: null,
    status: 'ref-verified',
  },
  'q.12.53': {
    id: 'q.12.53',
    type: 'quran',
    ref: 'Yûsuf 12:53',
    summary:
      'Nefsin kötülüğü çokça emrettiği (emmâre), Rabbin merhamet ettikleri müstesna olduğu ve Rabbin bağışlayıcı, merhametli olduğu bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'Sözün Azîz’in hanımına mı, Hz. Yûsuf’a mı ait olduğu tefsirlerde tartışılır. Ayet merhamet vurgusuyla biter; bölüm de hüküm vermez.',
  },
  'q.75.2': {
    id: 'q.75.2',
    type: 'quran',
    ref: 'Kıyâme 75:2',
    summary: 'Kendini kınayan nefse (levvâme) yemin edilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'Klasik “emmâre, levvâme, mutmainne” üçlüsü bu ayetlere dayanan bir âlim çerçevesidir; tek bir ayette geçmez.',
  },
  'q.83.14': {
    id: 'q.83.14',
    type: 'quran',
    ref: 'Mutaffifîn 83:14',
    summary: 'Kazandıklarının, kalplerinin üzerini bir pas gibi kapladığı (rân) bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'hadith.ran': {
    id: 'hadith.ran',
    type: 'hadith',
    ref: 'Tirmizî, Tefsîr 83 (3334); İbn Mâce, Zühd 29 (4244)',
    summary:
      'Kul bir günah işlediğinde kalbinde siyah bir nokta belirdiği; tövbe ederse kalbin cilalandığı, tekrar ederse noktanın arttığı ve bunun 83:14’te anılan “rân” olduğu bildirilir.',
    meal: null,
    grade: 'Tirmizî: hasen sahih',
    status: 'check-numbering',
    note: 'Silinen pasın kısmen geri gelmesi ve cilanın kalıcı izi bu hadisten ilham alır; bir yorum değil, bir imgedir.',
  },
  'hadith.hearts': {
    id: 'hadith.hearts',
    type: 'hadith',
    ref: 'Müslim, Birr 33–34 (2564)',
    summary: 'Allah’ın suretlerinize ve mallarınıza değil, kalplerinize ve amellerinize baktığı bildirilir.',
    meal: null,
    grade: 'Sahih',
    status: 'check-numbering',
    note: 'Aynada yüz yoktur; yalnızca bir siluet. Bu tercih bu hadisle uyumlu düşünüldü.',
  },
  'scholar.ghazali.heart': {
    id: 'scholar.ghazali.heart',
    type: 'scholar',
    ref: 'Gazzâlî, İhyâu Ulûmi’d-Dîn — Kalbin Acâibi (Şerhu Acâibi’l-Kalb)',
    summary:
      'Gazzâlî kalbi, hakikatin yansıdığı bir aynaya benzetir: günahlar ve dünyevi bağlar onu karartır, zikir ve nefisle mücadele onu parlatır.',
    meal: null,
    status: 'pending-review',
    note: 'Doğrudan alıntı yapılmamıştır; özet, yayımlanmış bir çeviriyle karşılaştırılacak.',
  },
  'scholar.rumi.painters': {
    id: 'scholar.rumi.painters',
    type: 'scholar',
    ref: 'Mevlânâ, Mesnevî I — Çinli ve Rum ressamlar hikâyesi',
    summary:
      'Çinliler duvarlarını renklerle süslerken Rumlar karşı duvarı yalnızca cilalar; perde kalkınca cilalı duvar, karşıdaki bütün resmi daha da parlak yansıtır. Mevlânâ bu cilacıları kalplerini arındıranlara benzetir.',
    meal: null,
    status: 'pending-review',
    note: 'Bu bölümdeki “boyamak değil, silmek” jesti bu hikâyeden doğdu. Beyit numaraları kullanılacak baskıya göre eklenecek.',
  },
  'orig.nafs': {
    id: 'orig.nafs',
    type: 'original',
    ref: 'Bölüm 03 soruları',
    summary:
      'Ekrandaki bütün cümleler SIRR projesinin özgün metnidir. Bölüm bilinçli olarak suçlayıcı ya da hüküm veren bir dil kullanmaz: levvâme nefis kendini zaten kınar.',
    meal: null,
    status: 'ref-verified',
  },
  'q.103.1-3': {
    id: 'q.103.1-3',
    type: 'quran',
    ref: 'Asr 103:1–3',
    summary:
      'Asra (zamana) yemin edilerek insanın gerçekten ziyanda olduğu; iman edip salih amel işleyenlerin, birbirlerine hakkı ve sabrı tavsiye edenlerin bundan istisna olduğu bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: '“Asr” tefsirlerde genel olarak zaman/çağ, ikindi vakti (ve ikindi namazı) ya da Peygamber’in ﷺ çağı olarak anlaşılmıştır. Bölümün ikindi ışığı bu anlamlardan birine yapılan bir göndermedir, bir tefsir değildir.',
  },
  'q.102.1-8': {
    id: 'q.102.1-8',
    type: 'quran',
    ref: 'Tekâsür 102:1–8',
    summary:
      'Çokluk yarışının (tekâsür) insanları kabirlere varıncaya dek oyaladığı; bunun bilineceği ve o gün verilen nimetlerden (naîm) sorulacakları bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'Kum toplama jesti bu sûreden ilham alır: yığdıkça büyüyen, bırakınca dağılan.',
  },
  'q.100.1-11': {
    id: 'q.100.1-11',
    type: 'quran',
    ref: 'Âdiyât 100:1–11',
    summary:
      'Soluk soluğa koşan, kıvılcım saçan, sabah baskınına çıkıp toz koparan atlara yemin edilir (1–5; azınlık bir görüş bunları hacıların develeri olarak anlar). İnsanın Rabbine karşı nankör (kenûd) olduğu, buna kendisinin de şahit olduğu ve mal sevgisine çok düşkün olduğu (6–8); kabirlerdekiler çıkarılıp göğüslerdekiler ortaya döküldüğünde Rabbin onlardan haberdar olduğu (9–11) bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: '7. ayetteki “şahit”in insanın kendisi mi yoksa Allah mı olduğu iki görüştür. Atlar sahnede hiçbir zaman resmedilmez; ufukta koşan toz bulutları yalnızca 4. ayetteki “toz”a bir göndermedir.',
  },
  'hadith.two-blessings': {
    id: 'hadith.two-blessings',
    type: 'hadith',
    ref: 'Buhârî, Rikâk 1 (6412)',
    summary: 'İnsanların çoğunun iki nimet konusunda aldandığı bildirilir: sağlık ve boş vakit.',
    meal: null,
    grade: 'Sahih',
    status: 'check-numbering',
  },
  'hadith.valley': {
    id: 'hadith.valley',
    type: 'hadith',
    ref: 'Buhârî, Rikâk 10 (6436–6439); Müslim, Zekât 116 (1048)',
    summary:
      'Âdemoğlunun bir vadi dolusu altını olsa ikincisini isteyeceği; onun gözünü ancak toprağın doyuracağı ve Allah’ın tövbe edenin tövbesini kabul ettiği bildirilir.',
    meal: null,
    grade: 'Sahih',
    status: 'check-numbering',
  },
  'hadith.stranger': {
    id: 'hadith.stranger',
    type: 'hadith',
    ref: 'Buhârî, Rikâk 3 (6416)',
    summary: 'Dünyada bir garip ya da bir yolcu gibi olunması tavsiye edilir.',
    meal: null,
    grade: 'Sahih',
    status: 'check-numbering',
    note: 'Önde yürüyenlerin izleri ve arkada silinen ayak izleri bu hadisten ilham alır.',
  },
  'hadith.naim': {
    id: 'hadith.naim',
    type: 'hadith',
    ref: 'Müslim, Eşribe 140 (2038)',
    summary:
      'Aç oldukları bir gün Peygamber ﷺ, Ebû Bekir ve Ömer’e bir Ensârînin hurma, su ve gölge ikram etmesi üzerine bunların, sorulacak nimetlerden (naîm) olduğunun söylenmesi.',
    meal: null,
    grade: 'Sahih',
    status: 'check-numbering',
    note: 'Tekâsür 102:8’deki “naîm”in sıradan, gündelik nimetleri de kapsadığını gösterir.',
  },
  'orig.time': {
    id: 'orig.time',
    type: 'original',
    ref: 'Bölüm 04 soruları',
    summary:
      'Ekrandaki bütün cümleler SIRR projesinin özgün metnidir. Hızlı kaydırınca güneşin hızlanması ve harcanan ışığın geri gelmemesi bir tasarım tercihidir, bir ayetin yorumu değildir.',
    meal: null,
    status: 'ref-verified',
  },
  'q.13.28': {
    id: 'q.13.28',
    type: 'quran',
    ref: 'Ra’d 13:28',
    summary:
      'İman edenlerin kalplerinin Allah’ı anmakla (zikr) huzura kavuştuğu (tatmainnu) ve kalplerin ancak Allah’ı anmakla huzur bulacağı bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: '“Tatmainnu”, Fecr 89:27’deki “mutmainne” ile aynı kökten gelir; bu bölüm bir sonrakine bu kökle bağlanır. Ayet ekranda yazılmaz.',
  },
  'q.2.152': {
    id: 'q.2.152',
    type: 'quran',
    ref: 'Bakara 2:152',
    summary: 'Allah’ı anmaları hâlinde Allah’ın da onları anacağı; O’na şükretmeleri ve nankörlük etmemeleri istenir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'q.14.7': {
    id: 'q.14.7',
    type: 'quran',
    ref: 'İbrâhîm 14:7',
    summary: 'Şükrederlerse Allah’ın nimetini artıracağı, nankörlük ederlerse azabının şiddetli olduğu bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'q.2.153': {
    id: 'q.2.153',
    type: 'quran',
    ref: 'Bakara 2:153',
    summary: 'Müminlerden sabır ve namazla yardım dilemeleri istenir; Allah’ın sabredenlerle beraber olduğu bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'q.65.3': {
    id: 'q.65.3',
    type: 'quran',
    ref: 'Talâk 65:3',
    summary: 'Allah’a tevekkül edene Allah’ın yeteceği bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'Tevekkül, elden geleni yapıp sonucu bırakmaktır; edilgenlik değildir. “Bıraktığında elinde ne kalıyor?” sorusu buna dokunur.',
  },
  'hadith.believer': {
    id: 'hadith.believer',
    type: 'hadith',
    ref: 'Müslim, Zühd 64 (2999)',
    summary:
      'Müminin hâlinin şaşırtıcı olduğu, her işinin kendisi için hayırlı olduğu bildirilir: bir iyilik dokunursa şükreder, bir sıkıntı dokunursa sabreder; ikisi de onun için hayırdır.',
    meal: null,
    grade: 'Sahih',
    status: 'check-numbering',
  },
  'scholar.ghazali.sabr-shukr': {
    id: 'scholar.ghazali.sabr-shukr',
    type: 'scholar',
    ref: 'Gazzâlî, İhyâu Ulûmi’d-Dîn — Sabır ve Şükür Kitabı',
    summary:
      'Gazzâlî imanı sabır ve şükür olmak üzere iki yarım olarak ele alır ve ikisinin bilgi, hâl ve amel boyutlarını inceler.',
    meal: null,
    status: 'pending-review',
    note: 'Doğrudan alıntı yapılmamıştır; özet, yayımlanmış bir çeviriyle karşılaştırılacak.',
  },
  'scholar.ibnqayyim.wabil': {
    id: 'scholar.ibnqayyim.wabil',
    type: 'scholar',
    ref: 'İbn Kayyim el-Cevziyye, el-Vâbilü’s-Sayyib',
    summary: 'Zikrin kalbe ve hayata etkilerini, faydalarını tek tek sayarak ele alan klasik bir eser.',
    meal: null,
    status: 'pending-review',
    note: 'Eserin bölüm başlıkları kullanılacak baskıya göre eklenecek.',
  },
  'orig.stillness': {
    id: 'orig.stillness',
    type: 'original',
    ref: 'Bölüm 05 soruları',
    summary:
      'Ekrandaki bütün cümleler SIRR projesinin özgün metnidir. Bu bölüm hareketsizliği ödüllendirir: durduğunda su durulur, yıldızlar belirir ve ışık yavaşça nefes alır. Bu bir meditasyon tekniği olarak sunulmaz.',
    meal: null,
    status: 'ref-verified',
  },
  'q.89.27-30': {
    id: 'q.89.27-30',
    type: 'quran',
    ref: 'Fecr 89:27–30',
    summary:
      'Huzura ermiş nefse (nefs-i mutmainne) hitap edilir: Rabbine, O’ndan razı ve O’nun da senden razı olarak dön; kullarımın arasına gir; cennetime gir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: 'Tefsirlerin çoğu bu hitabı ölüm anına ve/veya hesap gününe yerleştirir. SIRR bu ayetleri ulaşılmış bir hâl olarak değil, umulan bir dönüş olarak sunar; yol devam eder.',
  },
  'q.59.18': {
    id: 'q.59.18',
    type: 'quran',
    ref: 'Haşr 59:18',
    summary:
      'İman edenlere Allah’tan sakınmaları ve herkesin yarın için önceden ne gönderdiğine bakması emredilir; Allah yapılanlardan haberdardır.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
    note: '“Yarın için bir kelime bırak” jesti bu ayetten ilham alır; bir yorum değil, küçük bir muhâsebe davetidir.',
  },
  'q.39.53': {
    id: 'q.39.53',
    type: 'quran',
    ref: 'Zümer 39:53',
    summary:
      'Kendilerine karşı aşırı giden kullara Allah’ın rahmetinden ümit kesmemeleri söylenir; Allah’ın bütün günahları bağışladığı, O’nun çok bağışlayıcı ve merhametli olduğu bildirilir.',
    meal: null,
    mealSource: DIYANET,
    link: DIYANET_URL,
    status: 'ref-verified',
  },
  'hadith.tawba': {
    id: 'hadith.tawba',
    type: 'hadith',
    ref: 'Tirmizî, Kıyâmet 49 (2499); İbn Mâce, Zühd 30 (4251)',
    summary: 'Âdemoğlunun hepsinin hata ettiği, hata edenlerin en hayırlısının çokça tövbe edenler olduğu bildirilir.',
    meal: null,
    grade: 'Tirmizî “garîb” demiştir; bazı muhaddisler hasen kabul eder',
    status: 'check-numbering',
    note: 'Derecesi tartışmalı olduğu için panelde notuyla birlikte gösterilir.',
  },
  'athar.umar': {
    id: 'athar.umar',
    type: 'athar',
    ref: 'Hz. Ömer’e nispet edilen söz — Tirmizî, Kıyâmet 25 (2459. hadisin ardından)',
    summary: 'Hesaba çekilmeden önce kendinizi hesaba çekin; tartılmadan önce kendinizi tartın.',
    meal: null,
    status: 'check-numbering',
    note: 'Bu bir hadis değil, Hz. Ömer’e ait bir sözdür (eser). Muhâsebe kavramının klasik dayanaklarından biridir.',
  },
  'hadith.ihsan': {
    id: 'hadith.ihsan',
    type: 'hadith',
    ref: 'Müslim, Îmân 1 (8); Buhârî, Îmân 37 (50) — Cibrîl hadisi',
    summary: 'İhsân, Allah’a O’nu görüyormuş gibi kulluk etmektir; sen O’nu görmesen de O seni görür.',
    meal: null,
    grade: 'Sahih',
    status: 'check-numbering',
  },
  'orig.return': {
    id: 'orig.return',
    type: 'original',
    ref: 'Bölüm 06 soruları',
    summary:
      'Ekrandaki bütün cümleler SIRR projesinin özgün metnidir. Bölüm bir varış ilan etmez: yolculuk, bir sonraki şafakta yeniden başlar.',
    meal: null,
    status: 'ref-verified',
  },
  'orig.awakening': {
    id: 'orig.awakening',
    type: 'original',
    ref: 'Bölüm 01 soruları',
    summary:
      'Bu bölümde ekranda görünen bütün sorular SIRR projesinin özgün metnidir; âyet, hadis ya da bir âlimden alıntı değildir.',
    meal: null,
    status: 'ref-verified',
  },
}
