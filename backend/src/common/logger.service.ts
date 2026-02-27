import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService extends Logger {
  log(message: string, context?: string) {
    super.log(message, context || this.constructor.name);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context || this.constructor.name);
  }

  warn(message: string, context?: string) {
    super.warn(message, context || this.constructor.name);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      super.debug(message, context || this.constructor.name);
    }
  }

  verbose(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      super.verbose(message, context || this.constructor.name);
    }
  }
}
