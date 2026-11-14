export type ScamInputType = 'sms' | 'whatsapp' | 'email' | 'url' | 'payment' | 'phone';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScamTrigger {
  category: string;
  label: string;
  weight: number;
  guidance: string;
}

export interface ScamAnalysisResult {
  riskLevel: RiskLevel;
  riskScore: number;
  triggers: ScamTrigger[];
  hasUnverifiedUrl: boolean;
  ruleExplanation: string;
  verificationSteps: string[];
  reportingGuidance: {
    helpline: string;
    portal: string;
    steps: string[];
  };
}

interface RuleDefinition {
  category: string;
  label: string;
  weight: number;
  pattern: RegExp;
  guidance: string;
}

const SCAM_RULES: RuleDefinition[] = [
  {
    category: 'OTP / PIN Theft',
    label: 'Requests an OTP, UPI PIN, ATM PIN, or CVV',
    weight: 45,
    pattern: /\b(otp|one[\s-]?time[\s-]?password|upi[\s-]?pin|mpin|atm[\s-]?pin|cvv|pin\s+to\s+receive)\b/i,
    guidance: 'Never share an OTP or enter your UPI PIN to receive money or claim a refund.',
  },
  {
    category: 'Remote Access App',
    label: 'Mentions screen-sharing or remote control software (AnyDesk, TeamViewer, QuickSupport)',
    weight: 50,
    pattern: /\b(anydesk|teamviewer|quicksupport|rustdesk|screen[\s-]?shar|remote[\s-]?access)\b/i,
    guidance: 'Do NOT install remote access apps requested by any caller or support agent.',
  },
  {
    category: 'Digital Arrest / Impersonation',
    label: 'Threatens arrest, CBI/Police/Customs/TRAI action, or parcel seizure',
    weight: 50,
    pattern: /\b(digital\s*arrest|cbi|narcotics|customs\s*seized|fedex\s*parcel|trai|sim\s*block|warrant|police\s*case|aadhaar\s*misuse)\b/i,
    guidance: 'Indian police and courts NEVER conduct "digital arrests" over video calls or demand money to settle cases.',
  },
  {
    category: 'Fake KYC / Account Freeze',
    label: 'Claims bank KYC, PAN, or Aadhaar expired or account will be frozen',
    weight: 40,
    pattern: /\b(kyc\s*(update|pending|expired|suspend|block)|pan\s*card\s*update|account\s*(will\s*be\s*)?(blocked|frozen|suspended)|netbanking\s*blocked)\b/i,
    guidance: 'Verify KYC status only by visiting your bank branch or opening your official bank app directly.',
  },
  {
    category: 'Utility Disconnection Threat',
    label: 'Threatens electricity, gas, or water disconnection tonight',
    weight: 40,
    pattern: /\b(electricity\s*(bill|power)|power\s*(will\s*be\s*)?(disconnected|cut)|tonight\s*9:?30|meter\s*update|unpaid\s*bill\s*disconnect)\b/i,
    guidance: 'Check your electricity account directly in your official state utility app—never call mobile numbers from urgent texts.',
  },
  {
    category: 'Fake Prize / Lottery / Refund',
    label: 'Promises unexpected prize money, KBC lottery, cashback, or surprise refund',
    weight: 35,
    pattern: /\b(congratulations|won\s*(rs|₹|inr|lakh|crore)|lottery|kbc|jackpot|claim\s*(your\s*)?(prize|reward|cashback)|refund\s*approved)\b/i,
    guidance: 'Legitimate refunds never ask you to tap unknown links or enter a UPI PIN.',
  },
  {
    category: 'Urgency & Pressure',
    label: 'Uses extreme urgency ("within 2 hours", "immediately", "last warning")',
    weight: 20,
    pattern: /\b(urgent|immediately|within\s*\d+\s*(min|hour)|today\s*only|final\s*warning|last\s*chance|expire\s*today)\b/i,
    guidance: 'Scammers manufacture panic so you act before checking with family.',
  },
  {
    category: 'Suspicious Payment / Collect Link',
    label: 'Contains UPI collect / pay link or APK file download',
    weight: 35,
    pattern: /(upi:\/\/pay|\.apk\b|paytm\.me|collect\s*request|scan\s*(this\s*)?qr\s*to\s*receive)/i,
    guidance: 'Never scan a QR code or approve a collect request to receive money.',
  },
  {
    category: 'Shortened or Obfuscated URL',
    label: 'Uses link shorteners or raw IP web addresses that hide the real destination',
    weight: 30,
    pattern: /(https?:\/\/(\d{1,3}\.){3}\d{1,3}|bit\.ly|tinyurl\.com|cutt\.ly|rb\.gy|t\.ly|shorturl\.at|ngrok)/i,
    guidance: 'Shortened links hide the true website address. Do not tap them.',
  },
  {
    category: 'Unverified Customer Care Number',
    label: 'Asks you to call a personal 10-digit mobile number for bank or brand support',
    weight: 25,
    pattern: /\b(call\s*(us|immediately|helpline|support)?\s*[:\-]?\s*(\+91[\s-]?)?[6-9]\d{9}|customer\s*care\s*number)\b/i,
    guidance: 'Only call customer care numbers printed on the back of your bank card or official company website.',
  },
];

