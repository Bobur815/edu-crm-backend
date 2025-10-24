import { Gender, StudentStatus } from '@prisma/client';

export class StudentResponseDto {
  id: string;
  fullname: string;
  email?: string | null;
  phone?: string | null;
  gender?: Gender | null;
  photo?: string | null;
  birthday?: string | null; // formatted as "YYYY-MM-DD"
  status: StudentStatus;
  other_details?: Record<string, any> | null;
  branchId: number;
  
  // Optional relations
  branch?: {
    id: number;
    name: string;
  };
  
  // Computed fields
  _count?: {
    studentGroups: number;
  };
  
  // Academic info
  enrollmentInfo?: {
    totalGroups: number;
    activeGroups: number;
    completedGroups: number;
  };
}

export class StudentsListResponseDto {
  data: StudentResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class StudentDetailResponseDto {
  id: string;
  fullname: string;
  email?: string | null;
  phone?: string | null;
  gender?: Gender | null;
  photo?: string | null;
  birthday?: string | null;
  status: StudentStatus;
  other_details?: Record<string, any> | null;
  branchId: number;
  
  // Required relations for detail view
  branch: {
    id: number;
    name: string;
    address?: string | null;
  };
  
  // Groups the student is enrolled in
  studentGroups: {
    id: number;
    group: {
      id: number;
      name: string;
      status: string;
      days: string[];
      start_time?: string | null;
      start_date?: string | null;
      end_date?: string | null;
      course: {
        id: number;
        name: string;
        price: number;
      };
      teacher?: {
        id: number;
        fullname: string;
      } | null;
      room?: {
        id: number;
        name: string;
      } | null;
    };
  }[];
  
  // Statistics
  _count: {
    studentGroups: number;
  };
  
  // Academic metrics
  academicInfo: {
    totalGroups: number;
    activeGroups: number;
    plannedGroups: number;
    completedGroups: number;
    totalCoursesEnrolled: number;
    currentCoursesEnrolled: number;
  };
}

export class StudentStatisticsDto {
  total: number;
  byStatus: {
    active: number;
    inactive: number;
  };
  byGender: {
    male: number;
    female: number;
    unspecified: number;
  };
  enrollmentStats: {
    totalEnrollments: number;
    activeEnrollments: number;
    averageGroupsPerStudent: number;
    studentsWithoutGroups: number;
  };
  ageDistribution: {
    under18: number;
    age18to25: number;
    age26to35: number;
    over35: number;
    unknown: number;
  };
  contactInfo: {
    withEmail: number;
    withPhone: number;
    withBoth: number;
    withNeither: number;
  };
}

export class EnrollStudentDto {
  groupId: number;
  studentId: string;
  branchId: number;
}

export class StudentEnrollmentResponseDto {
  id: number;
  groupId: number;
  studentId: string;
  branchId: number;
  enrolledAt: string;
  
  student: {
    id: string;
    fullname: string;
    email?: string | null;
    phone?: string | null;
  };
  
  group: {
    id: number;
    name: string;
    status: string;
    course: {
      id: number;
      name: string;
      price: number;
    };
  };
}