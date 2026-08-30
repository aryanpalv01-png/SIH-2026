import { demoDocuments, VerificationDocument } from "@/lib/veriscan";

const STORAGE_KEY = "veriscan-local-scans";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readLocalScans(): VerificationDocument[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VerificationDocument[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalScan(document: VerificationDocument) {
  if (!canUseStorage()) return;
  const next = [document, ...readLocalScans().filter((item) => item.id !== document.id)].slice(0, 20);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getPreviewDocuments() {
  const local = readLocalScans();
  return [...local, ...demoDocuments.filter((demo) => !local.some((item) => item.id === demo.id))];
}

export function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      resolve(value.includes(",") ? value.split(",")[1] ?? "" : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function getPreviewDocument(id?: string) {
  if (!id) return undefined;
  return getPreviewDocuments().find((document) => document.id === id);
}
