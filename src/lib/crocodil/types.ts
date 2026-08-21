// ============================================================
// CROCODIL — Medikal SLP Takip Sistemi
// Tip Tanımlamaları
// ============================================================

export type Gender = "erkek" | "kadın" | "belirtilmemiş";
export type Handedness = "sağ" | "sol" | "çift";
export type SessionMode = "klinik" | "ev" | "online" | "hastane";
export type SeverityLevel = "hafif" | "orta" | "ağır" | "çok-ağır";
export type AssessmentCategory =
  | "personal"
  | "language"
  | "articulation"
  | "fluency"
  | "voice"
  | "dysphagia"
  | "aphasia"
  | "aac"
  | "motorSpeech"
  | "socialComm"
  | "icf"
  | "conclusion";

// ──────────────────────────────────────────
// DANIŞAN
// ──────────────────────────────────────────
export interface Client {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Kişisel bilgiler
  firstName: string;
  lastName: string;
  birthDate: string; // ISO
  gender: Gender;
  handedness: Handedness;
  idNumber?: string; // TC (opsiyonel)
  phone?: string;
  email?: string;
  address?: string;

  // Ebeveyn/Bakıcı (çocuk hastalar için)
  parentName?: string;
  parentPhone?: string;
  parentRelation?: string;

  // Klinik bilgiler
  referralSource?: string;
  referralDiagnosis?: string;
  primaryDiagnosis?: string;
  insuranceType?: "SGK" | "özel" | "yok" | "diğer";
  insuranceName?: string;

  // Google Calendar bağlantısı
  googleEventId?: string;
  googleCalendarLinked?: boolean;

  // Durum
  status: "aktif" | "pasif" | "tamamlandı";
  notes?: string;
  avatarInitials?: string; // Otomatik hesaplanır
  colorTag?: string; // Listede renk rozeti
}

// ──────────────────────────────────────────
// TAKVİM RANDEVU (Google'dan gelen veya Manuel)
// ──────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  clientId?: string; // Bağlı danışan yoksa boş
  title: string;
  start: string; // ISO datetime
  end: string;
  type: "google" | "manual";
  sessionType?: string; // Terapi / Değerlendirme / İlk görüşme
  notes?: string;
  googleEventId?: string;
  color?: string;
  packageId?: string; // Bağlı olduğu seans paketi ID'si
  packageSessionNumber?: number; // Örn: 1 (1. seans)
  totalPackageSessions?: number; // Örn: 10 (10 seanslık paket)
}

// ──────────────────────────────────────────
// SABİT SAATLİ SEANS PAKETİ (RECURRING THERAPY PACKAGE)
// ──────────────────────────────────────────
export interface RecurringPackageSlot {
  dayOfWeek: number; // 1: Pazartesi, 2: Salı, 3: Çarşamba, 4: Perşembe, 5: Cuma, 6: Cumartesi, 0: Pazar
  startTime: string; // "15:00"
  durationMinutes: number; // 45
}

export interface RecurringPackage {
  id: string;
  clientId: string;
  createdAt: string;
  sessionType: string;
  totalSessions: number; // Örn: 10
  completedSessions: number; // Tamamlanan seans sayısı
  frequency: "haftada-1" | "haftada-2" | "haftada-3" | "2-haftada-1";
  timeSlots: RecurringPackageSlot[];
  startDate: string; // ISO datetime
  endDate?: string;
  status: "aktif" | "tamamlandı" | "uzatıldı" | "iptal";
  notes?: string;
}

// ──────────────────────────────────────────
// DEĞERLENDİRME
// ──────────────────────────────────────────
export interface Assessment {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  assessor: string;
  selectedCategories: AssessmentCategory[];
  status: "devam" | "tamamlandı";

  // Her kategori ayrı obje
  personal?: any;
  language?: any;
  articulation?: any;
  fluency?: any;
  voice?: any;
  dysphagia?: any;
  aphasia?: any;
  aac?: any;
  motorSpeech?: any;
  socialComm?: any;
  icf?: any;
  conclusion?: any;
}

export interface PersonalInfo {
  complaint: string;
  historyNotes: string;
  previousTherapy: boolean;
  previousTherapyDetails?: string;
  medications?: string;
  medicalHistory?: string;
  familyHistory?: string;
  // Gelişimsel (çocuklar için)
  firstWord?: string; // ay olarak
  firstSentence?: string;
  walkingAge?: string;
}

