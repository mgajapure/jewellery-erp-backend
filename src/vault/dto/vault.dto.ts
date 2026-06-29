import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVaultDto {
  @ApiProperty({ example: 'Main Vault' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'Ground floor, back room' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  branchId?: string;
}

export class CreateSafeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  vaultId: string;

  @ApiProperty({ example: 'Safe A' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateTrayDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  safeId: string;

  @ApiProperty({ example: 'Tray 1' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateSlotsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  trayId: string;

  @ApiProperty({ example: 10, description: 'Number of slots to create (1–50)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count: number;

  @ApiProperty({ required: false, example: 'S', description: 'Optional prefix for slot numbers (S1, S2…)' })
  @IsString()
  @IsOptional()
  prefix?: string;
}

export class AssignSlotDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  girviId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slotId: string;
}
