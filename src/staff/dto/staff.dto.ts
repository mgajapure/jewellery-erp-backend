import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRoleEnum { OWNER = 'OWNER', MANAGER = 'MANAGER', ACCOUNTANT = 'ACCOUNTANT', STAFF = 'STAFF', VIEWER = 'VIEWER' }

export class CreateStaffDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() mobile: string;
  @ApiProperty({ enum: UserRoleEnum }) @IsEnum(UserRoleEnum) role: UserRoleEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class UpdateStaffDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: UserRoleEnum }) @IsOptional() @IsEnum(UserRoleEnum) role?: UserRoleEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class StaffQueryDto {
  @ApiPropertyOptional({ enum: UserRoleEnum }) @IsOptional() @IsEnum(UserRoleEnum) role?: UserRoleEnum;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) limit?: number;
}