export interface LanguageAssessment {
  // Alıcı dil
  receptiveTests: TestScore[];
  receptiveNotes?: string;
  // İfade edici dil
  mlu?: number;
  tnw?: number;
  ndw?: number;
  expressive_notes?: string;
  // Pragmatik
  pragmaticNotes?: string;
  pragmaticScore?: number;
  // Okuma-yazma
  literacyNotes?: string;
}

export interface TestScore {
  testName: string;
  subtestName?: string;
  rawScore?: number;
  standardScore?: number;
  percentile?: number;
  ageEquivalent?: string;
  notes?: string;
}

export interface ArticulationAssessment {
  soundInventory: SoundInventoryItem[];
  vowelInventory?: SoundInventoryItem[];
  tests: TestScore[];
  phonologicalProcesses: string[];
  intelligibilityFamiliar?: number; // %
  intelligibilityUnfamiliar?: number; // %
  stimulabilityNotes?: string;
  notes?: string;
}

export interface SoundInventoryItem {
  sound: string; // IPA sembolü
  status: "correct" | "error" | "absent";
  errorType?: "substitution" | "omission" | "distortion" | "addition" | "neutralization" | "lengthening";
  errorPosition?: ("initial" | "medial" | "final")[];
  substitution?: string;
  stimulable?: boolean;
  notes?: string;
}

export interface FluencyAssessment {
  type: "stuttering" | "cluttering" | "neurogenic" | "mixed" | null;
  // SSI-4
  ssi4FrequencyScore?: number;
  ssi4DurationScore?: number;
  ssi4PhysicalScore?: number;
  ssi4Total?: number;
  ssi4Severity?: string;
  sldPercent?: number;
  avgDurationSeconds?: number;
  // OASES
  oasesSection1?: number;
  oasesSection2?: number;
  oasesSection3?: number;
  oasesSection4?: number;
  oasesTotal?: number;
  avoidanceBehaviors: string[];
  physicalConcomitants: string[];
  contextVariability?: string;
  notes?: string;
}

export interface VoiceAssessment {
  // GRBAS
  grbasG?: 0 | 1 | 2 | 3;
  grbasR?: 0 | 1 | 2 | 3;
  grbasB?: 0 | 1 | 2 | 3;
  grbasA?: 0 | 1 | 2 | 3;
  grbasS?: 0 | 1 | 2 | 3;
  // CAPE-V
  capevOverallSeverity?: number; // 0-100 VAS
  capevRoughness?: number;
  capevBreathiness?: number;
  capevStrain?: number;
  capevPitch?: number;
  capevLoudness?: number;
  // VHI-10
  vhi10Total?: number;
  vhi10Items?: number[];
  // RSI (Reflux Symptom Index)
  rsiTotal?: number;
  rsiItems?: number[];
  // Akustik parametreler
  f0?: number; // Hz
  jitter?: number; // %
  shimmer?: number; // %
  hnr?: number; // dB
  cpps?: number; // dB
  avqi?: number;
  mpt?: number; // saniye
  // Klinik
  resonanceProfile?: "normal" | "hyponasale" | "hypernasale" | "mixed";
  pitchPerception?: "normal" | "low" | "high" | "variable";
  loudnessPerception?: "normal" | "low" | "high" | "variable";
  laryngologyNotes?: string;
  voiceUsageProfile?: string;
  notes?: string;
}

export interface DysphagiaAssessment {
  // CSE
  lipClosure?: "adequate" | "inadequate";
  chewing?: "normal" | "impaired" | "absent";
  bolusFormation?: "normal" | "impaired";
  anteriorLoss?: "none" | "minimal" | "moderate" | "severe";
  swallowReflexLatency?: number; // saniye
  laryngealElevation?: "adequate" | "reduced" | "absent";
  wetVoice?: boolean;
  reflexiveCough?: boolean;
  // FOIS
  foisScore?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  // IDDSI
  iddsiFoodLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  iddsiLiquidLevel?: 0 | 1 | 2 | 3 | 4;
  // EAT-10
  eat10Total?: number;
  // DOSS
  dossScore?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  // FEES
  fees?: FEESDocument;
  instrumentalRecommended?: boolean;
  instrumentalType?: "FEES" | "VFSS" | "her ikisi";
  notes?: string;
}

