// Example: Enhanced upload endpoints for students and teachers controllers
// This demonstrates how to use the enhanced upload utility

import { Controller, Post, UseInterceptors, UploadedFile, Param, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { 
  uploadStudentPhoto, 
  uploadTeacherPhoto, 
  uploadStudentPortfolio, 
  uploadTeacherPortfolio,
  createUploadResponse,
  createBatchUploadResponse,
  toPublicUrl,
  deleteFile,
  getFullFilePath,
  extractFilenameFromUrl,
  UploadResponse,
  UploadConfig
} from './upload.util';

// Example for Students Controller
@Controller('students')
export class StudentsUploadExample {

  @Post(':id/upload-photo')
  @ApiOperation({ summary: 'Upload student photo' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', example: 'uuid-student-id' })
  @ApiResponse({
    status: 201,
    description: 'Photo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Photo uploaded successfully' },
        filename: { type: 'string', example: '1698123456789-123456789.jpg' },
        originalName: { type: 'string', example: 'student-photo.jpg' },
        url: { type: 'string', example: '/uploads/photo/students/1698123456789-123456789.jpg' },
        size: { type: 'number', example: 245760 },
        mimetype: { type: 'string', example: 'image/jpeg' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or size',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Only image files are allowed' }
      }
    }
  })
  @UseInterceptors(uploadStudentPhoto())
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size (additional check)
    if (file.size > UploadConfig.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      throw new BadRequestException(`File size exceeds ${UploadConfig.MAX_PHOTO_SIZE_MB}MB limit`);
    }

    // Here you would typically:
    // 1. Verify student exists
    // 2. Delete old photo if exists
    // 3. Update student record with new photo URL
    
    const response = createUploadResponse(file, UploadConfig.UPLOAD_PATHS.STUDENT_PHOTOS);
    
    // Example of updating student service (pseudo-code):
    // await this.studentsService.update(id, { photo: response.url });
    
    return response;
  }

  @Post(':id/upload-portfolio')
  @ApiOperation({ summary: 'Upload student portfolio images (multiple files)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', example: 'uuid-student-id' })
  @ApiResponse({
    status: 201,
    description: 'Portfolio images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '3 file(s) uploaded successfully' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              filename: { type: 'string' },
              originalName: { type: 'string' },
              url: { type: 'string' },
              size: { type: 'number' },
              mimetype: { type: 'string' }
            }
          }
        },
        count: { type: 'number', example: 3 }
      }
    }
  })
  @UseInterceptors(uploadStudentPortfolio())
  async uploadPortfolio(
    @Param('id') id: string,
    @UploadedFile() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = 15 * 1024 * 1024; // 15MB total
    if (totalSize > maxTotalSize) {
      throw new BadRequestException('Total file size exceeds 15MB limit');
    }

    return createBatchUploadResponse(files, UploadConfig.UPLOAD_PATHS.STUDENT_PORTFOLIO);
  }
}

// Example for Teachers Controller
@Controller('teachers')
export class TeachersUploadExample {

  @Post(':id/upload-photo')
  @ApiOperation({ summary: 'Upload teacher photo' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Photo uploaded successfully'
  })
  @UseInterceptors(uploadTeacherPhoto())
  async uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Get existing teacher to check for old photo
    // const teacher = await this.teachersService.findOne(id);
    
    // Delete old photo if exists
    // if (teacher.photo) {
    //   const oldFilename = extractFilenameFromUrl(teacher.photo);
    //   if (oldFilename) {
    //     const oldFilePath = getFullFilePath(UploadConfig.UPLOAD_PATHS.TEACHER_PHOTOS, oldFilename);
    //     deleteFile(oldFilePath);
    //   }
    // }

    const response = createUploadResponse(file, UploadConfig.UPLOAD_PATHS.TEACHER_PHOTOS);
    
    // Update teacher record
    // await this.teachersService.update(id, { photo: response.url });
    
    return response;
  }

  @Post(':id/replace-photo')
  @ApiOperation({ summary: 'Replace teacher photo (deletes old one)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(uploadTeacherPhoto())
  async replacePhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string; oldPhotoDeleted: boolean; newPhoto: UploadResponse }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // This is an example of how to handle photo replacement
    let oldPhotoDeleted = false;
    
    // Get current teacher photo
    // const teacher = await this.teachersService.findOne(id);
    // if (teacher.photo) {
    //   const oldFilename = extractFilenameFromUrl(teacher.photo);
    //   if (oldFilename) {
    //     const oldFilePath = getFullFilePath(UploadConfig.UPLOAD_PATHS.TEACHER_PHOTOS, oldFilename);
    //     oldPhotoDeleted = deleteFile(oldFilePath);
    //   }
    // }

    const newPhoto = createUploadResponse(file, UploadConfig.UPLOAD_PATHS.TEACHER_PHOTOS);
    
    // Update teacher record
    // await this.teachersService.update(id, { photo: newPhoto.url });

    return {
      message: 'Photo replaced successfully',
      oldPhotoDeleted,
      newPhoto
    };
  }
}

/* 
Integration Examples for Existing Controllers:

1. **Import the upload utility functions:**
```typescript
import { 
  uploadStudentPhoto, 
  uploadTeacherPhoto,
  createUploadResponse,
  UploadConfig,
  deleteFile,
  getFullFilePath,
  extractFilenameFromUrl
} from '../common/upload/upload.util';
```

2. **Replace existing FileInterceptor with utility function:**
```typescript
// OLD:
@UseInterceptors(
  FileInterceptor('photo', {
    storage: diskStorage({
      destination: './uploads/photo/teachers',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('Only image files are allowed'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }),
)

// NEW:
@UseInterceptors(uploadTeacherPhoto())
```

3. **Use response helper:**
```typescript
async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }
  
  // Create standardized response
  return createUploadResponse(file, UploadConfig.UPLOAD_PATHS.TEACHER_PHOTOS);
}
```

4. **Handle file deletion when updating:**
```typescript
async updatePhoto(id: number, @UploadedFile() file: Express.Multer.File) {
  const teacher = await this.teachersService.findOne(id);
  
  // Delete old photo if exists
  if (teacher.photo) {
    const oldFilename = extractFilenameFromUrl(teacher.photo);
    if (oldFilename) {
      const oldFilePath = getFullFilePath(UploadConfig.UPLOAD_PATHS.TEACHER_PHOTOS, oldFilename);
      deleteFile(oldFilePath);
    }
  }
  
  const response = createUploadResponse(file, UploadConfig.UPLOAD_PATHS.TEACHER_PHOTOS);
  await this.teachersService.update(id, { photo: response.url });
  
  return response;
}
```

Benefits of using the enhanced upload utility:
- ✅ Consistent file naming and validation
- ✅ Better error handling with proper exceptions
- ✅ Standardized response format
- ✅ File management utilities (delete, get path, etc.)
- ✅ Configuration constants for maintainability
- ✅ Enhanced security with better validation
- ✅ Support for multiple file types (photos, documents, portfolios)
- ✅ Proper directory structure organization
*/