// SakuSafe — local heuristic analysis engine.
//
// Two roles:
//  1. DEMO MODE — when Firebase AI Logic is not configured (or a model call
//     fails), this engine produces the analysis locally so the app is fully
//     explorable anywhere. The UI labels these results "Demo engine".
//  2. It mirrors the exact JSON contract the Gemini prompts use
//     ({ riskScore, verdict, redFlags[], tactics[], advice[] }), so swapping
//     between on-device, cloud and demo paths is invisible to the UI.
//
// The patterns are weighted from the red flags Indonesian anti-fraud
// campaigns (OJK / Kominfo) warn about most: APK lures, fake bank/e-wallet
// notices, OTP theft, prize & giveaway bait, and impersonation of officials.

const RULES = [
  { pattern: "Asks you to install an app / APK file", weight: 30, tactics: ["Malware lure"],
    regex: /(\.apk|install(kan)?\s+(aplikasi|app)|unduh\s+aplikasi|download\s+the\s+app)/i,
    why: "Legitimate banks and couriers never deliver services through sideloaded APK files — this is the most common Android banking-malware lure." },
  { pattern: "Requests an OTP / verification code", weight: 30, tactics: ["Credential theft"],
    regex: /(kode\s*otp|otp|kode\s+verifikasi|verification\s+code|kode\s+rahasia)/i,
    why: "No real institution ever asks for your OTP. Anyone asking for it is trying to take over your account." },
  { pattern: "Requests PIN, password or card details", weight: 28, tactics: ["Credential theft"],
    regex: /(pin\s+anda|password|kata\s+sandi|nomor\s+kartu|cvv|kode\s+akses)/i,
    why: "Banks never request PINs, passwords or card security codes by message." },
  { pattern: "Artificial urgency / deadline pressure", weight: 16, tactics: ["Urgency pressure"],
    regex: /(segera|dalam\s+\d+\s*(jam|menit)|hari\s+ini\s+juga|akan\s+(diblokir|dinonaktifkan|hangus)|act\s+now|within\s+\d+\s*hours|immediately)/i,
    why: "Scammers manufacture urgency so you act before you think or verify." },
  { pattern: "Threatens account blocking / legal action", weight: 16, tactics: ["Fear & authority"],
    regex: /(diblokir|blokir|dinonaktifkan|suspend|pidana|polisi|denda|legal\s+action|account\s+(will\s+be\s+)?(blocked|suspended|closed))/i,
    why: "Threats of blocking or prosecution are pressure tactics; real notices arrive through official channels with due process." },
  { pattern: "Prize / giveaway bait", weight: 20, tactics: ["Prize bait"],
    regex: /(selamat.{0,30}(menang|memenangkan|terpilih)|undian|giveaway|hadiah\s+(uang|tunai|iphone)|you\s+(have\s+)?won|claim\s+your\s+prize)/i,
    why: "You cannot win a lottery you never entered. 'Prizes' are bait to harvest data or fees." },
  { pattern: "Asks for an upfront fee to release money", weight: 24, tactics: ["Advance-fee fraud"],
    regex: /(biaya\s+(admin|proses|transfer|penarikan)|transfer\s+dulu|admin\s+fee|processing\s+fee|bayar\s+.{0,20}(dulu|sebesar))/i,
    why: "Being asked to pay to receive money is the signature of advance-fee fraud." },
  { pattern: "Crypto / investment doubling promise", weight: 24, tactics: ["Investment fraud"],
    regex: /(lipat\s*ganda|profit\s+\d+\s*%|return\s+\d+\s*%|doubling|gandakan|investasi.{0,20}(pasti|garansi|dijamin)|guaranteed\s+returns)/i,
    why: "Guaranteed high returns do not exist. Doubling schemes pay early bait from later victims' money, then vanish." },
  { pattern: "Impersonates a bank, e-wallet or authority", weight: 18, tactics: ["Impersonation"],
    regex: /(bank\s+(bri|bca|mandiri|bni)|ojk|bi-fast|dana|ovo|gopay|shopeepay|customer\s+service|cs\s+resmi|admin\s+resmi)/i,
    why: "The message claims an official identity — but official institutions do not operate from random chat numbers or shortened links." },
  { pattern: "Suspicious link (shortener / look-alike)", weight: 18, tactics: ["Phishing link"],
    regex: /(bit\.ly|tinyurl|s\.id\/|cutt\.ly|rb\.gy|https?:\/\/[^\s]*(-login|-verify|-secure|klaim|claim)[^\s]*)/i,
    why: "Shortened or look-alike links hide the real destination, which is usually a fake login page." },
  { pattern: "Job offer with too-good pay / simple tasks", weight: 16, tactics: ["Fake job / task scam"],
    regex: /(lowongan|gaji\s+\d|per\s+hari\s+rp|tugas\s+(like|follow|subscribe)|task\s+commission|komisi\s+harian)/i,
    why: "Fake 'like-and-earn' jobs start with small real payouts, then demand deposits that are never returned." },
  { pattern: "Requests secrecy", weight: 10, tactics: ["Isolation"],
    regex: /(jangan\s+(beritahu|ceritakan|bilang)|rahasia|do\s+not\s+tell|keep\s+this\s+secret)/i,
    why: "Isolating you from people who would warn you is a deliberate manipulation tactic." },
];

