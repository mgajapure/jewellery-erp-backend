import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: this.config.get<string>('aws.region') ?? 'ap-south-1',
      credentials: {
        accessKeyId: this.config.get<string>('aws.accessKeyId') ?? '',
        secretAccessKey: this.config.get<string>('aws.secretAccessKey') ?? '',
      },
    });
    this.bucket = this.config.get<string>('aws.s3Bucket') ?? 'jewellery-erp';
  }

  // S3 key format: tenantId/module/entityId/filename
  buildKey(tenantId: string, module: string, entityId: string, filename: string): string {
    return `${tenantId}/${module}/${entityId}/${filename}`;
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
        ServerSideEncryption: 'AES256',
      }),
    );
    return key;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async uploadBuffer(
    tenantId: string,
    module: string,
    entityId: string,
    filename: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; signedUrl: string }> {
    const uniqueName = `${Date.now()}-${randomUUID().slice(0, 8)}-${filename}`;
    const key = this.buildKey(tenantId, module, entityId, uniqueName);
    await this.upload(key, buffer, contentType);
    const signedUrl = await this.getSignedUrl(key, 86400); // 24h for documents
    return { key, signedUrl };
  }
}
