// src/auth/auth.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { CreateTeacherDto } from 'src/teachers/dto/create-teacher.dto';
import { CreateStudentDto } from 'src/students/dto/create-student.dto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { TokenClaims } from './types';

type Principal =
    | { kind: 'user'; id: number; role: UserRole; name: string; email: string }
    | { kind: 'teacher'; id: number; role: 'TEACHER'; fullname: string; email?: string | null; phone: string }
    | { kind: 'student'; id: string; role: 'STUDENT'; fullname: string; email?: string | null; phone?: string | null };

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
    ) { }

    private async hash(pw?: string | null) {
        if (!pw) return null;
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(pw, salt);
    }
    private async verify(pw: string, hash?: string | null) {
        if (!hash) return false;
        return bcrypt.compare(pw, hash);
    }

    private async findPrincipalByIdentifier(email?: string, phone?: string) {
        if (email) {
            const user = await this.prisma.user.findUnique({ where: { email } });
            if (user) return { table: 'user' as const, record: user };
        }
        if (phone) {
            const user = await this.prisma.user.findFirst({ where: { phone } });
            if (user) return { table: 'user' as const, record: user };
        }
        if (email) {
            const t = await this.prisma.teacher.findUnique({ where: { email } });
            if (t) return { table: 'teacher' as const, record: t };
        }
        if (phone) {
            const t = await this.prisma.teacher.findFirst({ where: { phone } });
            if (t) return { table: 'teacher' as const, record: t };
        }
        if (email) {
            const s = await this.prisma.student.findUnique({ where: { email } });
            if (s) return { table: 'student' as const, record: s };
        }
        if (phone) {
            const s = await this.prisma.student.findFirst({ where: { phone } });
            if (s) return { table: 'student' as const, record: s };
        }
        return null;
    }

    private signAccess(claims: TokenClaims) {
        const opts: JwtSignOptions = {
            secret: process.env.JWT_ACCESS_SECRET!,
            // cast to satisfy types in all versions
            expiresIn: (process.env.JWT_ACCESS_TTL ?? '900s') as unknown as number,
        };
        return this.jwt.sign(claims as Record<string, unknown>, opts);
    }

    private signRefresh(claims: TokenClaims) {
        const opts: JwtSignOptions = {
            secret: process.env.JWT_REFRESH_SECRET!,
            expiresIn: (process.env.JWT_REFRESH_TTL ?? '30d') as unknown as number,
        };
        return this.jwt.sign(claims as Record<string, unknown>, opts);
    }
    private decodeRefresh(token: string): any {
        return this.jwt.verify(token, { secret: process.env.JWT_REFRESH_SECRET! });
    }

    async login(dto: LoginDto) {
        const { email, phone, password } = dto;
        const found = await this.findPrincipalByIdentifier(email, phone);
        
        if (!found) throw new BadRequestException('Invalid credentials');

        if (found.table === 'user') {
            const u = found.record as any;
            const ok = await this.verify(password, u.password);
            if (!ok) throw new BadRequestException('Invalid credentials');

            const principal: Principal = {
                kind: 'user',
                id: u.id,
                role: u.role,
                name: u.name,
                email: u.email,
            };

            const payload: TokenClaims = { sub: `user:${u.id}`, role: u.role };
            return {
                accessToken: this.signAccess(payload),
                refreshToken: this.signRefresh(payload),
                principal,
            };
        }

        if (found.table === 'teacher') {
            const t = found.record as any;
            const ok = await this.verify(password, t.password);
            if (!ok) throw new BadRequestException('Invalid credentials');

            const principal: Principal = {
                kind: 'teacher',
                id: t.id,
                role: 'TEACHER',
                fullname: t.fullname,
                email: t.email ?? null,
                phone: t.phone,
            };

            const payload: TokenClaims = { sub: `teacher:${t.id}`, role: 'TEACHER' as any };
            return {
                accessToken: this.signAccess(payload),
                refreshToken: this.signRefresh(payload),
                principal,
            };
        }

        const s = found.record as any;
        const ok = await this.verify(password, s.password);
        if (!ok) throw new BadRequestException('Invalid credentials');

        const principal: Principal = {
            kind: 'student',
            id: s.id,
            role: 'STUDENT',
            fullname: s.fullname,
            email: s.email ?? null,
            phone: s.phone ?? null,
        };

        const payload: TokenClaims = { sub: `student:${s.id}`, role: 'STUDENT' as any };
        return {
            accessToken: this.signAccess(payload),
            refreshToken: this.signRefresh(payload),
            principal,
        };
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) throw new BadRequestException('refreshToken required');
        const decoded = this.decodeRefresh(refreshToken) as TokenClaims;
        const { sub, role } = decoded;
        const newPayload: TokenClaims = { sub, role };
        return {
            accessToken: this.signAccess(newPayload),
            refreshToken: this.signRefresh(newPayload),
        };
    }

    // REGISTER endpoints: return created entity only (no tokens)
    async registerUser(dto: CreateUserDto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) throw new BadRequestException('Email already in use');

        const password = await this.hash(dto.password);
        const user = await this.prisma.user.create({
            data: { ...dto, password: password! },
        });
        // omit password
        const { password: _pw, ...rest } = user;
        return rest;
    }

    async registerTeacher(dto: CreateTeacherDto) {
        if (dto.email) {
            const exists = await this.prisma.teacher.findUnique({ where: { email: dto.email } });
            if (exists) throw new BadRequestException('Email already in use');
        }
        const password = await this.hash(dto.password ?? null);
        const teacher = await this.prisma.teacher.create({
            data: { ...dto, password: password ?? undefined },
        });
        const { password: _pw, ...rest } = teacher;
        return rest;
    }

    async registerStudent(dto: CreateStudentDto) {
        if (dto.email) {
            const exists = await this.prisma.student.findUnique({ where: { email: dto.email } });
            if (exists) throw new BadRequestException('Email already in use');
        }
        const password = await this.hash(dto.password ?? null);
        const student = await this.prisma.student.create({
            data: { ...dto, password: password ?? undefined },
        });
        const { password: _pw, ...rest } = student;
        return rest;
    }
}