const GENERIC_ADVICE = [
  "Do not click any link and do not install anything the message asks for.",
  "Never share OTP codes, PINs or passwords — no real institution asks for them.",
  "Verify through the official app or the number printed on your bank card, never the number in the message.",
  "Ask a family member or friend to read the message with you before doing anything.",
  "Report the sender's number in your chat app and to your bank's official channel.",
];

export function analyzeLocally(messageText, depth = "deep") {
  const flags = [];
  const tactics = new Set();
  let score = 0;

  for (const rule of RULES) {
    const m = messageText.match(rule.regex);
    if (m) {
      score += rule.weight;
      rule.tactics.forEach((t) => tactics.add(t));
      flags.push({
        pattern: rule.pattern,
        excerpt: m[0].slice(0, 80),
        explanation: rule.why,
      });
    }
  }

  // Length/context modifiers: long messages with zero hits stay low-risk;
  // a bare link with pressure words is still risky.
  if (/https?:\/\//i.test(messageText)) score += 4;
  score = Math.max(0, Math.min(100, score));

  let verdict;
  if (score >= 60) verdict = "Very likely a scam. Do not engage — follow the steps below.";
  else if (score >= 35) verdict = "Suspicious. Several known scam patterns appear in this message.";
  else if (score >= 15) verdict = "Some caution signs. Verify the sender through official channels before acting.";
  else verdict = "No strong scam patterns found — but stay alert and verify anything involving money or codes.";

  const shownFlags = depth === "triage" ? flags.slice(0, 3) : flags;
  return {
    riskScore: score,
    verdict,
    redFlags: shownFlags,
    tactics: [...tactics],
    advice: score >= 15 ? GENERIC_ADVICE : [
      "No action needed. Keep verifying senders through official apps for anything involving money, codes or installs.",
    ],
  };
}

// Preset samples for judges (and the demo video). English UI; the messages
// themselves are realistic Indonesian scam texts, exactly as users receive them.
export const SAMPLES = [
  {
    id: "bank",
    label: "Fake bank WhatsApp",
    text: "Selamat siang, kami dari Customer Service Bank BRI. Akun Anda terdeteksi aktivitas mencurigakan dan akan DIBLOKIR dalam 24 jam. Segera verifikasi data Anda melalui link berikut bit.ly/verif-bri-secure dan masukkan kode OTP yang kami kirim. Jangan beritahu siapapun demi keamanan.",
  },
  {
    id: "apk",
    label: "Delivery .APK lure",
    text: "Paket Anda tertahan di gudang! Untuk melihat resi dan foto paket, unduh aplikasi kurir kami dan install file APK berikut: kurir-cepat.apk. Tugas sederhana, selesai dalam 2 menit agar paket segera dikirim hari ini juga.",
  },
  {
    id: "crypto",
    label: "Crypto giveaway",
    text: "GIVEAWAY RESMI! Gandakan aset Anda: kirim 0.1 ETH dan terima 0.2 ETH kembali, dijamin profit 100% dalam 10 menit. Cukup bayar biaya admin sebesar Rp250.000 dulu untuk proses penarikan. Kesempatan terbatas hanya hari ini!",
  },
  {
    id: "legit",
    label: "Legit notification (control)",
    text: "Transaksi berhasil. Pembayaran QRIS sebesar Rp52.000 di Kopi Senja pada 24/11/2026 19:42 WIB. Saldo akhir Anda Rp1.240.500. Detail lengkap tersedia di aplikasi resmi. Abaikan pesan ini jika Anda mengenali transaksi ini.",
  },
];
