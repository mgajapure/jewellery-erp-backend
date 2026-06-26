import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { SendOtpDto, VerifyOtpDto, VerifyPinDto } from '../dto/auth.dto';
import { JwtPayload } from '../strategies/jwt.strategy';

const OTP_PREFIX = 'otp:';
const PIN_ATTEMPTS_PREFIX = 'pin_attempts:';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenantId, isActive: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const user = await this.prisma.user.findFirst({
      where: { tenantId: dto.tenantId, mobile: dto.mobile, isActive: true, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOtp();
    const expirySeconds = this.configService.get<number>('otp.expirySeconds', 300);
    const key = `${OTP_PREFIX}${dto.tenantId}:${dto.mobile}`;

    await this.redis.setex(key, expirySeconds, JSON.stringify({ otp, attempts: 0 }));

    // In production: send via Firebase/SMS provider
    // For dev, log to console
    console.log(`[OTP] ${dto.mobile}: ${otp}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto, ipAddress?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Record<string, unknown>;
    deviceStatus: string;
  }> {
    const key = `${OTP_PREFIX}${dto.tenantId}:${dto.mobile}`;
    const stored = await this.redis.get(key);
    if (!stored) throw new BadRequestException('OTP expired or not found');

    const { otp, attempts } = JSON.parse(stored) as { otp: string; attempts: number };
    const maxAttempts = this.configService.get<number>('otp.maxAttempts', 5);

    if (attempts >= maxAttempts) {
      await this.redis.del(key);
      throw new BadRequestException('Too many attempts. Request a new OTP.');
    }

    if (otp !== dto.otp) {
      await this.redis.setex(
        key,
        this.configService.get<number>('otp.expirySeconds', 300),
        JSON.stringify({ otp, attempts: attempts + 1 }),
      );
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.redis.del(key);

    const user = await this.prisma.user.findFirstOrThrow({
      where: { tenantId: dto.tenantId, mobile: dto.mobile, isActive: true, deletedAt: null },
    });

    // Register or verify device
    const device = await this.registerDevice(user.id, dto.tenantId, dto.deviceFingerprint, {});
    const tokens = await this.generateTokens(user.id, dto.tenantId, user.role, device.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.log({
      tenantId: dto.tenantId,
      userId: user.id,
      action: 'LOGIN',
      module: 'auth',
      ipAddress,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role },
      deviceStatus: device.status,
    };
  }

  async verifyPin(
    userId: string,
    tenantId: string,
    dto: VerifyPinDto,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const attemptsKey = `${PIN_ATTEMPTS_PREFIX}${userId}`;
    const attemptsRaw = await this.redis.get(attemptsKey);
    const attempts = attemptsRaw ? parseInt(attemptsRaw, 10) : 0;

    if (attempts >= 5) {
      throw new ForbiddenException('Account locked. Please re-authenticate via OTP.');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true, deletedAt: null },
    });
    if (!user || !user.pinHash) throw new UnauthorizedException('PIN not set');

    const valid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!valid) {
      await this.redis.setex(attemptsKey, 900, String(attempts + 1));
      throw new UnauthorizedException(`Invalid PIN. ${4 - attempts} attempts remaining.`);
    }

    await this.redis.del(attemptsKey);

    const device = await this.registerDevice(userId, tenantId, dto.deviceFingerprint, {});
    const tokens = await this.generateTokens(userId, tenantId, user.role, device.id);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'LOGIN',
      module: 'auth',
      ipAddress,
    });

    return tokens;
  }

  async setPin(userId: string, tenantId: string, pin: string): Promise<void> {
    const pinHash = await bcrypt.hash(pin, 12);
    await this.prisma.user.update({
      where: { id: userId, tenantId },
      data: { pinHash },
    });
  }

  async refreshTokens(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.userSession.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.userSession.delete({ where: { id: session.id } });
    return this.generateTokens(session.userId, session.tenantId, session.user.role);
  }

  async approveDevice(deviceId: string, approvedBy: string, tenantId: string): Promise<void> {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, tenantId },
    });
    if (!device) throw new NotFoundException('Device not found');

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { status: 'APPROVED', approvedBy, approvedAt: new Date() },
    });
  }

  async getPendingDevices(tenantId: string) {
    return this.prisma.device.findMany({
      where: { tenantId, status: 'PENDING' },
      include: { user: { select: { name: true, mobile: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async registerDevice(
    userId: string,
    tenantId: string,
    fingerprint: string,
    meta: { deviceName?: string; platform?: string },
  ) {
    const existing = await this.prisma.device.findFirst({
      where: { userId, fingerprint },
    });
    if (existing) {
      await this.prisma.device.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
      return existing;
    }

    return this.prisma.device.create({
      data: {
        userId,
        tenantId,
        fingerprint,
        deviceName: meta.deviceName,
        platform: meta.platform,
        status: 'PENDING',
        lastSeenAt: new Date(),
      },
    });
  }

  private async generateTokens(
    userId: string,
    tenantId: string,
    role: string,
    deviceId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, tenantId, role, deviceId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn'),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.userSession.create({
      data: { userId, tenantId, refreshToken, deviceId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
