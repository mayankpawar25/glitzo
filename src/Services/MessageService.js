const twilio = require('twilio');
const logger = require('../Logger/FileLogger');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceId = process.env.TWILIO_MESSAGING_SERVICE_ID;

const sendWhatsAapMessage = async (templateId, toMobile, params = []) => {
    try {
        if (params != null && params.length > 0) {
            await client.messages.create({
                contentSid: templateId,
                from: serviceId,
                contentVariables: getTemplateParameters(params),
                to: toMobile
            });
        } else {
            await client.messages.create({
                contentSid: templateId,
                from: serviceId,
                to: toMobile
            });
        }
    } catch (error) {
        logger.fileLogger.error(`sendWhatsAapMessage->: ${JSON.stringify(error)}`);
        throw error;
    }
}

// this is a private method, not meant to expose to outer world
const getTemplateParameters = (params) => {
    const json = {};
    params.forEach((item, index) => {
        json[index + 1] = item;
    });
    return JSON.stringify(json)
}

module.exports = { sendWhatsAapMessage };