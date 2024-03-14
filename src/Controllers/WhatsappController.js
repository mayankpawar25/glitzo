const whatsapp = require('../Services/MessageService');
const constants = require('../Utils/Constant')
const modal = require("../Modal/modal.js");
const logger = require('../Logger/FileLogger');

//..................................Receive message api.........................................................//
const receiveMessage = async (req, res) => {
    const { ProfileName, From, Body } = req.body;
    const replyMessage = Body.trim();
    
    try {
        
        let user_id = '';
        let status = '';
        let order_status = '';
        let product_det = [];
        let order_id = '';

        console.log(replyMessage);

        // Check if the message is a greeting
        const isGreeting = constants.greetings.includes(replyMessage.toLowerCase());

         // MySQL select query
         const userResult = await new Promise((resolve, reject) => {
            modal.getData('user', '*', `mobile_number LIKE "${From}"`, async (result) => {
                resolve(result);
            });
        });

        // Mysql check user exists
        if (userResult == undefined) {
            // insert 
            status = 'welcome';
            modal.insertData('user', 'name, mobile_number, status', `'${ProfileName}', '${From}', '${status}'`, (err, lastInsertId) => {
                if(err) { console.log(err) }
                user_id = lastInsertId;
            })
        } else {
            // get user_id
            user_id = userResult['id'];
            status = userResult['status'];
        }

        // Check for greetings if yes then set last order as cancelled if any
        if (isGreeting) {
            // If it's a greeting, update the last user order status to 'cancelled' if it's pending or processing
            const lastUserOrder = await new Promise((resolve, reject) => {
                modal.getData('user_orders', '*', `user_id = "${user_id}" ORDER BY id DESC LIMIT 1`, async (lastOrderDet) => {
                    resolve(lastOrderDet)
                });
            });
            
            if (lastUserOrder && (lastUserOrder['order_status'] === 'pending' || lastUserOrder['order_status'] === 'processing')) {
                await modal.updateData('user_orders', `order_status='cancelled'`, `order_id = "${lastUserOrder['order_id']}"`);
            }
        } else {
            // MySQL get data from user_oder query
            const userOrderResult = await new Promise((resolve, reject) => {
                modal.getData('user_orders', '*', `user_id = "${user_id}" AND (order_status != "completed" AND order_status != "cancelled")  ORDER BY id DESC LIMIT 1`, async (orderDet) => {
                    resolve(orderDet)
                });
            });
            
            if(userOrderResult !== undefined) {
                order_status = userOrderResult['order_status'];
                product_det = JSON.parse(userOrderResult['product_det']);
                order_id = userOrderResult['order_id'];
            }
        }

        // Chat flow here
        processUserInteraction(ProfileName, From, replyMessage, user_id, status, order_status, product_det, order_id);


    } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).send("Error handling message and sending feedback");
    }
}

