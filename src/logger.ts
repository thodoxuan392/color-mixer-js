import winston = require("winston");
import "winston-daily-rotate-file";

export class Logger {
	static getLogger(): winston.Logger {
		return winston.createLogger({
			level: "info",
			format: winston.format.combine(
				winston.format.colorize({
					all: true,
				}),
				winston.format.label({
					label: "[Color-Mixer]",
				}),
				winston.format.timestamp({
					format: "YY-MM-DD HH:mm:ss",
				}),
				winston.format.printf(
					(info) =>
						` ${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`
				)
			),
			transports: [
				new winston.transports.Console(),
				new winston.transports.DailyRotateFile({
					filename: "log/%DATE%.log",
					datePattern: "YYYY-MM-DD",
					zippedArchive: false,
					maxSize: "20m",
					maxFiles: "14d",
				}),
			],
		});
	}
}
