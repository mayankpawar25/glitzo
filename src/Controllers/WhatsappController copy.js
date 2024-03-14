const helperFunction = require('./HelperFunction')
const messageSend = require('../Utils/GenerateMessages')
const constants = require('../Utils/Constant')
const modal = require("../Modal/modal.js");
//..................................Send message api.........................................................//

const sendMessage = async (req, res) => {
    const { customerName, orderStatus, productList, toPhoneNumber } = req.body;
    const productListString = productList.join(', ');
    try {
        if (orderStatus !== "Delivered" && orderStatus !== "Feedback" && orderStatus !== "Placed") {
            throw new Error('Invalid order status');
        }
        if (orderStatus === "Delivered") {
            messageSend.generateMessage(orderStatus, customerName, productListString, toPhoneNumber);
        }
        else if (orderStatus === "Placed") {
            messageSend.generateMessage(orderStatus, customerName, productListString, toPhoneNumber);
        }
        else if (orderStatus === "Feedback") {
            messageSend.generateMessage(orderStatus, customerName, productListString, toPhoneNumber);
        }
        res.status(200).send("Message sent successfully");
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return res.status(400).json({ success: false, msg: error.message });
    }
}
//..................................Receive message api.........................................................//
const receiveMessage = async (req, res) => {
    const { ProfileName, From, Body } = req.body;
    const replyMessage = Body.trim();
    

    let user_id = '';
    let status = '';
    let order_status = '';
    let product_det = [];
    let order_id = '';
    try {
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

        // MySQL get data from user_oder query
        const userOrderResult = await new Promise((resolve, reject) => {
            modal.getData('user_orders', '*', `user_id = "${user_id}" AND (order_status != "completed" AND order_status != "processing")  ORDER BY id DESC LIMIT 1`, async (orderDet) => {
                resolve(orderDet)
            });
        });
        
        if(userOrderResult !== undefined) {
            order_status = userOrderResult['order_status'];
            product_det = JSON.parse(userOrderResult['product_det']);
            order_id = userOrderResult['order_id'];
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
    const greetings = constants.greetings;
    const products = constants.catalogue;
    
    if(greetings.includes(replyMessage.toLowerCase())) { // Hello, hi, holla
        const message = constants.data.getWelcomeMessage(profileName); // Welcome messasge
        await helperFunction.CustomMessage(message, from);
        
        status = 'welcome';
        // update status to catalogue
        modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)
    } else if(replyMessage.toLowerCase() == 'yes' && status == 'welcome') { // Start sending products sequentially
        await sendMessagesSequentially(products, from).then(async() => {
            const goBackMessage = constants.data.getGoBackMessage();    // Choose Product by typing number
            await helperFunction.CustomMessage(goBackMessage, from).then(async() => {
                const message = constants.data.getProductNumberMessage();    // Choose Product by typing number
                await helperFunction.CustomMessage(message, from);
            });
        });
        
        status = 'products';
        modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)
        
    } else if(!isNaN(replyMessage) && replyMessage != 0  && status.includes('products')) { 
        if(replyMessage > products.length || replyMessage < 0) {
            // Validation to choose number between 1 to 7
            const invalidMessage = constants.data.getInvalidProductResponse(products.length); // Invalid Response Message
            await helperFunction.CustomMessage(invalidMessage, from);
        } else {
            const chosenProduct = products[replyMessage-1];
            const message = constants.data.getProductChoiceMessage(chosenProduct.text, constants.maxQuantityLimit); // Choosed product message
            await helperFunction.CustomMessage(message, from);
            
            // Update Status
            status = 'quantity';
            modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)

            let selected_product = {
                productId: chosenProduct.id,
                productname: chosenProduct.text,
                amount: chosenProduct.amount, // Replace with the actual amount
                quantity: 0, // Initial quantity, you may update it later
            };

            // Insert order Details of user if order_status is not cancelled otherwise update it to the cart
            product_det.push(selected_product)
            const total_amount = product_det.reduce((total, product) => total + product.amount * product.quantity, 0);
            
            const user_order_status = 'pending';

            if(!order_status || order_status == 'cancelled' || order_status == 'completed') {
                // insert into user_orders table
                const order_id = Date.now();
                modal.insertData('user_orders', 'user_id, product_det, total_amount, order_id, order_status', `'${user_id}', '${JSON.stringify(product_det)}', '${total_amount}', '${order_id}', '${user_order_status}'`, (err, lastInsertId) => {
                    if(err) { console.log(err) }
                });
            } else {
                // update into user_orders table
                modal.updateData('user_orders', `product_det='${JSON.stringify(product_det)}', total_amount='${total_amount}', order_status='${user_order_status}'`, `order_id = "${order_id}"`);
            }
        }
    } else if(!isNaN(replyMessage) && replyMessage == 0 && status == 'products') { // If choice is 0 after catalogue
        const message = constants.data.getThankyouMessage();     // Thank you message
        await helperFunction.CustomMessage(message, from);

        // Update Status
        status = '';
        modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)

    } else if(!isNaN(replyMessage) && status == 'quantity') { 
        const maxQuantityLimit = constants.maxQuantityLimit;
        if(replyMessage > maxQuantityLimit || replyMessage <= 0) {
            // Validation to choose number between 1 to 10
            const invalidMessage = constants.data.getInvalidQuantityResponse(maxQuantityLimit); // Invalid Response Message
            await helperFunction.CustomMessage(invalidMessage, from);
        } else {
            const message = constants.data.getNextProductMessage();  // Next product/checkout message
            await helperFunction.CustomMessage(message, from);

            // Update Status
            status = 'more-products';
            modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)

            // update quantity of last product and total amount
            const lastProductIndex = product_det.length - 1;
            product_det[lastProductIndex].quantity += parseInt(replyMessage, 10); // Update quantity
            const total_amount = product_det.reduce((total, product) => total + product.amount * product.quantity, 0);

            // Update total amount and quantity in the order details
            await modal.updateData('user_orders', `product_det='${JSON.stringify(product_det)}', total_amount='${total_amount}'`, `order_id = "${order_id}"`);
        }

    } else if(!isNaN(replyMessage) && replyMessage == 0 && status.includes('products')) {
        // Please Enter your delivery address
        const message = constants.data.getDeliveryAddressMessage();  // Enter your devlivery address
        await helperFunction.CustomMessage(message, from);

        // Update Status
        status = 'address';
        modal.updateData('user', `status='${status}'`, `id = '${user_id}'`);
    } else if(replyMessage && status == 'address') { 
        // checkout then send bill summary and QR code to customer
        let billingMessage = constants.data.getBillingSummaryMessage(); //Billing Summary Message

        product_det.forEach((product, index) => {
            const current_product = products.filter((prod) => prod.id === product.productId)
            billingMessage += constants.data.getBillingLine1Message(current_product[0].text, product.quantity, product.amount * product.quantity);  // product billing detail Message
        });

        const total_amount = product_det.reduce((total, product) => total + product.amount * product.quantity, 0);

        billingMessage += constants.data.getBillingLine2Message(total_amount);  // Total Amount Message

        // Add instructions for payment and QR code
        billingMessage += constants.data.getBillingLine3Message();
        billingMessage += constants.data.getBillingLine4Message();
        billingMessage += constants.data.getBillingLine5Message();

        // Send the billing summary message to the user
        await helperFunction.CustomMessageWithMedia(billingMessage, constants.qrCodeImagePath, from);

        // Update Status
        status = 'checkout';
        modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)

        // Update status to processing
        await modal.updateData('user_orders', `order_status='processing',  delivery_address='${replyMessage}'`, `order_id = "${order_id}"`);

    } else if(!isNaN(replyMessage) && replyMessage == 0 && status == 'checkout') {

        // Update Status
        status = '';
        modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)

        // Update status to processing
        modal.getData('user_orders', '*', `user_id = "${user_id}" ORDER BY id DESC LIMIT 1`, async (orderDet) => {
            if(orderDet !== undefined && (orderDet['order_status'] == "processing" || orderDet['order_status'] == "pending")) {
                const order_id = orderDet['order_id'];
                await modal.updateData('user_orders', `order_status='cancelled'`, `order_id = "${order_id}"`);
            } else {
                const somethingWrongMessage = constants.data.getSomethingWrongMessageResponse();
                await helperFunction.CustomMessage(somethingWrongMessage, from);
            }
        });
        const orderInitMessage = constants.data.getCancelledMessageResponse();
        await helperFunction.CustomMessage(orderInitMessage, from);

    } else if(replyMessage.toLowerCase() == 'done' && status == 'checkout') { 
        // Update Status    
        status = '';
        modal.updateData('user', `status='${status}'`, `id = '${user_id}'`)
        
        modal.getData('user_orders', '*', `user_id = "${user_id}" ORDER BY id DESC LIMIT 1`, async (orderDet) => {
            if(orderDet !== undefined && (orderDet['order_status'] == "processing" || orderDet['order_status'] == "pending")) {
                order_id = orderDet['order_id'];
            
                // Update status to processing
                await modal.updateData('user_orders', `order_status='completed'`, `order_id = "${order_id}"`);
                
                const message = constants.data.getThankyouOrderSuccessMessage(order_id);
                await helperFunction.CustomMessage(message, from);

                const orderInitMessage = constants.data.getInitNewMessage();
                await helperFunction.CustomMessage(orderInitMessage, from);
            } else {
                const somethingWrongMessage = constants.data.getSomethingWrongMessageResponse();
                await helperFunction.CustomMessage(somethingWrongMessage, from);
            }
        })
    } else {
        const invalidMessage = constants.data.getInvalidMessage(); // Invalid Response Message
        await helperFunction.CustomMessage(invalidMessage, from);
    }
}

async function sendMessagesSequentially(products, From, index = 0) {
    if (index < products.length) {
        const product = products[index];

        if (product.media !== '') {
            await helperFunction.CustomMessageWithMedia(product.text, product.media, From);
        } else {
            await helperFunction.CustomMessage(product.text, From);
        }

        // Introduce a delay of 500 milliseconds (0.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Call the function recursively for the next product
        await sendMessagesSequentially(products, From, index + 1);
    }
}

//..................................EXPORTS.........................................................//
module.exports = {
    sendMessage, receiveMessage
}