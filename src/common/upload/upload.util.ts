// src/common/upload/upload.util.ts
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

const UPLOAD_ROOT = process.env.UPLOAD_ROOT || 'uploads';

/** Ensure dir exists */
function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Safe filename generator with better naming */
function filenameGenerator(_req: Request, file: Express.Multer.File, cb: (err: Error | null, name: string) => void) {
  const timestamp = Date.now();
  const rand = Math.round(Math.random() * 1e9);
  const ext = extname(file.originalname).toLowerCase();
  
  // Validate file extension
  if (!ext) {
    return cb(new Error('File must have an extension'), '');
  }
  
  const filename = `${timestamp}-${rand}${ext}`;
  cb(null, filename);
}

/** Enhanced storage factory with better path handling */
function makeStorage(subdir: string) {
  const abs = join(process.cwd(), UPLOAD_ROOT, subdir);
  ensureDir(abs);
  return diskStorage({
    destination: abs,
    filename: filenameGenerator,
  });
}

/** Enhanced mimetype validation */
const IMG_RE = /^image\/(jpe?g|png|webp|heic|heif|gif)$/i;
const PDF_RE = /^application\/pdf$/i;
const DOC_RE = /^application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i;

/** Enhanced file validation */
function validateImageFile(file: Express.Multer.File): boolean {
  // Check mimetype
  if (!IMG_RE.test(file.mimetype)) {
    return false;
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = extname(file.originalname).toLowerCase();
  
  return allowedExtensions.includes(ext);
}

/** Enhanced single-file factory with better error handling */
function makeSingleUpload(
  field: string, 
  subdir: string, 
  allowed: RegExp, 
  fileSizeMB = 2
) {
  return FileInterceptor(field, {
    storage: makeStorage(subdir),
    limits: { 
      fileSize: fileSizeMB * 1024 * 1024,
      files: 1
    },
    fileFilter: (_req, file, cb) => {
      try {
        // Check mimetype
        if (!allowed.test(file.mimetype)) {
          return cb(new BadRequestException(`Invalid file type. Only image files are allowed`), false);
        }
        
        // Additional validation for images (check extension)
        if (allowed === IMG_RE) {
          const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
          const ext = extname(file.originalname).toLowerCase();
          if (!allowedExtensions.includes(ext)) {
            return cb(new BadRequestException('Invalid image file extension'), false);
          }
        }
        
        cb(null, true);
      } catch (error) {
        cb(new BadRequestException('File validation error'), false);
      }
    },
  });
}

/** Multi-file factory with enhanced validation */
function makeArrayUpload(
  field: string, 
  subdir: string, 
  allowed: RegExp, 
  maxCount = 10, 
  fileSizeMB = 5
) {
  return FilesInterceptor(field, maxCount, {
    storage: makeStorage(subdir),
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      try {
        if (!allowed.test(file.mimetype)) {
          return cb(new BadRequestException(`Invalid file type. Only allowed file types are supported`), false);
        }
        
        // Additional validation for images (check extension)
        if (allowed === IMG_RE) {
          const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
          const ext = extname(file.originalname).toLowerCase();
          if (!allowedExtensions.includes(ext)) {
            return cb(new BadRequestException('Invalid image file extension'), false);
          }
        }
        
        cb(null, true);
      } catch (error) {
        cb(new BadRequestException('File validation error'), false);
      }
    },
  });
}

/** Mixed fields factory with enhanced validation */
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
      try {
        const rule = allowedMap[file.fieldname];
        if (!rule) {
          return cb(new BadRequestException(`No upload rule defined for field: ${file.fieldname}`), false);
        }
        
        if (!rule.test(file.mimetype)) {
          return cb(new BadRequestException(`Invalid file type for ${file.fieldname}. Only ${rule.source} files are allowed`), false);
        }
        
        cb(null, true);
      } catch (error) {
        cb(new BadRequestException('File validation error'), false);
      }
    },
  });
}

/** Enhanced public URL helper */
export function toPublicUrl(file: Express.Multer.File, subdir: string): string {
  return `/${UPLOAD_ROOT}/${subdir}/${file.filename}`.replace(/\\/g, '/');
}

