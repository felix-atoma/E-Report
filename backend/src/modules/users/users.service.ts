import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../common/enums/role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  institutionId: true,
  language: true,
  profileImage: true,
  whatsappNumber: true,
  whatsappVerified: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(institutionId: string, role?: Role) {
    return this.prisma.user.findMany({
      where: {
        institutionId,
        ...(role ? { role } : {}),
      },
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, institutionId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, institutionId },
      select: {
        ...USER_SELECT,
        notificationPreferences: true,
        childrenAsParent: {
          select: {
            id: true,
            admissionNumber: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, institutionId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashed = await bcrypt.hash(dto.password, Number(saltRounds));

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        role: dto.role,
        whatsappNumber: dto.whatsappNumber,
        institutionId,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, requestingUserId: string, requestingRole: Role, institutionId: string) {
    const target = await this.prisma.user.findFirst({ where: { id, institutionId } });
    if (!target) throw new NotFoundException('User not found');

    // Non-admins can only update themselves
    if (requestingRole !== Role.ADMIN && requestingUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async setActive(id: string, isActive: boolean, institutionId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, institutionId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: USER_SELECT,
    });
  }
}
