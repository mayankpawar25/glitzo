const swaggerJsdoc = require('swagger-jsdoc');

const port = process.env.PORT || 3000;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Glitzo WhatsApp Bot',
      version: '1.0.0',
    },
    servers: [
      {
        url: `http://localhost:${port}`, // Your base URL
        description: 'Local server',
      },
      {
        url: `https://glitzo.globeminded.com`, // Your base URL
        description: 'Live server',
      }
    ],
  },
  apis: ['./src/Routes/*.js'], // Path to your API routes
};

module.exports = swaggerJsdoc(swaggerOptions);
