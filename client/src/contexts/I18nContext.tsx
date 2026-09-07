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

  // Restricted Access
  restricted_access: string;
  restricted_notice: string;
  sign_in_to_access: string;
}

const DICTIONARY: Record<Language, Translations> = {
  en: {
    portal_title: "VeriScan Forensic Command Center",
    govt_of_india: "GOVERNMENT OF INDIA",
    meity: "Ministry of Electronics & Information Technology (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "Digital India",
    sign_in: "Sign In",
    register: "Register",
    open_workspace: "Open Workspace",
    new_screening: "New Screening",

    intake_engine: "Document Ingestion Gateway",
    intake_title: "Document Ingestion & Screening",
    dropzone_title: "Ingest Document for Forensic Screening",
    dropzone_subtitle: "Drag file here or select from local storage / optical camera",
    select_file: "Select File",
    optical_camera: "Optical Camera",
    upload_limits: "PDF · JPG · PNG · WEBP · MAX 10 MB",
    client_enclave: "Client Enclave",
    zero_disk: "Zero Disk Retention",
    load_specimen: "Load Compliance Benchmark Specimen",
    staged_payload: "Payload Ready for Ingestion",
    execute_screening: "Run Forensic Screening",
    discard: "Discard",

    pipeline_status: "Pipeline Telemetry",
    engine_matrix: "Forensic Engine Health Matrix",
    all_systems_nominal: "All Systems Nominal",
    active: "Active",
    latency: "Latency",
    audit_ledger: "Institutional Audit Ledger",
    recent_records: "Recent Verification Records",
    view_full_ledger: "View Full Ledger",

    col_ref: "Reference",
    col_file: "Document",
    col_type: "Type",
    col_status: "Status",
    col_score: "Confidence",
    col_observation: "Observation",
    col_action: "Action",

    verified: "Verified",
    needs_review: "Needs Review",
    likely_forged: "Likely Forged",
    pass: "Pass",
    flag: "Flag",
    na: "N/A",

    confidence_score: "Confidence Score",
    dossier_ref: "Dossier Reference",
    tamper_zones: "Tampered Zones",
    show_zones: "Show Tamper Zones",
    hide_zones: "Hide Tamper Zones",
    coordinate_hud: "Coordinate HUD",
    req_human_review: "Request Human Review",
    copy_hash: "Copy SHA-256 Digest",
    export_pdf: "Export Certificate (PDF)",

    restricted_access: "Restricted Access · Verification Ledger",
    restricted_notice: "Institutional audit trails and document screening records are restricted to authenticated compliance officers and authorized personnel.",
    sign_in_to_access: "Sign In to Access Records",
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
    show_zones: "छेड़छाड़ क्षेत्र दिखाएं",
    hide_zones: "क्षेत्र छुपाएं",
    coordinate_hud: "निर्देशांक HUD",
    req_human_review: "मानवीय समीक्षा अनुरोध",
    copy_hash: "हैश कॉपी करें",
    export_pdf: "प्रमाण पत्र डाउनलोड (PDF)",

    restricted_access: "प्रतिबंधित पहुंच · सत्यापन बहीखाता",
    restricted_notice: "संस्थागत ऑडिट रिकॉर्ड और सत्यापन इतिहास केवल अधिकृत कर्मियों के लिए उपलब्ध हैं।",
    sign_in_to_access: "रिकॉर्ड देखने के लिए साइन इन करें",
  },
  mr: {
    portal_title: "व्हेरिस्कॅन फॉरेन्सिक कमांड सेंटर",
    govt_of_india: "भारत सरकार",
    meity: "इलेक्ट्रॉनिक्स आणि माहिती तंत्रज्ञान मंत्रालय (MeitY)",
    satyam_eva_jayate: "सत्यमेव जयते",
    digital_india: "Digital India",
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
    show_zones: "संशयित क्षेत्रे दाखवा",
    hide_zones: "क्षेत्रे लपवा",
    coordinate_hud: "निर्देशांक HUD",
    req_human_review: "मानवी पुनरावलोकन विनंती",
    copy_hash: "हॅश कॉपी करा",
    export_pdf: "प्रमाणपत्र डाउनलोड (PDF)",

    restricted_access: "मर्यादित प्रवेश · पडताळणी नोंदवही",
    restricted_notice: "संस्थात्मक ऑडिट नोंदी आणि पडताळणी इतिहास केवळ अधिकृत कर्मचाऱ्यांसाठी मर्यादित आहे.",
    sign_in_to_access: "नोंदी पाहण्यासाठी साइन इन करा",
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
