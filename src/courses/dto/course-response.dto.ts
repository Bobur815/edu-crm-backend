import { CourseStatus } from '@prisma/client';

export class CourseResponseDto {
  id: number;
  branchId: number;
  categoryId: number;
  name: string;
  status: CourseStatus;
  price: number;
  duration_hours: number;
  duration_months: number;
  description?: string | null;
  category?: {
    id: number;
    name: string;
  };
  branch?: {
    id: number;
    name: string;
  };
}

export class CoursesListResponseDto {
  data: CourseResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class CourseDetailResponseDto {
  id: number;
  branchId: number;
  categoryId: number;
  name: string;
  status: CourseStatus;
  price: number;
  duration_hours: number;
  duration_months: number;
  description?: string | null;
  category: {
    id: number;
    name: string;
  };
  branch: {
    id: number;
    name: string;
  };
}