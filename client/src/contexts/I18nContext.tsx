import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "hi" | "mr";

export interface Translations {
  // Top Masthead & Navigation
  portal_title: string;
  govt_of_india: string;
  meity: string;
  satyam_eva_jayate: string;
  digital_india: string;
  sign_in: string;
  register: string;
  open_workspace: string;
  new_screening: string;

  // Ingestion & Dropzone
  intake_engine: string;
  intake_title: string;
  dropzone_title: string;
  dropzone_subtitle: string;
  select_file: string;
  optical_camera: string;
  upload_limits: string;
  client_enclave: string;
  zero_disk: string;
  load_specimen: string;
  staged_payload: string;
  execute_screening: string;
  discard: string;

  // Pipeline & Telemetry
  pipeline_status: string;
  engine_matrix: string;
  all_systems_nominal: string;
  active: string;
  latency: string;
  audit_ledger: string;
  recent_records: string;
  view_full_ledger: string;

  // Table Headers
  col_ref: string;
  col_file: string;
  col_type: string;
  col_status: string;
  col_score: string;
  col_observation: string;
  col_action: string;

  // Verdicts & Statuses
  verified: string;
  needs_review: string;
  likely_forged: string;
  pass: string;
  flag: string;
  na: string;

  // Report & Loupe
  confidence_score: string;
  dossier_ref: string;
  tamper_zones: string;
  show_zones: string;
  hide_zones: string;
  coordinate_hud: string;
  req_human_review: string;
  copy_hash: string;
  export_pdf: string;
}