/** File deletion helper */
export function deleteFile(filePath: string): boolean {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/** Get full file path */
export function getFullFilePath(subdir: string, filename: string): string {
  return join(process.cwd(), UPLOAD_ROOT, subdir, filename);
}

/** Extract filename from URL */
export function extractFilenameFromUrl(url: string): string | null {
  if (!url) return null;
  const parts = url.split('/');
  return parts[parts.length - 1] || null;
}

/** Validate file size before upload */
export function validateFileSize(file: Express.Multer.File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/** ===================== EDU-CRM specific helpers ===================== **/

// Enhanced photo upload functions with better validation
export const uploadUserPhoto = () => makeSingleUpload('photo', 'photo/users', IMG_RE, 5);
export const uploadTeacherPhoto = () => makeSingleUpload('photo', 'photo/teachers', IMG_RE, 5);
export const uploadStudentPhoto = () => makeSingleUpload('photo', 'photo/students', IMG_RE, 5);

// Document upload functions for future use
export const uploadUserDocument = () => makeSingleUpload('document', 'documents/users', PDF_RE, 10);
export const uploadTeacherDocument = () => makeSingleUpload('document', 'documents/teachers', PDF_RE, 10);
export const uploadStudentDocument = () => makeSingleUpload('document', 'documents/students', PDF_RE, 10);

// Multiple files upload for portfolios or galleries
export const uploadTeacherPortfolio = () => makeArrayUpload('portfolio', 'portfolio/teachers', IMG_RE, 10, 3);
export const uploadStudentPortfolio = () => makeArrayUpload('portfolio', 'portfolio/students', IMG_RE, 10, 3);

/** Upload response helper */
export interface UploadResponse {
  message: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimetype: string;
}

export function createUploadResponse(file: Express.Multer.File, subdir: string, message = 'File uploaded successfully'): UploadResponse {
  return {
    message,
    filename: file.filename,
    originalName: file.originalname,
    url: toPublicUrl(file, subdir),
    size: file.size,
    mimetype: file.mimetype,
  };
}

/** Batch upload response helper */
export function createBatchUploadResponse(files: Express.Multer.File[], subdir: string): {
  message: string;
  files: UploadResponse[];
  count: number;
} {
  return {
    message: `${files.length} file(s) uploaded successfully`,
    files: files.map(file => createUploadResponse(file, subdir, '')),
    count: files.length,
  };
}

/** File type validation helpers */
export const FileValidators = {
  isImage: (file: Express.Multer.File): boolean => IMG_RE.test(file.mimetype),
  isPDF: (file: Express.Multer.File): boolean => PDF_RE.test(file.mimetype),
  isDocument: (file: Express.Multer.File): boolean => DOC_RE.test(file.mimetype) || PDF_RE.test(file.mimetype),
  hasValidExtension: (file: Express.Multer.File, allowedExtensions: string[]): boolean => {
    const ext = extname(file.originalname).toLowerCase();
    return allowedExtensions.includes(ext);
  },
};

/** Configuration constants */
export const UploadConfig = {
  MAX_PHOTO_SIZE_MB: 5,
  MAX_DOCUMENT_SIZE_MB: 10,
  MAX_PORTFOLIO_SIZE_MB: 3,
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  ALLOWED_DOCUMENT_EXTENSIONS: ['.pdf', '.doc', '.docx'],
  UPLOAD_PATHS: {
    USER_PHOTOS: 'photo/users',
    TEACHER_PHOTOS: 'photo/teachers',
    STUDENT_PHOTOS: 'photo/students',
    USER_DOCUMENTS: 'documents/users',
    TEACHER_DOCUMENTS: 'documents/teachers',
    STUDENT_DOCUMENTS: 'documents/students',
    TEACHER_PORTFOLIO: 'portfolio/teachers',
    STUDENT_PORTFOLIO: 'portfolio/students',
  },
};

// Export enhanced versions with original names for backward compatibility
export { makeArrayUpload, makeFieldsUpload, PDF_RE, IMG_RE, DOC_RE, UPLOAD_ROOT, validateImageFile };
