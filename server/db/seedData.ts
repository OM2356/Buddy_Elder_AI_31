export interface SeedCourse {
  id: string;
  title: string;
  title_hi: string;
  title_mr: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate';
  duration_minutes: number;
  summary: string;
  steps: string[];
  audio_script: string;
  simulator_task: string;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  sort_order: number;
}

export interface SeedResearchDoc {
  id: string;
  title: string;
  authors: string;
  year: number;
  category: string;
  source_name: string;
  source_url: string;
  abstract: string;
  key_findings: string;
}

export const SEED_COURSES: SeedCourse[] = [
  {
    id: 'course-01',
    title: 'Smartphone Buttons, Screen & Charging Basics',
    title_hi: 'स्मार्टफ़ोन बटन, स्क्रीन और चार्जिंग की मूल बातें',
    title_mr: 'स्मार्टफोन बटणे, स्क्रीन आणि चार्जिंगची मूलतत्त्वे',
    category: 'Smartphone Basics',
    difficulty: 'Beginner',
    duration_minutes: 10,
    summary: 'Learn how to turn your phone on safely, adjust brightness and volume, lock the screen, and charge the battery without overheating.',
    steps: [
      'Locate the Power button on the side edge and press briefly to wake or lock the screen.',
      'Use the Volume Up and Volume Down buttons next to it to hear calls and videos clearly.',
      'Swipe down gently from the top edge of the screen to open Quick Settings for brightness and Wi-Fi.',
      'Always use the original charger cable and unplug once the battery reaches 90% to 100%.'
    ],
    audio_script: 'Welcome to lesson one. Let us learn your smartphone buttons calmly. On the right side edge, the short button wakes up or locks your screen. The longer button adjusts the volume. Always charge your phone on a hard, dry table rather than under a pillow.',
    simulator_task: 'wifi-toggle',
    quiz: [
      {
        question: 'Where should you place your phone while charging?',
        options: ['Under your pillow', 'On a hard, flat, dry surface', 'Inside a wet bathroom'],
        correctIndex: 1,
        explanation: 'A hard, flat, dry surface keeps the battery cool and safe.'
      },
      {
        question: 'How do you open Quick Settings like Brightness and Wi-Fi?',
        options: ['Swipe down from the top edge', 'Shake the phone', 'Press Power 5 times'],
        correctIndex: 0,
        explanation: 'Swiping down gently from the top opens your Quick Settings.'
      }
    ],
    sort_order: 1
  },
  {
    id: 'course-02',
    title: 'Making Text Larger & Easier to Read',
    title_hi: 'अक्षरों को बड़ा और पढ़ने में आसान बनाना',
    title_mr: 'अक्षरे मोठी आणि वाचण्यास सोपी करणे',
    category: 'Smartphone Basics',
    difficulty: 'Beginner',
    duration_minutes: 8,
    summary: 'Increase font size, enable bold text, and adjust screen timeout so you never strain your eyes or feel rushed.',
    steps: [
      'Open the Settings app (the gear-shaped icon).',
      'Tap Display or Accessibility, then select Font Size and Display Size.',
      'Slide the size bar to Large or Extra Large until words look crisp and comfortable.',
      'Set Screen Timeout to 2 minutes so the screen does not turn off while you read.'
    ],
    audio_script: 'If phone words feel too tiny, you can make them larger in two minutes. Open Settings, tap Display, and move the Font Size slider to the right until reading feels effortless.',
    simulator_task: 'font-size',
    quiz: [
      {
        question: 'Which icon opens your phone Settings?',
        options: ['Camera icon', 'Gear wheel icon', 'Envelope icon'],
        correctIndex: 1,
        explanation: 'The gear icon always opens Settings on Android and iPhone.'
      }
    ],
    sort_order: 2
  },
  {
    id: 'course-03',
    title: 'Connecting Safely to Home Wi-Fi & Mobile Data',
    title_hi: 'घर के वाई-फ़ाई और मोबाइल डेटा से सुरक्षित जुड़ना',
    title_mr: 'घरच्या वाय-फाय आणि मोबाइल डेटाशी सुरक्षित जोडणी',
    category: 'Smartphone Basics',
    difficulty: 'Beginner',
    duration_minutes: 10,
    summary: 'Understand the difference between home Wi-Fi and mobile data, and learn why public open Wi-Fi should not be used for banking.',
    steps: [
      'Open Settings > Wi-Fi and switch Wi-Fi ON.',
      'Select your home network name and enter your family router password.',
      'Notice the curved Wi-Fi fan icon at the top when connected.',
      'Avoid entering bank passwords or UPI PINs when connected to free public Wi-Fi at stations or cafes.'
    ],
    audio_script: 'Home Wi-Fi saves your mobile data plan when watching videos or calling family. Always keep a password on home Wi-Fi and avoid banking on unknown free public Wi-Fi.',
    simulator_task: 'wifi-toggle',
    quiz: [
      {
        question: 'Should you do UPI payments on free public airport Wi-Fi?',
        options: ['Yes, it is always safe', 'No, switch to your own mobile data for banking'],
        correctIndex: 1,
        explanation: 'Your own mobile SIM data is much safer for banking than open public Wi-Fi.'
      }
    ],
    sort_order: 3
  },
  {
    id: 'course-04',
    title: 'Saving & Calling Family Contacts Easily',
    title_hi: 'परिवार के संपर्क नंबर सहेजना और कॉल करना',
    title_mr: 'कुटुंबातील नंबर जतन करणे आणि कॉल करणे',
    category: 'Smartphone Basics',
    difficulty: 'Beginner',
    duration_minutes: 9,
    summary: 'Save important family and doctor phone numbers with clear names and mark favourites for one-tap calling.',
    steps: [
      'Open the Phone or Contacts app.',
      'Tap the Plus (+) button to create a new contact.',
      'Type a clear name such as "Dr. Mehta Clinic" or "Son - Rahul" and enter the 10-digit number.',
      'Tap the Star icon to add them to your Favorites tab for instant calling.'
    ],
    audio_script: 'Saving contacts clearly helps you recognize who is calling right away. Tap the star icon on your closest family members so they stay at the top of your Phone app.',
    simulator_task: 'whatsapp-reply',
    quiz: [
      {
        question: 'What does tapping the Star icon on a contact do?',
        options: ['Deletes the number', 'Adds them to Favorites for quick calling', 'Blocks their calls'],
        correctIndex: 1,
        explanation: 'Favorites puts your most important people right at the top.'
      }
    ],
    sort_order: 4
  },
  {
    id: 'course-05',
    title: 'WhatsApp Basics: Reading & Sending Messages',
    title_hi: 'व्हाट्सऐप मूल बातें: संदेश पढ़ना और भेजना',
    title_mr: 'व्हॉट्सॲप मूलतत्त्वे: संदेश वाचणे आणि पाठवणे',
    category: 'WhatsApp',
    difficulty: 'Beginner',
    duration_minutes: 12,
    summary: 'Open chats comfortably, reply using typing or voice notes, and understand message checkmarks.',
    steps: [
      'Tap the green WhatsApp icon to see your list of recent family chats.',
      'Tap any person name to open the conversation.',
      'Tap the white box at the bottom ("Message") to type, or hold the green Microphone icon to speak a voice note.',
      'Two blue ticks mean your message was read by the recipient.'
    ],
    audio_script: 'WhatsApp lets you send messages and voice notes at no extra SMS charge. If typing feels slow, simply press and hold the green microphone button, speak warmly, and release to send.',
    simulator_task: 'whatsapp-reply',
    quiz: [
      {
        question: 'How can you send a spoken message on WhatsApp without typing?',
        options: ['Press and hold the green microphone button', 'Press the volume button', 'Turn off the screen'],
        correctIndex: 0,
        explanation: 'Holding the microphone records a voice note and releasing sends it.'
      }
    ],
    sort_order: 5
  },
  {
    id: 'course-06',
    title: 'WhatsApp Voice & Video Calls with Family',
    title_hi: 'परिवार के साथ व्हाट्सऐप वॉयस और वीडियो कॉल',
    title_mr: 'कुटुंबासोबत व्हॉट्सॲप व्हॉइस आणि व्हिडिओ कॉल',
    category: 'Video Calling',
    difficulty: 'Beginner',
    duration_minutes: 10,
    summary: 'Start clear one-on-one or family group video calls, switch front/back cameras, and mute safely.',
    steps: [
      'Open a family member chat in WhatsApp.',
      'Tap the Video Camera icon at the top right for a video call, or the Phone icon for audio only.',
      'Hold your phone at eye level in a well-lit room so your face is clearly visible.',
      'Tap the Red Phone button whenever you are ready to end the call.'
    ],
    audio_script: 'To see your grandchildren on video, open their WhatsApp chat and tap the camera icon at the top right. Sit facing a window or lamp so your face is bright and clear.',
    simulator_task: 'whatsapp-reply',
    quiz: [
      {
        question: 'Where is the video call button inside a WhatsApp chat?',
        options: ['At the top-right corner', 'Inside Settings', 'At the bottom-left'],
        correctIndex: 0,
        explanation: 'Both the video camera and phone icons sit at the top-right of the chat screen.'
      }
    ],
    sort_order: 6
  },
  {
    id: 'course-07',
    title: 'Sharing Photos Safely & Avoiding WhatsApp Forward Myths',
    title_hi: 'फ़ोटो सुरक्षित साझा करना और फ़ॉरवर्ड संदेशों से सावधानी',
    title_mr: 'फोटो सुरक्षित शेअर करणे आणि फॉरवर्ड संदेशांपासून सावधगिरी',
    category: 'WhatsApp',
    difficulty: 'Beginner',
    duration_minutes: 11,
    summary: 'Share family photos cleanly, manage group notifications, and recognize "Forwarded many times" misinformation or scam links.',
    steps: [
      'Inside a chat, tap the Paperclip or Camera icon to pick a photo from your Gallery.',
      'Before forwarding a shocking news message or "free gift" link, check for the "Forwarded many times" label.',
      'Never tap unknown APK files or lottery links even if sent inside a family group.',
      'Mute noisy groups by opening the group name > Notifications > Mute.'
    ],
    audio_script: 'Sometimes well-meaning friends forward fake gift links or false health rumours on WhatsApp. Always pause when you see Forwarded Many Times, and never install unknown APK files.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'If a WhatsApp message says "Forwarded many times" and offers a free government cash link, what should you do?',
        options: ['Tap it immediately', 'Do not tap the link and verify from official sources'],
        correctIndex: 1,
        explanation: 'Scammers spread fake reward links through forwards. Never tap unverified links.'
      }
    ],
    sort_order: 7
  },
  {
    id: 'course-08',
    title: 'Google Meet & Zoom Video Calls for Doctors and Family',
    title_hi: 'डॉक्टर और परिवार के लिए Google Meet और Zoom वीडियो कॉल',
    title_mr: 'डॉक्टर आणि कुटुंबासाठी Google Meet व Zoom व्हिडिओ कॉल',
    category: 'Video Calling',
    difficulty: 'Intermediate',
    duration_minutes: 12,
    summary: 'Join scheduled tele-health appointments or family celebrations using a meeting link without confusion.',
    steps: [
      'Tap the meeting link sent by your doctor or family five minutes before the appointment.',
      'Allow camera and microphone permissions if prompted once.',
      'Check the Microphone and Camera buttons at the bottom before tapping "Join Now".',
      'Tap the Red Hang-Up button when the consultation finishes.'
    ],
    audio_script: 'Tele-health appointments let you speak with doctors from home. Tap the meeting link a few minutes early, test your audio, and tap Join Now.',
    simulator_task: 'whatsapp-reply',
    quiz: [
      {
        question: 'When should you tap a scheduled video consultation link?',
        options: ['5 minutes before the appointment time', 'Two days later'],
        correctIndex: 0,
        explanation: 'Joining 5 minutes early gives you calm time to check sound and light.'
      }
    ],
    sort_order: 8
  },
  {
    id: 'course-09',
    title: 'Email Basics: Reading, Replying & Spotting Fake Emails',
    title_hi: 'ईमेल की मूल बातें: पढ़ना, उत्तर देना और नकली ईमेल पहचानना',
    title_mr: 'ईमेलची मूलतत्त्वे: वाचणे, उत्तर देणे आणि बनावट ईमेल ओळखणे',
    category: 'Email',
    difficulty: 'Beginner',
    duration_minutes: 12,
    summary: 'Navigate your Gmail inbox, reply to messages cleanly, and inspect sender addresses to avoid phishing.',
    steps: [
      'Open Gmail and look at the Primary inbox tab for real messages from banks, doctors, and family.',
      'Tap Reply at the bottom of an email to answer only the sender.',
      'Check the actual sender email address carefully—banks never send official notices from "@gmail.com".',
      'Move suspicious emails to Spam or Delete without clicking embedded buttons.'
    ],
    audio_script: 'Always look closely at the sender email address. Real banks and government offices do not send official account warnings from free gmail or yahoo addresses.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'An email claiming to be from SBI comes from "sbi.kyc.update99@gmail.com". Is it genuine?',
        options: ['Yes', 'No, official banks do not use @gmail.com addresses'],
        correctIndex: 1,
        explanation: 'Impersonators use free email domains like gmail.com to trick people.'
      }
    ],
    sort_order: 9
  },
  {
    id: 'course-10',
    title: 'Safe Internet Browsing with Chrome & Google Search',
    title_hi: 'क्रोम और गूगल सर्च से सुरक्षित इंटरनेट ब्राउज़िंग',
    title_mr: 'क्रोम आणि गुगल सर्चसह सुरक्षित इंटरनेट वापर',
    category: 'Internet Browsing',
    difficulty: 'Beginner',
    duration_minutes: 11,
    summary: 'Search clearly by typing or speaking, recognize the padlock/HTTPS address bar, and close unwanted browser tabs.',
    steps: [
      'Open Chrome and tap the search bar or the Microphone icon to speak your question.',
      'Skip top results labeled "Sponsored" if you are searching for customer care numbers.',
      'Look up official company numbers only on the back of your bank card or the official ".gov.in" / ".co.in" site.',
      'Tap the small numbered square at the top right to close extra open tabs.'
    ],
    audio_script: 'Never call the first customer care number that shows up in a search ad. Fraudsters pay for fake ads. Always check the back of your debit card or the official website.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'Where is the safest place to find your bank customer care number?',
        options: ['A random social media comment', 'The back of your physical bank card or official bank app', 'A search result labeled Sponsored'],
        correctIndex: 1,
        explanation: 'Printed numbers on your bank card or inside your official bank app are verified.'
      }
    ],
    sort_order: 10
  },
  {
    id: 'course-11',
    title: 'Using Google Maps for Directions & Live Location',
    title_hi: 'रास्ते और लाइव लोकेशन के लिए गूगल मैप्स का उपयोग',
    title_mr: 'दिशा आणि लाइव्ह लोकेशनसाठी गुगल मॅप्सचा वापर',
    category: 'Google Maps',
    difficulty: 'Beginner',
    duration_minutes: 11,
    summary: 'Search nearby pharmacies or clinics, check travel time, and safely share your live trip only with trusted family.',
    steps: [
      'Open Google Maps and tap the Search box at the top.',
      'Type a place like "Apollo Pharmacy near me" or tap the Microphone to speak it.',
      'Tap Directions to see walking, auto, or car routes and estimated arrival time.',
      'To share your ride with family, tap your blue location dot > Share location > choose a specific trusted family member.'
    ],
    audio_script: 'Google Maps helps you find nearby hospitals, parks, and temples easily. You can also share your live trip with a trusted son or daughter for a set duration like one hour.',
    simulator_task: 'wifi-toggle',
    quiz: [
      {
        question: 'Can you limit how long your live location is shared on Google Maps?',
        options: ['Yes, you can choose 1 hour or turn it off anytime', 'No, it stays on forever'],
        correctIndex: 0,
        explanation: 'You always control who sees your location and for how long.'
      }
    ],
    sort_order: 11
  },
  {
    id: 'course-12',
    title: 'Enjoying YouTube: Music, Devotionals, Recipes & Health Talks',
    title_hi: 'यूट्यूब का आनंद: संगीत, भजन, रेसिपी और स्वास्थ्य वार्ता',
    title_mr: 'यूट्यूबचा आनंद: संगीत, भजने, पाककृती आणि आरोग्य माहिती',
    category: 'YouTube',
    difficulty: 'Beginner',
    duration_minutes: 9,
    summary: 'Search videos comfortably, use Pause/Captions/Fullscreen, and save favorite channels without subscribing to scams.',
    steps: [
      'Open YouTube and tap the magnifying glass Search icon at the top.',
      'Tap the Microphone to speak what you want, such as "classical flute music" or "chair yoga for seniors".',
      'Tap CC on the video player to turn on readable subtitles.',
      'Be cautious of YouTube videos promising miracle cures or instant lottery money.'
    ],
    audio_script: 'YouTube is wonderful for music, cooking, gardening, and gentle exercises. Tap the CC button on any video to turn on clear text captions while listening.',
    simulator_task: 'font-size',
    quiz: [
      {
        question: 'What does the CC button on a YouTube video do?',
        options: ['Turns on text captions/subtitles', 'Deletes the video', 'Calls someone'],
        correctIndex: 0,
        explanation: 'CC stands for Closed Captions, which show spoken words on screen.'
      }
    ],
    sort_order: 12
  },
  {
    id: 'course-13',
    title: 'UPI Safety Golden Rule: PIN Is Only for Sending Money',
    title_hi: 'यूपीआई सुरक्षा का सुनहरा नियम: पिन केवल पैसे भेजने के लिए है',
    title_mr: 'यूपीआय सुरक्षिततेचा सुवर्ण नियम: पिन फक्त पैसे पाठवण्यासाठी असतो',
    category: 'UPI Safety',
    difficulty: 'Beginner',
    duration_minutes: 12,
    summary: 'Learn the single most important rule in Indian digital payments: you NEVER enter your UPI PIN to receive money.',
    steps: [
      'Remember the Golden Rule: Entering your UPI PIN ALWAYS takes money OUT of your bank account.',
      'To receive money from family or a refund, you do NOT need to enter a PIN or scan a QR code.',
      'If a stranger sends a "Collect Request" popup saying "Enter PIN to receive Rs. 5,000", decline it immediately.',
      'Never share your 4-digit or 6-digit UPI PIN with anyone, including bank callers.'
    ],
    audio_script: 'Please remember this golden rule of UPI. You never enter your UPI PIN to receive money. You only enter your UPI PIN when paying money out. Any request asking for your PIN to receive a refund or prize is a scam.',
    simulator_task: 'upi-safety',
    quiz: [
      {
        question: 'A buyer on OLX says they sent you money and asks you to enter your UPI PIN to receive it. What happens if you enter your PIN?',
        options: ['You receive the money', 'Money is deducted from YOUR account'],
        correctIndex: 1,
        explanation: 'Entering a UPI PIN always authorizes sending money out of your bank account.'
      }
    ],
    sort_order: 13
  },
  {
    id: 'course-14',
    title: 'Paying Bills & Scanning Shop QR Codes Safely',
    title_hi: 'बिल भरना और दुकान के क्यूआर कोड को सुरक्षित स्कैन करना',
    title_mr: 'बिले भरणे आणि दुकानाचा क्यूआर कोड सुरक्षित स्कॅन करणे',
    category: 'Digital Payments',
    difficulty: 'Intermediate',
    duration_minutes: 12,
    summary: 'Verify shopkeeper names before paying, double-check payment amounts, and keep transaction receipts cleanly.',
    steps: [
      'Open your trusted UPI app (BHIM, Google Pay, or PhonePe) and tap Scan QR.',
      'After scanning the shop QR standee, read the merchant name aloud with the shopkeeper to confirm.',
      'Carefully check the digits—make sure you typed 250 and not 2500.',
      'Enter your PIN privately while covering the keypad and wait for the green checkmark.'
    ],
    audio_script: 'When paying at a grocery or pharmacy, check two things before entering your PIN: verify the shop name shown on screen and double-check the exact rupee amount.',
    simulator_task: 'upi-safety',
    quiz: [
      {
        question: 'What should you verify on screen right before entering your UPI PIN at a shop?',
        options: ['The shopkeeper name and exact rupee amount', 'The weather outside'],
        correctIndex: 0,
        explanation: 'Always confirm both the recipient name and the rupee amount.'
      }
    ],
    sort_order: 14
  },
  {
    id: 'course-15',
    title: 'Spotting Fake KYC, Electricity & Bank Account Freeze Scams',
    title_hi: 'नकली केवाईसी, बिजली बिल और खाता बंद होने वाले घोटालों की पहचान',
    title_mr: 'बनावट केवायसी, वीज बिल आणि खाते बंद करण्याच्या फसवणुकीची ओळख',
    category: 'Online Fraud Awareness',
    difficulty: 'Beginner',
    duration_minutes: 13,
    summary: 'Recognize urgent SMS and WhatsApp threats claiming your electricity will be cut tonight or your bank KYC expired.',
    steps: [
      'Scammers create panic with messages like "Your power will be disconnected at 9:30 PM tonight".',
      'Look for personal 10-digit mobile numbers used in "official" warnings—real utilities use verified sender IDs and apps.',
      'Never call the number inside an urgent warning SMS; instead, open your official electricity or bank app directly.',
      'When in doubt, copy the suspicious message into Buddy Elder Scam Shield first.'
    ],
    audio_script: 'Fraudsters use urgency and fear—threatening power disconnection tonight or bank account blocking—to stop you from thinking calmly. Pause, take a breath, and check directly in your official bank or electricity app.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'You get an SMS from a personal mobile number saying your electricity will be cut in 2 hours unless you call them. What is this?',
        options: ['A common utility impersonation scam', 'A normal routine bill'],
        correctIndex: 0,
        explanation: 'Utility companies do not send sudden disconnection threats from random 10-digit personal numbers.'
      }
    ],
    sort_order: 15
  },
  {
    id: 'course-16',
    title: 'Never Share OTPs or Install Screen-Sharing Apps',
    title_hi: 'ओटीपी कभी साझा न करें और स्क्रीन-शेयरिंग ऐप इंस्टॉल न करें',
    title_mr: 'ओटीपी कधीही शेअर करू नका आणि स्क्रीन-शेअरिंग ॲप इन्स्टॉल करू नका',
    category: 'Cybersecurity',
    difficulty: 'Beginner',
    duration_minutes: 12,
    summary: 'Understand why One-Time Passwords (OTPs) and remote access apps like AnyDesk or TeamViewer give strangers total control of your phone.',
    steps: [
      'An OTP is like the key to your house—NO bank employee, police officer, or delivery agent needs your OTP to help you.',
      'Never install AnyDesk, TeamViewer, QuickSupport, or RustDesk because a caller asked you to.',
      'Screen-sharing apps let fraudsters watch your PINs and drain accounts silently.',
      'Hang up immediately if anyone pressures you to share an OTP or download an app.'
    ],
    audio_script: 'Never read out an OTP over the phone and never download AnyDesk or TeamViewer when a stranger asks. Remote access apps let scammers see everything on your screen.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'A "customer care" caller asks you to install AnyDesk to process your refund. What should you do?',
        options: ['Install it quickly', 'Hang up immediately—remote access apps are a major scam tactic'],
        correctIndex: 1,
        explanation: 'Legitimate customer care never asks you to install AnyDesk or TeamViewer.'
      }
    ],
    sort_order: 16
  },
  {
    id: 'course-17',
    title: 'Recognizing "Digital Arrest" & Fake Police Video Calls',
    title_hi: '"डिजिटल अरेस्ट" और नकली पुलिस वीडियो कॉल की पहचान',
    title_mr: '"डिजिटल अरेस्ट" आणि बनावट पोलीस व्हिडिओ कॉल ओळखणे',
    category: 'Online Fraud Awareness',
    difficulty: 'Beginner',
    duration_minutes: 12,
    summary: 'Learn why Indian police and courts NEVER conduct "digital arrests" over WhatsApp or Skype video calls or ask for money transfers.',
    steps: [
      'Scammers pose as CBI, Customs, TRAI, or Police officers on video calls claiming a parcel or SIM in your name was seized.',
      'Remember: There is NO such thing as a "Digital Arrest" under Indian law.',
      'Real law enforcement never asks you to stay on camera for hours or transfer money for "verification".',
      'Disconnect the call, call a trusted family member, and report on 1930 or cybercrime.gov.in.'
    ],
    audio_script: 'Please know this clearly: Police, CBI, and courts in India never place anyone under digital arrest on a video call and never demand money to clear your name. If someone threatens you on video, hang up and tell your family right away.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'Does Indian law have a procedure called "Digital Arrest" over video call?',
        options: ['Yes', 'No—it is 100% a criminal scam'],
        correctIndex: 1,
        explanation: 'Indian Cyber Crime Coordination Centre (I4C) confirms Digital Arrest is always a scam.'
      }
    ],
    sort_order: 17
  },
  {
    id: 'course-18',
    title: 'Creating Strong Passwords & Keeping a Written Backup Safely',
    title_hi: 'मज़बूत पासवर्ड बनाना और उन्हें सुरक्षित डायरी में रखना',
    title_mr: 'मजबूत पासवर्ड तयार करणे आणि सुरक्षित डायरीत ठेवणे',
    category: 'Cybersecurity',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    summary: 'Create memorable, strong passphrases instead of birthdays or 123456, and store them safely at home.',
    steps: [
      'Avoid using your birth year, phone number, or "123456" as a PIN or password.',
      'Combine three familiar words with a number, such as "MangoTree@2026" for strong protection.',
      'Use a different PIN for your phone screen lock and your UPI banking app.',
      'Write important passwords in a private physical notebook kept locked in a home drawer—never save them in WhatsApp chats.'
    ],
    audio_script: 'Never use your birthday or 1234 as your phone or bank PIN. Use a separate PIN for your phone lock and your UPI app, and keep a neat private notebook locked safely at home.',
    simulator_task: 'font-size',
    quiz: [
      {
        question: 'Where is a safer place to note your passwords than a WhatsApp chat?',
        options: ['A private notebook locked in a safe drawer at home', 'Posting them on Facebook'],
        correctIndex: 0,
        explanation: 'A physical notebook stored safely at home cannot be hacked remotely.'
      }
    ],
    sort_order: 18
  },
  {
    id: 'course-19',
    title: 'Managing Phone Storage & Cleaning Junk Safely',
    title_hi: 'फ़ोन स्टोरेज प्रबंधन और अनावश्यक फ़ाइलें सुरक्षित साफ़ करना',
    title_mr: 'फोन स्टोरेज व्यवस्थापन आणि अनावश्यक फाइल्स सुरक्षित साफ करणे',
    category: 'Smartphone Basics',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    summary: 'Free up space when "Storage Full" appears without accidentally deleting family photos or installing fake cleaner apps.',
    steps: [
      'Ignore popup ads claiming "Your phone has 14 viruses—download Cleaner Pro now!"—those ads are fake.',
      'Open your built-in Files app (like Files by Google) to review large forwarded videos.',
      'Delete duplicate Good Morning videos from WhatsApp chats while keeping precious family photos.',
      'Uninstall unused games or shopping apps you no longer need.'
    ],
    audio_script: 'If your phone feels slow or full, avoid random cleaner apps advertised on websites. Open your official Files app and remove heavy forwarded videos from WhatsApp groups.',
    simulator_task: 'wifi-toggle',
    quiz: [
      {
        question: 'A website popup flashes red saying "Your phone has a virus, click to clean". What should you do?',
        options: ['Close the browser tab—it is a fake scare ad', 'Click Clean Now immediately'],
        correctIndex: 0,
        explanation: 'Websites cannot scan your phone for viruses. Those popups try to trick you into installing bad apps.'
      }
    ],
    sort_order: 19
  },
  {
    id: 'course-20',
    title: 'Computer Basics: Keyboard, Mouse & Desktop Folders',
    title_hi: 'कंप्यूटर की मूल बातें: कीबोर्ड, माउस और डेस्कटॉप फ़ोल्डर',
    title_mr: 'संगणकाची मूलतत्त्वे: कीबोर्ड, माउस आणि डेस्कटॉप फोल्डर्स',
    category: 'Computer Basics',
    difficulty: 'Beginner',
    duration_minutes: 12,
    summary: 'Feel confident using a laptop or desktop computer—left-click vs right-click, scroll wheel, and organizing personal files.',
    steps: [
      'Use a gentle single left-click to select items, and a quick double left-click to open folders.',
      'Roll the center mouse wheel toward you to scroll down a webpage comfortably.',
      'Right-click once to open a small menu of helpful options like Rename or Copy.',
      'Create a dedicated folder named "Medical & Bills" on your Desktop so important PDFs stay easy to find.'
    ],
    audio_script: 'Using a computer mouse gets comfortable with gentle practice. Left-click selects, double-click opens, and the middle wheel scrolls smoothly down long pages.',
    simulator_task: 'font-size',
    quiz: [
      {
        question: 'Which mouse action scrolls smoothly up and down a webpage?',
        options: ['Rolling the center scroll wheel', 'Unplugging the mouse'],
        correctIndex: 0,
        explanation: 'The center scroll wheel moves pages up and down effortlessly.'
      }
    ],
    sort_order: 20
  },
  {
    id: 'course-21',
    title: 'Downloading & Reading Official PDFs Safely on Computer',
    title_hi: 'कंप्यूटर पर आधिकारिक पीडीएफ सुरक्षित डाउनलोड करना और पढ़ना',
    title_mr: 'संगणकावर अधिकृत पीडीएफ सुरक्षित डाउनलोड करणे आणि वाचणे',
    category: 'Computer Basics',
    difficulty: 'Intermediate',
    duration_minutes: 11,
    summary: 'Download bank statements or lab reports cleanly, find them in the Downloads folder, and zoom in comfortably.',
    steps: [
      'Download statements only from your official bank, hospital, or government portal.',
      'Open the Downloads folder in File Explorer to locate the saved ".pdf" file.',
      'Never open unknown files ending in ".exe", ".zip", or ".apk" sent by strangers.',
      'Press Ctrl and Plus (+) together on your keyboard to zoom text bigger inside any document.'
    ],
    audio_script: 'Official lab reports and bank statements always end in dot-PDF. Never double-click unknown dot-EXE or dot-ZIP attachments from unfamiliar emails.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'Which file type is standard for safe lab reports and bank statements?',
        options: ['.pdf', '.exe'],
        correctIndex: 0,
        explanation: '.pdf is the standard document format, while .exe runs executable programs.'
      }
    ],
    sort_order: 21
  },
  {
    id: 'course-22',
    title: 'Safe Online Shopping & Delivery Verification',
    title_hi: 'सुरक्षित ऑनलाइन खरीदारी और डिलीवरी सत्यापन',
    title_mr: 'सुरक्षित ऑनलाइन खरेदी आणि डिलिव्हरी पडताळणी',
    category: 'Safe Internet Usage',
    difficulty: 'Intermediate',
    duration_minutes: 11,
    summary: 'Shop on trusted apps, compare seller ratings, and check Cash-on-Delivery or open-box OTP rules.',
    steps: [
      'Buy only from well-known platforms or official pharmacy apps—avoid 90%-off ads on social media.',
      'Check customer reviews with real photos before ordering.',
      'Never pay a small "redelivery fee" through an unknown SMS link for a missed parcel.',
      'Share a Delivery OTP ONLY with the delivery person standing at your door with your verified parcel.'
    ],
    audio_script: 'Be careful with unbelievable 90 percent discount ads on social media. When expecting a real package, share the delivery OTP only when the delivery agent is physically at your doorstep.',
    simulator_task: 'upi-safety',
    quiz: [
      {
        question: 'An SMS asks you to pay Rs. 25 via a link to release a held courier parcel you never ordered. What should you do?',
        options: ['Pay immediately', 'Ignore and delete—it is a classic courier phishing trap'],
        correctIndex: 1,
        explanation: 'Real couriers do not ask for small card/UPI link payments to release surprise parcels.'
      }
    ],
    sort_order: 22
  },
  {
    id: 'course-23',
    title: 'Controlling App Permissions & Protecting Privacy',
    title_hi: 'ऐप अनुमतियों को नियंत्रित करना और गोपनीयता की रक्षा करना',
    title_mr: 'ॲप परवानग्यांवर नियंत्रण आणि गोपनीयतेचे संरक्षण',
    category: 'Safe Internet Usage',
    difficulty: 'Intermediate',
    duration_minutes: 10,
    summary: 'Review which apps can access your microphone, camera, contacts, and location, and turn off unnecessary access.',
    steps: [
      'A simple torchlight or calculator app NEVER needs access to your Contacts or SMS.',
      'Open Settings > Apps > Permissions to review Camera, Microphone, and Location access.',
      'Choose "While using the app" for Maps and Video Call apps rather than "Allow all the time".',
      'Install apps only from Google Play Store or Apple App Store—never from WhatsApp links.'
    ],
    audio_script: 'Think like a gatekeeper for your phone. A flashlight app does not need your contacts or messages. Check App Permissions in Settings and keep access minimal.',
    simulator_task: 'wifi-toggle',
    quiz: [
      {
        question: 'Does a simple flashlight or step-counter app need permission to read your SMS messages?',
        options: ['No—deny SMS permission', 'Yes, always allow everything'],
        correctIndex: 0,
        explanation: 'Only grant permissions that genuinely match what the app does.'
      }
    ],
    sort_order: 23
  },
  {
    id: 'course-24',
    title: 'Reporting Cyber Fraud Immediately: Helpline 1930 & cybercrime.gov.in',
    title_hi: 'साइबर धोखाधड़ी की तुरंत रिपोर्टिंग: हेल्पलाइन 1930 और cybercrime.gov.in',
    title_mr: 'सायबर फसवणुकीची त्वरित तक्रार: हेल्पलाइन १९३० आणि cybercrime.gov.in',
    category: 'Cybersecurity',
    difficulty: 'Beginner',
    duration_minutes: 10,
    summary: 'Know the exact Golden Hour steps to freeze fraudulent bank transfers in India by dialing 1930 and reporting online.',
    steps: [
      'Act quickly—the first 1 to 2 hours (Golden Hour) give banks the best chance to freeze stolen funds.',
      'Dial 1930 immediately from your phone (India National Cybercrime Helpline).',
      'File a detailed report with screenshots and transaction IDs at https://cybercrime.gov.in.',
      'Also call your bank official fraud desk to temporarily block your card or net banking.'
    ],
    audio_script: 'If you or someone you know ever loses money to an online scam, do not feel embarrassed—act immediately. Dial 1930 right away and file a report at cybercrime.gov.in so banks can freeze the fraudster account.',
    simulator_task: 'scam-alert',
    quiz: [
      {
        question: 'What is India official toll-free helpline number for reporting cyber financial fraud immediately?',
        options: ['1930', '5555'],
        correctIndex: 0,
        explanation: '1930 is the official National Cyber Crime Helpline in India, alongside cybercrime.gov.in.'
      }
    ],
    sort_order: 24
  }
];