const DICTIONARY: Record<Language, Translations> = {
  en: {
    portal_title: "VeriScan Forensic Command Center",
    govt_of_india: "GOVERNMENT OF INDIA",
    meity: "Ministry of Electronics & Information Technology (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "DIGITAL_INDIA",
    sign_in: "SIGN IN",
    register: "REGISTER",
    open_workspace: "OPEN WORKSPACE",
    new_screening: "NEW SCREENING",

    intake_engine: "INTAKE ENGINE",
    intake_title: "Document Ingestion & Screening",
    dropzone_title: "Ingest Document for Forensic Screening",
    dropzone_subtitle: "Drag file here or select from local storage / optical camera",
    select_file: "SELECT FILE",
    optical_camera: "OPTICAL CAMERA",
    upload_limits: "PDF · JPG · PNG · WEBP · MAX 10 MB",
    client_enclave: "CLIENT ENCLAVE",
    zero_disk: "ZERO DISK RETENTION",
    load_specimen: "LOAD COMPLIANCE BENCHMARK SPECIMEN",
    staged_payload: "Payload Ready for Ingestion",
    execute_screening: "RUN FORENSIC SCREENING",
    discard: "DISCARD",

    pipeline_status: "PIPELINE STATUS",
    engine_matrix: "Forensic Engine Health Matrix",
    all_systems_nominal: "ALL SYSTEMS NOMINAL",
    active: "ACTIVE",
    latency: "LATENCY",
    audit_ledger: "AUDIT LEDGER",
    recent_records: "Recent Verification Records",
    view_full_ledger: "VIEW FULL LEDGER",

    col_ref: "REFERENCE",
    col_file: "DOCUMENT",
    col_type: "TYPE",
    col_status: "STATUS",
    col_score: "CONFIDENCE",
    col_observation: "OBSERVATION",
    col_action: "ACTION",

    verified: "VERIFIED",
    needs_review: "NEEDS REVIEW",
    likely_forged: "LIKELY FORGED",
    pass: "PASS",
    flag: "FLAG",
    na: "N/A",

    confidence_score: "CONFIDENCE SCORE",
    dossier_ref: "DOSSIER REF",
    tamper_zones: "Tampered Zones",
    show_zones: "[SHOW_TAMPER_ZONES]",
    hide_zones: "[HIDE_TAMPER_ZONES]",
    coordinate_hud: "COORDINATE_HUD",
    req_human_review: "[REQUEST_HUMAN_REVIEW]",
    copy_hash: "[COPY_HASH]",
    export_pdf: "[EXPORT_CERTIFICATE_PDF]",
  },
  hi: {
    portal_title: "वेरीस्कैन फोरेंसिक कमांड सेंटर",
    govt_of_india: "भारत सरकार",
    meity: "इलेक्ट्रॉनिकी और सूचना प्रौद्योगिकी मंत्रालय (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "डिजिटल_इंडिया",
    sign_in: "साइन इन करें",
    register: "पंजीकरण",
    open_workspace: "वर्कस्पेस खोलें",
    new_screening: "नया परीक्षण",

    intake_engine: "दस्तावेज़ अंतर्ग्रहण इंजन",
    intake_title: "दस्तावेज़ अंतर्ग्रहण और फोरेंसिक जांच",
    dropzone_title: "फोरेंसिक जांच हेतु दस्तावेज़ अपलोड करें",
    dropzone_subtitle: "फ़ाइल यहाँ खींचें या स्थानीय स्टोरेज / कैमरे से चुनें",
    select_file: "फ़ाइल चुनें",
    optical_camera: "ऑप्टिकल कैमरा",
    upload_limits: "PDF · JPG · PNG · WEBP · अधिकतम 10 MB",
    client_enclave: "सुरक्षित एन्क्लेव",
    zero_disk: "शून्य डिस्क संचय",
    load_specimen: "मानक नमूना दस्तावेज़ लोड करें",
    staged_payload: "जांच हेतु फ़ाइल तैयार",
    execute_screening: "फोरेंसिक जांच शुरू करें",
    discard: "रद्द करें",

    pipeline_status: "पाइपलाइन स्थिति",
    engine_matrix: "फोरेंसिक इंजन स्वास्थ्य स्थिति",
    all_systems_nominal: "सभी प्रणालियां सामान्य",
    active: "सक्रिय",
    latency: "विलंबता",
    audit_ledger: "ऑडिट बहीखाता",
    recent_records: "हाल के सत्यापन रिकॉर्ड",
    view_full_ledger: "पूरा बहीखाता देखें",

    col_ref: "संदर्भ कोड",
    col_file: "दस्तावेज़",
    col_type: "प्रकार",
    col_status: "स्थिति",
    col_score: "सत्यता गुणांक",
    col_observation: "निष्कर्ष",
    col_action: "कार्रवाई",

    verified: "सत्यापित",
    needs_review: "समीक्षा आवश्यक",
    likely_forged: "संभावित जाली",
    pass: "उत्तीर्ण",
    flag: "चिह्नित",
    na: "लागू नहीं",

    confidence_score: "सत्यता गुणांक",
    dossier_ref: "डोज़ियर संदर्भ",
    tamper_zones: "छेड़छाड़ किए गए क्षेत्र",
    show_zones: "[क्षेत्र दिखाएं]",
    hide_zones: "[क्षेत्र छुपाएं]",
    coordinate_hud: "निर्देशांक_एचयूडी",
    req_human_review: "[मानवीय समीक्षा अनुरोध]",
    copy_hash: "[हैश कॉपी करें]",
    export_pdf: "[पीडीएफ प्रमाण पत्र]",
  },
  mr: {
    portal_title: "व्हेरिस्कॅन फॉरेन्सिक कमांड सेंटर",
    govt_of_india: "भारत सरकार",
    meity: "इलेक्ट्रॉनिक्स आणि माहिती तंत्रज्ञान मंत्रालय (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "डिजिटल_इंडिया",
    sign_in: "साइन इन करा",
    register: "नोंदणी करा",
    open_workspace: "कार्यक्षेत्र उघडा",
    new_screening: "नवीन तपासणी",

    intake_engine: "दस्तऐवज दाखल यंत्रणा",
    intake_title: "दस्तऐवज दाखल आणि फॉरेन्सिक पडताळणी",
    dropzone_title: "फॉरेन्सिक तपासणीसाठी दस्तऐवज दाखल करा",
    dropzone_subtitle: "येथे फाइल ड्रॅग करा किंवा स्टोरेज / कॅमेरा निवडा",
    select_file: "फाइल निवडा",
    optical_camera: "कॅमेरा स्कॅन",
    upload_limits: "PDF · JPG · PNG · WEBP · कमाल 10 MB",
    client_enclave: "सुरक्षित एन्क्लेव्ह",
    zero_disk: "शून्य डिस्क संचय",
    load_specimen: "तपासणी नमुना दाखल करा",
    staged_payload: "तपासणीसाठी फाइल सज्ज",
    execute_screening: "फॉरेन्सिक तपासणी सुरू करा",
    discard: "रद्द करा",

    pipeline_status: "प्रणाली स्थिती",
    engine_matrix: "फॉरेन्सिक इंजिन स्थिती मॅट्रिक्स",
    all_systems_nominal: "सर्व यंत्रणा सुरळीत",
    active: "सक्रिय",
    latency: "विलंब",
    audit_ledger: "ऑडिट नोंदवही",
    recent_records: "नुकत्याच झालेल्या पडताळणी नोंदी",
    view_full_ledger: "संपूर्ण नोंदवही पहा",

    col_ref: "संदर्भ कोड",
    col_file: "दस्तऐवज",
    col_type: "प्रकार",
    col_status: "स्थिती",
    col_score: "विश्वासार्हता गुणांक",
    col_observation: "निष्कर्ष",
    col_action: "कृती",

    verified: "सत्यापित",
    needs_review: "पुनरावलोकन आवश्यक",
    likely_forged: "संभाव्य बनावट",
    pass: "उत्तीर्ण",
    flag: "चिन्हांकित",
    na: "लागू नाही",

    confidence_score: "विश्वासार्हता गुणांक",
    dossier_ref: "डोसियर संदर्भ",
    tamper_zones: "बनावट संशयित क्षेत्रे",
    show_zones: "[क्षेत्रे दाखवा]",
    hide_zones: "[क्षेत्रे लपवा]",
    coordinate_hud: "निर्देशांक_एचयूडी",
    req_human_review: "[मानवी पुनरावलोकन विनंती]",
    copy_hash: "[हॅश कॉपी करा]",
    export_pdf: "[प्रमाणपत्र पीडीएफ]",
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => DICTIONARY.en[key] || String(key),
});

const STORAGE_KEY = "veriscan_language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved && (saved === "en" || saved === "hi" || saved === "mr")) {
      return saved;
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  };

  const t = (key: keyof Translations): string => {
    const table = DICTIONARY[language] || DICTIONARY.en;
    return table[key] || DICTIONARY.en[key] || String(key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