export interface FEESDocument {
  date: string;
  examiner: string;
  endoscopeType?: "flexible" | "rigid";
  secretionPooling?: string;
  vocalCordAppearance?: string;
  trialBoluses: FEESBolus[];
  compensatoryStrategiesTried: string[];
  summary?: string;
  recommendedDiet?: string;
}

export interface FEESBolus {
  consistency: string; // IDDSI seviyesi
  iddsiLevel: number;
  pasScore: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  residuePercent?: number;
  compensationUsed?: boolean;
  notes?: string;
}

export interface AphasiaAssessment {
  aphasiaType?: string;
  // WAB-R
  wabSpontaneousInfo?: number; // 0-10
  wabSpontaneousFluency?: number; // 0-10
  wabAuditoryComprehension?: number; // 0-200
  wabRepetition?: number; // 0-100
  wabNaming?: number; // 0-100
  wabAQ?: number; // Otomatik hesap
  // BDAE
  bdaeMelodicLine?: number; // 1-7
  bdaePhraseLength?: number;
  bdaeArticulatoryAgility?: number;
  bdaeGrammaticalForm?: number;
  bdaeParaphasia?: number;
  bdaeWordFinding?: number;
  // BNT (Boston Naming Test)
  bntRawScore?: number;
  bntSpontaneous?: number;
  bntCuedPhonemic?: number;
  // CETI
  cetiTotal?: number;
  cetiItems?: number[];
  // Modalite profili
  modalitySpoken?: SeverityLevel | null;
  modalityComprehension?: SeverityLevel | null;
  modalityReading?: SeverityLevel | null;
  modalityWriting?: SeverityLevel | null;
  modalityRepetition?: SeverityLevel | null;
  modalityNaming?: SeverityLevel | null;
  strengths?: string;
  notes?: string;
}

export interface AACAssessment {
  currentCommunicationModes: string[];
  communicationPartners: string[];
  communicationContexts: string[];
  symbolSystem?: string;
  languageCapacity?: "single" | "two-symbol" | "multi-word";
  motorAccess?: string;
  deviceRecommendation?: "none" | "lite-tech" | "mid-tech" | "high-tech";
  featureMatchingNotes?: string;
  notes?: string;
}

export interface MotorSpeechAssessment {
  // Tanı Kategorisi
  diagnosisType?: string;
  
  // Dizartri
  dysarthriaType?: string;
  intelligibilityEffect?: SeverityLevel | null;
  fda2Score?: number;
  fda2Notes?: string;
  
  // Apraksi (CAS / AOS)
  apraxiaType?: string;
  asrsScore?: number;
  apraxiaFeatures?: string[];
  apraxiaSeverity?: SeverityLevel | null;
  
  // Normal Gelişimde Motor Konuşma Etkilenmesi (Gelişimsel Koordinasyon Güçlüğü)
  typicalMotorFeatures?: string[];
  typicalMotorNotes?: string;
  
  // 5 Motor Konuşma Alt Sistemi
  respirationSupport?: "adequate" | "reduced" | "impaired";
  phonationQuality?: "normal" | "breathy" | "strained" | "wet" | "tremor";
  resonanceFunction?: "normal" | "hypernasal" | "hyponasal" | "nasal_emission" | "cul_de_sac";
  articulationPrecision?: "normal" | "slurred" | "distorted" | "inconsistent";
  prosodyControl?: "normal" | "monotone" | "excess_equal_stress" | "rate_irregular";

  // Oral Motor & DDK
  lipStructure?: string;
  tongueStructure?: string;
  palateFunctionNotes?: string;
  ddkRate?: string;
  ddkAccuracy?: "normal" | "reduced" | "impaired";
  ddkAmr?: number;
  ddkSmr?: number;
  ddkRegularity?: "regular" | "irregular" | "groping";
  
  // Modül 105 PROMPT İstasyonu Entegrasyonu
  m105SessionId?: number;
  m105Timestamp?: string;
  mandibularRomDeg?: number;
  semgAsymmetryPct?: number;
  respirationRateBpm?: number;
  f0MedianHz?: number;
  jitterPct?: number;
  shimmerPct?: number;
  hnrDb?: number;
  motorSynchronyIndex?: number;
  notes?: string;
}

