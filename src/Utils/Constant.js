const greetings = ['hi', 'hello', 'hey', 'holla'];

const maxQuantityLimit = 10;

const catalogue = [
  {
      id: 0,
      text: `1️⃣ Organic holi colour- Pack of 2: Rs. 200/-`,
      amount: `200`
  },
  {
      id: 1,
      text: `2️⃣ Organic holi colour- Pack of 4: Rs. 500/-`,
      amount: `500`,
  },
  {
      id: 2,
      text: `3️⃣ Holi balloons- Pack of 3: Rs. 150/-`,
      amount: `150`,
  },
  {
      id: 3,
      text: `4️⃣ Holi snow spray- Pack of 3: Rs. 200/-`,
      amount: `200`
  },
  {
      id: 4,
      text: `5️⃣ Spray cylinder- 2kg: Rs. 1200/-`,
      amount: `1200`
  },
  {
    id: 5,
    text: `6️⃣ Set of 2 organic gulal + 1 snow spray + set of 3 balloons with filler: Rs. 350/-`,
    amount: `350`
  }
];
const qrCodeImagePath = `images/QR.png`;

const productImagePath = `images/glitzo-products.jpg`;

const data = {
  welcomeMessage: `HX4406afc58b213704b65ec9d0bd70c7c0`,
  productsMessage: `HX44654c2b79fd2b0795f45c62422762f9`,
  // productNumberMessage: `Please input the product number (1 to 7) one by one to add items to your cart 🛒`,
  productChoiceMessage: `HX3d0f0fa57a44dd947c62e5b338f525b0`,
  nextProductMessage: `HX62dd1834e86a1b40c684690206d0e8dd`,
  thankyouMessage: `HX3f8676ae7394e64de5264f50532d3b12`,
  deliveryAddressMessage: `HX249ff4f96d2df6880ea8975293f49546`,
  billingSummaryMessage: `HXec5fe4e67b0fc760bca44ec377e7e587`,
  thankyouOrderSuccessMessage: `HXcd747493e46b7cf6b19cc68bfd836853`,
  initNewMessage: `HXffd5e9a73315f4c6e8846f9b6af241f3`,
  invalidResponse: `HX01cbf52954717a11c3b2cf1e75672ec3`,
  invalidProductResponse: `HX70fe376a578b4107d0748e042b0a3076`,
  invalidQuantityResponse: `HX5b1c5adcf0ca792770388362fc3806f3`,
  cancelledMessageResponse: `HXb41a1546718ead907e90af65d0d14bd1`,
  somethingWrongMessageResponse: `HX71856a9c7e91406f09446dfa071e179e`,
}

module.exports = { data, greetings, catalogue, qrCodeImagePath, maxQuantityLimit, productImagePath }; // Exporting the constants object
