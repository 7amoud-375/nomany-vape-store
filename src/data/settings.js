export const settings = {
  storeNameAr: "النعماني ستور",
  storeNameEn: "Nomany Store",
  storeLogo: "/images/logo.png",
  primaryColor: "#004741",
  secondaryColor: "#F0EDE4",
  phone: "+20 10 1234 5678",
  whatsapp: "+20 10 1234 5678",
  facebook: "https://facebook.com/nomanystore",
  instagram: "https://instagram.com/nomanystore",
  email: "info@nomanystore.com",
  addressAr: "المنزلة، الدقهلية, مصر",
  addressEn: "Manzala, Dakahlia, Egypt",
  businessHoursAr: "السبت - الخميس: 12 ص - 12 م",
  businessHoursEn: "Sat - Thu: 12 AM - 12 PM",
  footerTextAr: "النعماني ستور - وجهتك الأولى لأجهزة الفيب والليكويد",
  footerTextEn: "Nomany Store - your first destination for vape devices and liquids",
  hashtagAr: "#النعماني_بتاع_الفيب",
  hashtagEn: "#Nomany_Bta3_Elvape",
  tiktok: "",

  // Manual transfer details shown at checkout. Blank means "no gateway
  // configured yet" — see Dashboard -> Settings -> Payment.
  instapayNumber: "",
  vodafoneCashNumber: "",

  // Delivery areas and their fees. Matches the server's own default in
  // api/lib/db.php so a fresh dev environment and a fresh deploy start out the
  // same. The checkout will not accept an order whose city is not on this
  // list — the fee always comes from here, never from anything the browser
  // sends its own number for.
  deliveryCities: [{ nameAr: "المنزلة", nameEn: "Manzala", fee: 80 }],

  // Return policy shown at /return-policy. Fully editable from
  // Dashboard -> Settings; these are only the starting text.
  returnPolicyAr: `يحق لك استبدال أو إرجاع المنتج خلال 14 يوم من تاريخ الاستلام، بشرط أن يكون المنتج بحالته الأصلية وبكامل عبواته وملحقاته وغير مستخدم.

لأسباب صحية، لا يمكن إرجاع السوائل (الليكويد) أو الكويلات أو أي منتج تم فتح غلافه المحكم.

في حالة وصول المنتج تالفًا أو مختلفًا عن الطلب، تواصل معنا خلال 48 ساعة من الاستلام وسنتحمل تكلفة الاستبدال بالكامل.

تكاليف الشحن الخاصة بالإرجاع يتحملها العميل، إلا في حالة وجود عيب مصنعي أو خطأ من جانبنا.

يتم رد المبلغ بنفس وسيلة الدفع خلال 7 أيام عمل من استلامنا للمنتج ومراجعته.`,

  returnPolicyEn: `You may return or exchange a product within 14 days of delivery, provided it is unused and in its original condition with all packaging and accessories.

For health reasons, e-liquids, coils, and any product with a broken seal cannot be returned.

If a product arrives damaged or different from what you ordered, contact us within 48 hours of delivery and we will cover the full cost of the exchange.

Return shipping is paid by the customer, except where the item is faulty or we made an error.

Refunds are issued to the original payment method within 7 working days of us receiving and inspecting the product.`,
};

export default settings;