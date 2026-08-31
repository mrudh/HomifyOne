const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HomifyOne API',
      version: '1.0.0',
      description:
        'REST API for the HomifyOne platform' +
        'Authentication is through an httpOnly JWT cookie (set on /auth/login) or a Bearer token.',
    },
    servers: [{ url: '/api', description: 'API base path' }],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  },
  apis: ['./src/docs/*.docs.js'],
};

module.exports = swaggerJsdoc(options);
