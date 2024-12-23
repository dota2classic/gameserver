import * as winston from 'winston';
import * as fluent from 'fluent-logger';
import * as winstonTransport from 'winston-transport';
import { LoggerService } from '@nestjs/common/services/logger.service';
import { LogLevel } from '@nestjs/common';

export class WinstonWrapper implements LoggerService {
  private winstonInstance: winston.Logger;
  constructor(host: string, port: number = 24224, disabled = false) {
    const fluentLogger = fluent.createFluentSender("api-gateway", {
      host: host,
      port: port,
      timeout: 3.0,
      reconnectInterval: 10_000, // 10 secs
    });

    const transports: winstonTransport[] = [
      new winston.transports.Console({
        level: "verbose",
        format: winston.format.combine(
          winston.format.timestamp({
            format: "MM-DD HH:mm:ss.SSS",
          }),
          winston.format.prettyPrint(),
          winston.format.printf((info) => {
            const { level, timestamp, ...message } = info;
            return `${timestamp} | ${level.padEnd(5)} | ${JSON.stringify(message)}`;
          }),
        ),
      }),
    ];
    if (!disabled)
      transports.push(
        new winstonTransport({
          level: "verbose",
          log(v, next) {
            fluentLogger.emit(v, next);
          },
        }),
      );

    this.winstonInstance = winston.createLogger({
      transports: transports,
    });
  }

  debug(message: any, ...optionalParams: any[]): any {
    this.winstonInstance.debug(this.wrap(message, ...optionalParams));
  }

  error(message: any, ...optionalParams: any[]): any {
    console.trace(message);
    this.winstonInstance.error(this.wrap(message, optionalParams[0]));
  }

  fatal(message: any, ...optionalParams: any[]): any {
    this.winstonInstance.emerg(this.wrap(message, ...optionalParams));
  }

  log(message: any, ...optionalParams: any[]): any {
    this.winstonInstance.info(this.wrap(message, ...optionalParams));
  }

  setLogLevels(levels: LogLevel[]): any {
    //
  }

  verbose(message: any, ...optionalParams: any[]): any {
    this.winstonInstance.verbose(this.wrap(message, ...optionalParams));
  }

  warn(message: any, ...optionalParams: any[]): any {
    this.winstonInstance.warn(this.wrap(message, ...optionalParams));
  }

  private wrap(msg: any, ...optionalParams: any[]) {
    let message =
      typeof msg === "string"
        ? {
            message: msg,
          }
        : { ...msg };
    if (optionalParams.length > 1) {
      message = {
        ...message,
        ...optionalParams[0],
        context: optionalParams[1],
      };
    } else if (optionalParams.length === 1) {
      message = {
        ...message,
        context: optionalParams[0],
      };
    }

    return message;
  }
}
