import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string) ?? exception.message;
        code = (resp['code'] as string) ?? `HTTP_${status}`;
        details = Array.isArray(resp['message']) ? (resp['message'] as unknown[]) : [];
      } else {
        message = exception.message;
        code = `HTTP_${status}`;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      code = `DB_${exception.code}`;
      message = this.parsePrismaError(exception);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unknown error`, String(exception));
    }

    response.status(status).json({
      success: false,
      error: { code, message, details },
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private parsePrismaError(err: Prisma.PrismaClientKnownRequestError): string {
    switch (err.code) {
      case 'P2002':
        return 'A record with this value already exists';
      case 'P2025':
        return 'Record not found';
      case 'P2003':
        return 'Related record not found';
      default:
        return 'Database operation failed';
    }
  }
}
