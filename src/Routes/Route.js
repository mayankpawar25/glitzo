const express = require("express");
const route = express();
const bodyParser = require('body-parser');
const userController = require('../Controllers/WhatsappController');

route.use(bodyParser.json());
route.use(bodyParser.urlencoded({ extended: true }));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome message
 *     description: Returns a welcome message indicating that the server is running.
 *     responses:
 *       '200':
 *         description: A successful response
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Hello WA Router
 */
route.get('/', (req, res) => {
  res.send('Hello Glitzo Router');
});

/**
 * @swagger
 * /receive-message:
 *   post:
 *     summary: Receive message
 *     description: Receive a message from WhatsApp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The received message
 *     responses:
 *       '200':
 *         description: Message received successfully
 *       '400':
 *         description: Bad request
 */
route.post('/receive-message', (req, res) => {userController.receiveMessage});

module.exports = route;
