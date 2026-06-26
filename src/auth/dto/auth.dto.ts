import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsMobilePhone,
  Length,
  IsOptional,
  Matches,
} from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsMobilePhone('en-IN')
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ example: 'tenant-uuid' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'device-fingerprint-hash' })
  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  deviceName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsMobilePhone('en-IN')
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ example: 'tenant-uuid' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 6)
  otp: string;

  @ApiProperty({ example: 'device-fingerprint-hash' })
  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;
}

export class SetPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 or 6 digits' })
  pin: string;
}

export class VerifyPinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 6)
  pin: string;

  @ApiProperty({ example: 'device-fingerprint-hash' })
  @IsString()
  @IsNotEmpty()
  deviceFingerprint: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ApproveDeviceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
