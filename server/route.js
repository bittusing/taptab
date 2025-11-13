/**
 * Main application routes
 */

'use strict';

const healthRouter = require('./routes/health.route');
const tapTagRouter = require('./api/taptag/taptag.route');
const publicRouter = require('./routes/public.route');
const authRouter = require('./api/auth/auth.route');
const userRouter = require('./api/user/user.route');

module.exports = function (app) {
  const health = healthRouter.default ? healthRouter.default : healthRouter;
  app.use('/api', health);
  app.use('/api', tapTagRouter);
  app.use('/api', authRouter);
  app.use('/api', userRouter);
  app.use('/', publicRouter);
};