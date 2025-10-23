export type TokenClaims = {
  sub: string; // 'user:1' | 'teacher:12' | 'student:uuid'
  role: string; // 'ADMIN' | 'MANAGER' | 'TEACHER' | 'STUDENT'
  iat?: number;
  exp?: number;
};