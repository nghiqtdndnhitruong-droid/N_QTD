import { prisma } from '../../config';
import { UserRole, AccountStatus, User, UserProfile } from '@prisma/client';
import { CreateUserInput, UpdateUserInput } from './user.validator';

export class UserRepository {
  public async findMany(params: {
    search?: string;
    status?: AccountStatus;
    page?: number;
    limit?: number;
  }): Promise<{ users: (User & { profile: UserProfile | null })[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { username: { contains: s, mode: 'insensitive' } },
        { profile: { fullName: { contains: s, mode: 'insensitive' } } },
        { profile: { idNumber: { contains: s } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { profile: true },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  public async findById(id: string): Promise<(User & { profile: UserProfile | null }) | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  public async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive',
        },
      },
    });
  }

  public async create(data: {
    username: string;
    passwordHash: string;
    role: UserRole;
    profile: CreateUserInput;
  }): Promise<User & { profile: UserProfile | null }> {
    const issueDate = data.profile.idIssueDate ? new Date(data.profile.idIssueDate) : null;

    return prisma.user.create({
      data: {
        username: data.username.trim(),
        passwordHash: data.passwordHash,
        role: data.role,
        status: AccountStatus.ACTIVE,
        profile: {
          create: {
            fullName: data.profile.fullName,
            idType: data.profile.idType,
            idNumber: data.profile.idNumber ?? null,
            idIssueDate: issueDate,
            idIssuePlace: data.profile.idIssuePlace ?? null,
            yearOfBirth: data.profile.yearOfBirth ?? null,
            gender: data.profile.gender ?? null,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  public async update(
    id: string,
    data: UpdateUserInput
  ): Promise<User & { profile: UserProfile | null }> {
    const issueDate = data.idIssueDate ? new Date(data.idIssueDate) : undefined;

    return prisma.user.update({
      where: { id },
      data: {
        status: data.status,
        profile: {
          update: {
            fullName: data.fullName,
            idType: data.idType,
            idNumber: data.idNumber,
            idIssueDate: issueDate,
            idIssuePlace: data.idIssuePlace,
            yearOfBirth: data.yearOfBirth,
            gender: data.gender,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  public async updateStatus(id: string, status: AccountStatus): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  public async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}

export const userRepository = new UserRepository();