// All Whatsapp Chat flow is here
async function processUserInteraction(profileName, from, replyMessage, user_id, status, order_status, product_det, order_id) {
    const { greetings, catalogue, maxQuantityLimit } = constants;
    const itemCount = catalogue.length;
    let param = []; 

    const sendErrorMessage = async (templateId, param) => {
        await whatsapp.sendWhatsAapMessage(templateId, from, param);
    };

    const updateUserStatus = async (status) => {
        await modal.updateData('user', `status='${status}'`, `id = '${user_id}'`);
    };

    try {
        if (greetings.includes(replyMessage.toLowerCase())) {           // Sends Hi/Hello
            const templateId = constants.data.welcomeMessage;
            param = [profileName];
            await whatsapp.sendWhatsAapMessage(templateId, from, param);
            status = 'welcome';
            await updateUserStatus(status);
        } else if (replyMessage.toLowerCase() === 'yes' && status === 'welcome') {  // Send Catalog and ask to choose value between 1 to 6
            const templateId = constants.data.productsMessage;
            const productImage = constants.productImagePath;
            param = catalogue.map(product => product.text).concat([''+itemCount, productImage]);
            await whatsapp.sendWhatsAapMessage(templateId, from, param);
            status = 'products';
            await updateUserStatus(status);
        } else if (!isNaN(replyMessage) && replyMessage != 0 && status.includes('products')) {     // Gets the Product number 
            if (replyMessage > itemCount || replyMessage < 0) {         // Validation for number is between 1 to length of items
                const templateId = constants.data.invalidProductResponse;
                param = [itemCount.toString()];
                await sendErrorMessage(templateId, param);
            } else {
                const chosenProduct = catalogue[replyMessage - 1];
                const templateId = constants.data.productChoiceMessage;
                param = [chosenProduct.text, maxQuantityLimit.toString()];
                await whatsapp.sendWhatsAapMessage(templateId, from, param);
                status = 'quantity';
                await updateUserStatus(status);
                let selected_product = {
                    productId: chosenProduct.id,
                    productname: chosenProduct.text,
                    amount: chosenProduct.amount,
                    quantity: 0,
                };
                product_det.push(selected_product);
                const total_amount = product_det.reduce((total, product) => total + product.amount * product.quantity, 0);
                const user_order_status = 'pending';
                const productListStr = JSON.stringify(product_det);
                if (!order_status || order_status === 'cancelled' || order_status === 'completed') {
                    const order_id = Date.now();
                    await modal.insertData('user_orders', 'user_id, product_det, total_amount, order_id, order_status', `'${user_id}', '${productListStr}', '${total_amount}', '${order_id}', '${user_order_status}'`, (err, lastInsertId) => {
                        if (err) {
                            logger.fileLogger.error(`user order insert error->: ${JSON.stringify(err)}`);
                        }
                    });
                } else {
                    await modal.updateData('user_orders', `product_det='${productListStr}', total_amount='${total_amount}', order_status='${user_order_status}'`, `order_id = "${order_id}"`);
                }
            }
        } else if (!isNaN(replyMessage) && replyMessage == 0 && status === 'products') {    // if 0 then exit the user from catalogue
            const templateId = constants.data.thankyouMessage;
            await whatsapp.sendWhatsAapMessage(templateId, from, param);
            status = '';
            await updateUserStatus(status);
        } else if (!isNaN(replyMessage) && status === 'quantity') {         // Get Quantity
            if (replyMessage > maxQuantityLimit || replyMessage <= 0) {     // Validation on quantity
                const templateId = constants.data.invalidQuantityResponse;  
                param = [maxQuantityLimit.toString()];
                await sendErrorMessage(templateId, param);
            } else {
                const templateId = constants.data.nextProductMessage;       // Next product/checkout message
                await whatsapp.sendWhatsAapMessage(templateId, from, param);
                status = 'more-products';
                await updateUserStatus(status);
                const lastProductIndex = product_det.length - 1;
                product_det[lastProductIndex].quantity += parseInt(replyMessage, 10);
                const total_amount = product_det.reduce((total, product) => total + product.amount * product.quantity, 0);
                const productListStr = JSON.stringify(product_det);
                await modal.updateData('user_orders', `product_det='${productListStr}', total_amount='${total_amount}'`, `order_id = "${order_id}"`);
            }
        } else if (!isNaN(replyMessage) && replyMessage == 0 && status.includes('products')) {
            const templateId = constants.data.deliveryAddressMessage; // Enter your delivery address
            await whatsapp.sendWhatsAapMessage(templateId, from, param);
        
            // Update Status
            status = 'address';
            await updateUserStatus(status);
        } else if (replyMessage && status === 'address') { 
            let productList = ''; // Billing Summary Message
        
            product_det.forEach((product, index) => {
                const current_product = catalogue.filter((prod) => prod.id === product.productId)
                productList += `${current_product[0].text}, Quantity: ${product.quantity}, Amount: ${product.amount * product.quantity}/-, `;  // Product billing detail Message
            });
        
            const total_amount = product_det.reduce((total, product) => total + product.amount * product.quantity, 0);
            const templateId = constants.data.billingSummaryMessage; // Billing Summary Message
            param = [
                productList,
                '' + total_amount
            ];
        
            await whatsapp.sendWhatsAapMessage(templateId, from, param);
        
            // Update Status
            status = 'checkout';
            await updateUserStatus(status);
        
            // Update status to processing
            await modal.updateData('user_orders', `order_status='processing',  delivery_address='${replyMessage}'`, `order_id = "${order_id}"`);
        } else if (!isNaN(replyMessage) && replyMessage == 0 && status === 'checkout') {
            status = '';
            await updateUserStatus(status);
            modal.getData('user_orders', '*', `user_id = "${user_id}" ORDER BY id DESC LIMIT 1`, async (orderDet) => {          // If choice is 0 after catalogue
                if (orderDet !== undefined && (orderDet['order_status'] === "processing" || orderDet['order_status'] === "pending")) {
                    const order_id = orderDet['order_id'];
                    await modal.updateData('user_orders', `order_status='cancelled'`, `order_id = "${order_id}"`);
                } else {
                    const templateId = constants.data.somethingWrongMessageResponse;    //Handling something went wrong
                    await sendErrorMessage(templateId, param);
                }
            });
            const templateId = constants.data.cancelledMessageResponse;         //Order cancelled message
            await whatsapp.sendWhatsAapMessage(templateId, from, param);
        } else if (replyMessage.toLowerCase() === 'done' && status === 'checkout') {
            status = '';
            await updateUserStatus(status);
            modal.getData('user_orders', '*', `user_id = "${user_id}" ORDER BY id DESC LIMIT 1`, async (orderDet) => {
                if (orderDet !== undefined && (orderDet['order_status'] === "processing" || orderDet['order_status'] === "pending")) {
                    order_id = orderDet['order_id'];
                    await modal.updateData('user_orders', `order_status='completed'`, `order_id = "${order_id}"`);
                    const templateId = constants.data.thankyouOrderSuccessMessage;
                    param = [order_id.toString()];
                    await whatsapp.sendWhatsAapMessage(templateId, from, param);
                    const newMessageTemplateId = constants.data.initNewMessage;
                    await whatsapp.sendWhatsAapMessage(newMessageTemplateId, from, param);
                } else {
                    const templateId = constants.data.somethingWrongMessageResponse;
                    await sendErrorMessage(templateId, param);
                }
            });
        } else {
            const templateId = constants.data.invalidResponse;
            await sendErrorMessage(templateId, param);
        }
    } catch (error) {
        logger.fileLogger.error(`sendWhatsAapMessage->: ${JSON.stringify(error)}`);
        const templateId = constants.data.somethingWrongMessageResponse;
        await sendErrorMessage(templateId, param);
        throw error;
    }
}

//..................................EXPORTS.........................................................//
module.exports = {
    receiveMessage
}