export const SEED_RESEARCH_DOCS: SeedResearchDoc[] = [
  {
    id: 'res-01',
    title: 'Integrated Care for Older People (ICOPE): Guidelines on Community-Level Interventions to Manage Declines in Intrinsic Capacity',
    authors: 'World Health Organization (WHO)',
    year: 2017,
    category: 'Healthy Ageing',
    source_name: 'World Health Organization',
    source_url: 'https://www.who.int/publications/i/item/9789241550109',
    abstract: 'Evidence-based WHO guidelines providing guidance for community-level assessment and management of mobility, nutrition, visual and hearing impairment, cognitive capacity, and depressive symptoms among older adults.',
    key_findings: 'Person-centered care plans combining physical activity, sensory support, hydration/nutrition monitoring, and social engagement preserve intrinsic capacity and independence in community-dwelling older adults.'
  },
  {
    id: 'res-02',
    title: 'Dementia Prevention, Intervention, and Care: 2024 Report of the Lancet Standing Commission',
    authors: 'Gill Livingston, Jonathan Huntley, Kathy Y. Liu, et al.',
    year: 2024,
    category: 'Cognitive Health',
    source_name: 'The Lancet',
    source_url: 'https://www.thelancet.com/commissions/dementia-prevention-intervention-care',
    abstract: 'Comprehensive synthesis identifying 14 modifiable life-course risk factors for dementia, including hearing and vision loss, social isolation, physical inactivity, hypertension, and depression.',
    key_findings: 'Addressing hearing and vision accessibility, staying socially connected with family, maintaining regular physical movement, and lifelong cognitive learning meaningfully reduce preventable cognitive decline risks.'
  },
  {
    id: 'res-03',
    title: 'Citizen Manual for Reporting Cyber Crime and Financial Fraud (Helpline 1930 & NCRP)',
    authors: 'Indian Cyber Crime Coordination Centre (I4C), Ministry of Home Affairs',
    year: 2024,
    category: 'Digital Safety',
    source_name: 'National Cyber Crime Reporting Portal (India)',
    source_url: 'https://cybercrime.gov.in',
    abstract: 'Official public guidance detailing citizen procedures for reporting UPI fraud, KYC impersonation, remote access scams, and digital arrest threats through the 1930 helpline and cybercrime.gov.in.',
    key_findings: 'Immediate reporting within the Golden Hour via 1930 enables real-time inter-bank lien marking on suspected fraudulent transactions; citizens should never share OTPs, UPI PINs, or remote desktop access.'
  },
  {
    id: 'res-04',
    title: 'Digital Literacy and Financial Inclusion Among Senior Citizens in India',
    authors: 'HelpAge India Research & Policy Division',
    year: 2023,
    category: 'Digital Inclusion',
    source_name: 'HelpAge India',
    source_url: 'https://www.helpageindia.org',
    abstract: 'National survey examining smartphone adoption, digital payment hesitation, fear of online fraud, and family-assisted digital learning patterns among older adults across Indian urban and semi-urban regions.',
    key_findings: 'Hands-on guided practice, larger accessible typography, regional-language audio instructions, and scam-recognition training significantly increase senior confidence and independent digital usage.'
  },
  {
    id: 'res-05',
    title: 'Social Isolation and Loneliness Among Older Adults: Opportunities for the Health Care System',
    authors: 'National Academies of Sciences, Engineering, and Medicine',
    year: 2020,
    category: 'Mental & Social Wellbeing',
    source_name: 'National Academies Press',
    source_url: 'https://nap.nationalacademies.org/catalog/25663',
    abstract: 'Authoritative review of the health impact of social isolation and loneliness in later life and evidence-based family, community, and technology interventions that strengthen meaningful connection.',
    key_findings: 'Accessible video communication, regular daily check-ins, and respectful caregiver collaboration that preserves senior autonomy improve emotional wellbeing and reduce loneliness.'
  },
  {
    id: 'res-06',
    title: 'Web Content Accessibility Guidelines (WCAG) 2.2: Cognitive and Visual Accessibility for Older Users',
    authors: 'World Wide Web Consortium (W3C) Accessibility Guidelines Working Group',
    year: 2023,
    category: 'Accessibility Standards',
    source_name: 'W3C WAI',
    source_url: 'https://www.w3.org/TR/WCAG22/',
    abstract: 'International accessibility standard defining measurable criteria for minimum contrast ratios, adjustable text spacing, minimum touch target sizing, keyboard navigation, and clear error recovery.',
    key_findings: 'High color contrast (4.5:1+), generous touch targets, consistent navigation layouts, redundant audio/text modalities, and plain-language labels dramatically reduce cognitive load for older adults.'
  }
];
