import { GroupStatus, DayOfWeek } from '@prisma/client';

export class GroupResponseDto {
  id: number;
  name: string;
  courseId: number;
  roomId?: number | null;
  teacherId?: number | null;
  status: GroupStatus;
  days: DayOfWeek[];
  start_time?: string | null; // formatted as "HH:mm:ss"
  start_date?: string | null; // formatted as "YYYY-MM-DD"
  end_date?: string | null; // formatted as "YYYY-MM-DD"
  branchId: number;
  
  // Optional relations
  course?: {
    id: number;
    name: string;
    price: number;
    duration_months: number;
  };
  room?: {
    id: number;
    name: string;
    capacity: number;
  } | null;
  teacher?: {
    id: number;
    fullname: string;
    phone: string;
  } | null;
  branch?: {
    id: number;
    name: string;
  };
  _count?: {
    students: number;
  };
}

export class GroupsListResponseDto {
  data: GroupResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class GroupDetailResponseDto {
  id: number;
  name: string;
  courseId: number;
  roomId?: number | null;
  teacherId?: number | null;
  status: GroupStatus;
  days: DayOfWeek[];
  start_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  branchId: number;
  
  // Required relations for detail view
  course: {
    id: number;
    name: string;
    price: number;
    duration_months: number;
    duration_hours: number;
    description?: string | null;
  };
  room?: {
    id: number;
    name: string;
    capacity: number;
    description?: string | null;
  } | null;
  teacher?: {
    id: number;
    fullname: string;
    phone: string;
    email?: string | null;
  } | null;
  branch: {
    id: number;
    name: string;
    address?: string | null;
  };
  
  // Student count and list
  _count: {
    students: number;
  };
  students?: {
    id: string;
    fullname: string;
    phone: string;
  }[];
}

export class GroupStatisticsDto {
  total: number;
  byStatus: {
    planned: number;
    ongoing: number;
    completed: number;
  };
  byDays: {
    [key: string]: number; // MON: 5, TUE: 3, etc.
  };
  averageStudentsPerGroup: number;
  totalStudents: number;
}

export class GroupScheduleConflictDto {
  conflictType: 'TEACHER_CONFLICT' | 'ROOM_CONFLICT';
  conflictingGroupId: number;
  conflictingGroupName: string;
  conflictDays: DayOfWeek[];
  conflictTime: string;
}