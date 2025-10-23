// src/common/upload/upload.util.ts
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || 'uploads';

/** Ensure dir exists */
function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Safe filename */
function filenameGenerator(_req: Request, file: Express.Multer.File, cb: (err: Error | null, name: string) => void) {
  const timestamp = Date.now();
  const rand = Math.round(Math.random() * 1e9);
  const original = (file.originalname || 'file')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  const dot = original.lastIndexOf('.');
  const base = dot > -1 ? original.slice(0, dot) : original;
  const ext = dot > -1 ? original.slice(dot) : '';
  cb(null, `${timestamp}-${rand}-${base}${ext}`.toLowerCase());
}

function makeStorage(subdir: string) {
  const abs = join(process.cwd(), UPLOAD_ROOT, subdir);
  ensureDir(abs);
  return diskStorage({
    destination: abs,
    filename: filenameGenerator,
  });
}

/** Mimetype helpers */
const IMG_RE = /^image\/(jpe?g|png|webp|heic|heif|gif)$/i;
const PDF_RE = /^application\/pdf$/i;

/** Single-file factory */
function makeSingleUpload(field: string, subdir: string, allowed: RegExp, fileSizeMB = 2) {
  return FileInterceptor(field, {
    storage: makeStorage(subdir),
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      allowed.test(file.mimetype) ? cb(null, true) : cb(new Error(`Only ${allowed} files allowed`), false);
    },
  });
}

/** Multi-file factory (kept for future use) */
function makeArrayUpload(field: string, subdir: string, allowed: RegExp, maxCount = 10, fileSizeMB = 5) {
  return FilesInterceptor(field, maxCount, {
    storage: makeStorage(subdir),
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      allowed.test(file.mimetype) ? cb(null, true) : cb(new Error(`Only ${allowed} files allowed`), false);
    },
  });
}

/** Mixed fields factory (kept for future use) */
function makeFieldsUpload(
  fields: { name: string; maxCount: number }[],
  subdir: string,
  allowedMap: Record<string, RegExp>,
  fileSizeMB = 10,
) {
  return FileFieldsInterceptor(fields, {
    storage: makeStorage(subdir),
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const rule = allowedMap[file.fieldname];
      if (!rule) return cb(new Error(`No rule for field: ${file.fieldname}`), false);
      rule.test(file.mimetype) ? cb(null, true) : cb(new Error(`Only ${rule} for ${file.fieldname}`), false);
    },
  });
}

/** Public URL helper */
export function toPublicUrl(file: Express.Multer.File, subdir: string) {
  return `/${UPLOAD_ROOT}/${subdir}/${file.filename}`.replace(/\\/g, '/');
}

/** ===================== EDU-CRM specific helpers ===================== **/

// One photo per entity using field name "photo"
export const uploadUserPhoto = () => makeSingleUpload('photo', 'users', IMG_RE, 3);       // 3MB
export const uploadTeacherPhoto = () => makeSingleUpload('photo', 'teachers', IMG_RE, 3); // 3MB
export const uploadStudentPhoto = () => makeSingleUpload('photo', 'students', IMG_RE, 3); // 3MB

// (Optional) exports for future use
export { makeArrayUpload, makeFieldsUpload, PDF_RE, IMG_RE, UPLOAD_ROOT };
