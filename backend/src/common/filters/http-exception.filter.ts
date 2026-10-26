import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || message;
        error = (res as any).error || error;
      }
    } else if ((exception as any)?.type === 'entity.too.large' || (exception as any)?.status === 413) {
      // Requête trop volumineuse (ex. image de signature énorme) : 413 explicite, pas « erreur interne »
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      error = 'Payload Too Large';
      message = 'Fichier trop volumineux. Utilisez une image plus légère (photo recadrée sur la signature).';
    } else if ((exception as any)?.type === 'entity.parse.failed') {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'Données envoyées illisibles. Réessayez.';
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
