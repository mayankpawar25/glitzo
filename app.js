const express = require('express')
require('dotenv').config();
const path = require('path');
const bodyParser = require('body-parser');
const Router = require('./src/Routes/Route')
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/Swagger/Swagger');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 3002;

// Parse incoming request bodies in JSON format
app.use(bodyParser.json());

// Add public folder as default path
app.use(express.static(path.join(__dirname, 'public')));

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Use the router for the main route
app.use('/', Router);

app.listen(port, () => {
  console.log(`Glitzo is running on port ${port}`)
})
