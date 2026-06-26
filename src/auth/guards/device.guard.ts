import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const deviceId = user?.deviceId;

    if (!deviceId) return true; // PIN/biometric flows without device context allowed

    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, userId: user.id, status: 'APPROVED' },
    });
    if (!device) throw new ForbiddenException('Device not approved');
    return true;
  }
}
