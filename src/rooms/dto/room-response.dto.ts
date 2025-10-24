export class RoomResponseDto {
  id: number;
  branchId: number;
  name: string;
  capacity: number;
  description?: string | null;
  
  // Optional relations
  branch?: {
    id: number;
    name: string;
  };
  
  // Computed fields
  _count?: {
    groups: number;
  };
  
  // Availability info
  isAvailable?: boolean;
  currentGroups?: number;
  utilizationRate?: number; // percentage of capacity being used
}

export class RoomsListResponseDto {
  data: RoomResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class RoomDetailResponseDto {
  id: number;
  branchId: number;
  name: string;
  capacity: number;
  description?: string | null;
  
  // Required relations for detail view
  branch: {
    id: number;
    name: string;
    address?: string | null;
  };
  
  // Groups using this room
  groups: {
    id: number;
    name: string;
    status: string;
    days: string[];
    start_time?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    _count: {
      students: number;
    };
  }[];
  
  // Statistics
  _count: {
    groups: number;
  };
  
  // Utilization metrics
  utilizationMetrics: {
    totalGroups: number;
    activeGroups: number;
    totalStudents: number;
    averageGroupSize: number;
    capacityUtilization: number; // percentage
    peakDaysUsage: { [day: string]: number };
  };
}

export class RoomStatisticsDto {
  total: number;
  totalCapacity: number;
  averageCapacity: number;
  utilizationStats: {
    totalGroups: number;
    totalStudents: number;
    averageUtilization: number;
    underutilizedRooms: number; // < 50% capacity
    overutilizedRooms: number; // > 90% capacity
  };
  capacityDistribution: {
    small: number; // 1-20
    medium: number; // 21-50
    large: number; // 51+
  };
  availabilityStats: {
    available: number;
    fullyBooked: number;
    partiallyBooked: number;
  };
}

export class RoomAvailabilityDto {
  roomId: number;
  roomName: string;
  isAvailable: boolean;
  conflictingGroups?: {
    id: number;
    name: string;
    days: string[];
    time: string;
  }[];
  availableTimeSlots?: {
    day: string;
    slots: string[];
  }[];
}