export function analyzeScamDeterministically(inputType: ScamInputType, rawContent: string): ScamAnalysisResult {
  const content = rawContent.trim();
  const triggers: ScamTrigger[] = [];
  let score = 0;

  for (const rule of SCAM_RULES) {
    if (rule.pattern.test(content)) {
      triggers.push({
        category: rule.category,
        label: rule.label,
        weight: rule.weight,
        guidance: rule.guidance,
      });
      score += rule.weight;
    }
  }

  const hasUrl = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|net|org|xyz|top|click|info|co\.in)\b)/i.test(content);
  const isHttpInsecure = /http:\/\/[^\s]+/i.test(content);
  if (isHttpInsecure) {
    triggers.push({
      category: 'Insecure Link',
      label: 'Link uses unencrypted http:// instead of https://',
      weight: 20,
      guidance: 'Official banking and government sites use encrypted https://.',
    });
    score += 20;
  }

  if (inputType === 'url' && hasUrl && score === 0) {
    score = 15;
  }

  const riskScore = Math.min(100, score);
  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 55) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 25) {
    riskLevel = 'MEDIUM';
  }

  const urlSafetyDisclaimer = hasUrl || inputType === 'url'
    ? 'Important: Automated checks cannot verify live external domains or guarantee that any unchecked link is safe. Only open websites you already trust.'
    : '';

  let ruleExplanation = '';
  if (riskLevel === 'HIGH') {
    ruleExplanation = `High risk detected (${riskScore}/100). This message contains ${triggers.length} strong fraud warning sign(s): ${triggers.map((t) => t.category).join(', ')}. Do NOT reply, tap links, share OTPs/PINs, or send money.`;
  } else if (riskLevel === 'MEDIUM') {
    ruleExplanation = `Caution advised (${riskScore}/100). Several suspicious patterns were found (${triggers.map((t) => t.category).join(', ') || 'unverified web link or urgent request'}). Verify independently before taking any action.`;
  } else {
    ruleExplanation = `Low rule-based risk (${riskScore}/100). No classic fraud keywords were matched in the text. However, always stay cautious with unexpected requests from unknown senders.`;
  }

  if (urlSafetyDisclaimer) {
    ruleExplanation = `${ruleExplanation} ${urlSafetyDisclaimer}`;
  }

  const verificationSteps = [
    'Pause and do not act under pressure or fear.',
    ...triggers.slice(0, 3).map((t) => t.guidance),
    'Confirm directly by calling your family member, bank branch, or official number printed on your card.',
  ];
  if (hasUrl || inputType === 'url') {
    verificationSteps.push('Never enter passwords, Aadhaar details, OTPs, or UPI PINs after clicking a link in a message.');
  }

  return {
    riskLevel,
    riskScore,
    triggers,
    hasUnverifiedUrl: hasUrl || inputType === 'url',
    ruleExplanation,
    verificationSteps: Array.from(new Set(verificationSteps)),
    reportingGuidance: {
      helpline: '1930',
      portal: 'https://cybercrime.gov.in',
      steps: [
        'If money was lost or an OTP/PIN was shared, dial 1930 immediately (24x7 Indian Cyber Crime Helpline).',
        'Take screenshots of the message, caller number, and any UPI transaction ID.',
        'Submit a complaint at https://cybercrime.gov.in and notify your bank fraud helpline.',
      ],
    },
  };
}
