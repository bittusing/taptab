/* Set winston logger: it will print logs to a rotating file each day
  if enviornment is development then it will print log on standard output
   */

module.exports = function (app, config) {

  const winston = require('winston');
  const dailyRotateFile = require('winston-daily-rotate-file');
  const morgan = require('morgan');
  const fs = require('fs');
  const path = require('path');
  const { combine, printf } = winston.format;
  const consoleTransport = new winston.transports.Console({
    format: combine(
      printf((info) => `[${new Date().toISOString()}] ${info.level}: ${info.message}`)
    )
  });

  let env = app.get('env');
  /* Request Logging : use morgan for HTTP logs in dev/test */
  if ('development' === env || 'test' === env) {
    app.use(morgan('dev'));
  }

  // Ensure base logs directory exists
  const logsBaseDir = path.join(config.root, 'logs');
  try { if (!fs.existsSync(logsBaseDir)) fs.mkdirSync(logsBaseDir, { recursive: true }); } catch {}

  let generalLogTasks = [
    new dailyRotateFile({
      filename: config.root + '/logs/%DATE%/all-logs.log',
      datePattern: 'YYYY-MM-DD',
      // prepend: true
    })
  ]

  let exceptionLogTasks = [
    new dailyRotateFile({
      filename: config.root + '/logs/%DATE%/exception.log',
      datePattern: 'YYYY-MM-DD',
      // prepend: true
    })
  ];

  if (config.logOnScreen) {
    generalLogTasks.push(consoleTransport);
    exceptionLogTasks.push(consoleTransport);
  }

  const logger = winston.createLogger({
    transports: [...generalLogTasks, consoleTransport],
    exceptionHandlers: exceptionLogTasks
  });

  return logger;
}

