import { prisma } from '../../config';
import { UserRole, AccountStatus, User, UserProfile } from '@prisma/client';
import { UpdateProfileInput } from './auth.validator';

export class AuthRepository {
  public async findByUsername(username: string): Promise<(User & { profile: UserProfile | null }) | null> {
    return prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive',
        },
      },
      include: {
        profile: true,
      },
    });
  }

  public async findById(id: string): Promise<(User & { profile: UserProfile | null }) | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
  }

  public async countAdmins(): Promise<number> {
    return prisma.user.count({
      where: {
        role: UserRole.ADMIN,
      },
    });
  }

  public async createAdmin(data: {
    username: string;
    passwordHash: string;
    fullName: string;
  }): Promise<User & { profile: UserProfile | null }> {
    return prisma.user.create({
      data: {
        username: data.username.trim().toUpperCase(),
        passwordHash: data.passwordHash,
        role: UserRole.ADMIN,
        status: AccountStatus.ACTIVE,
        profile: {
          create: {
            fullName: data.fullName,
          },
        },
      },
      include: {
        profile: true,
      },
    });
  }

  public async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  public async updateLastLogin(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  public async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<UserProfile> {
    const issueDate = data.idIssueDate ? new Date(data.idIssueDate) : null;

    return prisma.userProfile.upsert({
      where: { userId },
      update: {
        fullName: data.fullName,
        idType: data.idType,
        idNumber: data.idNumber ?? null,
        idIssueDate: issueDate,
        idIssuePlace: data.idIssuePlace ?? null,
        yearOfBirth: data.yearOfBirth ?? null,
        gender: data.gender ?? null,
      },
      create: {
        userId,
        fullName: data.fullName,
        idType: data.idType,
        idNumber: data.idNumber ?? null,
        idIssueDate: issueDate,
        idIssuePlace: data.idIssuePlace ?? null,
        yearOfBirth: data.yearOfBirth ?? null,
        gender: data.gender ?? null,
      },
    });
  }
}

export const authRepository = new AuthRepository();