export interface SocialCommAssessment {
  eyeContact?: 0 | 1 | 2 | 3;
  turnTaking?: 0 | 1 | 2 | 3;
  topicManagement?: 0 | 1 | 2 | 3;
  emotionRecognition?: 0 | 1 | 2 | 3;
  jointAttention?: 0 | 1 | 2 | 3;
  contextualAppropriacy?: 0 | 1 | 2 | 3;
  aq10Score?: number;
  participationRestrictions?: string;
  notes?: string;
}

export interface ICFProfile {
  bodyFunctions: ICFCode[];
  activities: ICFCode[];
  participation: ICFCode[];
  environmentalFactors: ICFCode[];
  personalFactors?: string;
}

export interface ICFCode {
  code: string;
  label: string;
  qualifier: 0 | 1 | 2 | 3 | 4; // 0=yok → 4=tam
  type: "barrier" | "facilitator" | "neutral";
  notes?: string;
}

export interface ConclusionAssessment {
  aiSummary?: string;
  editedSummary?: string;
  strengths?: string;
  priorityAreas: string[]; // Sıralı
  therapyFrequency?: string;
  therapyDuration?: string;
  format?: string; // bireysel / grup / aile
  referrals?: string;
  parentRecommendations?: string;
  nextAssessmentDate?: string;
  smartGoals?: SMARTGoal[];
}

// ──────────────────────────────────────────
// TERAPİ SEANS
// ──────────────────────────────────────────
export interface TherapySession {
  id: string;
  clientId: string;
  createdAt: string;
  sessionDate: string; // ISO
  durationMinutes: number;
  sessionMode: SessionMode;
  attendees?: string; // bakıcı, ebeveyn, vb.
  sessionNumber: number;

  // Hedefler
  goalProgress: GoalProgress[];

  // Teknikler ve aktiviteler
  techniquesUsed: string[];
  materials?: string;
  activities?: string;

  // Notlar
  clinicianNotes?: string;
  homeProgram?: string;
  hep?: HomeExerciseProgram;

  // Ebeveyn eğitimi
  parentTrainingNotes?: string;

  // Sonraki seans
  nextSessionPlan?: string;
}

export interface GoalProgress {
  goalId: string;
  accuracyPercent: number; // 0-100
  notes?: string;
}

export interface SMARTGoal {
  id: string;
  clientId: string;
  createdAt: string;
  icfCode?: string;
  description: string; // ICF-SMART format
  targetPercent: number; // Hedef % (genellikle 80)
  currentPercent: number;
  domain: "bodyFunction" | "activity" | "participation";
  status: "aktif" | "tamamlandı" | "revize";
  deadline?: string;
}

export interface SOAPNote {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

export interface HomeExerciseProgram {
  exercises: HEPExercise[];
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface HEPExercise {
  name: string;
  description: string;
  reps?: string;
  sets?: string;
  frequency?: string;
}

// ──────────────────────────────────────────
// AI MATERYAL
// ──────────────────────────────────────────
export type DisorderCategory =
  | "articulation"
  | "language"
  | "fluency"
  | "voice"
  | "dysphagia"
  | "aphasia"
  | "aac"
  | "motorSpeech"
  | "socialComm";

export type MaterialType =
  | "story"
  | "wordList"
  | "activityGame"
  | "homeProgram"
  | "sessionPlan"
  | "goalSuggestions"
  | "parentLetter";

export type AgeGroup = "infant" | "preschool" | "schoolAge" | "adult" | "elderly";

export interface AIGenerationRequest {
  disorder: DisorderCategory;
  materialType: MaterialType;
  ageGroup: AgeGroup;
  severity?: SeverityLevel;
  targetSound?: string;
  targetStructure?: string;
  applicationContext?: "clinic" | "home" | "school";
  language: "tr" | "en";
  additionalNotes?: string;
}

export interface AIGeneratedMaterial {
  id: string;
  createdAt: string;
  request: AIGenerationRequest;
  content: string;
  title: string;
}

// ──────────────────────────────────────────
// AYARLAR
// ──────────────────────────────────────────
export interface CrocodilSettings {
  pin: string; // Hashlenmiş
  clinicianName: string;
  clinicName?: string;
  geminiApiKey?: string;
  googleCalendarClientId?: string;
  googleCalendarLinked?: boolean;
  hospitalApiUrl?: string;
  hospitalApiKey?: string;
  theme: "light" | "dark";
}
