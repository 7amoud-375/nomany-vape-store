import { db } from '../firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const ordersRef = collection(db, 'orders');

// ========== ORDERS ==========
export const addOrderToFirebase = async (order) => {
  const docRef = await addDoc(ordersRef, {
    ...order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { firebaseDocId: docRef.id, ...order };
};

export const updateOrderStatusInFirebase = async (firebaseDocId, status) => {
  await updateDoc(doc(db, 'orders', firebaseDocId), {
    status,
    updatedAt: serverTimestamp(),
  });
  return true;
};

export const deleteOrderFromFirebase = async (firebaseDocId) => {
  await deleteDoc(doc(db, 'orders', firebaseDocId));
  return true;
};

const mapOrder = (docSnap) => {
  const data = docSnap.data();
  return {
    firebaseDocId: docSnap.id,
    ...data,
    date: data.date || new Date().toISOString().split('T')[0],
    time: data.time || new Date().toLocaleTimeString(),
  };
};

/** Every order. Admin only — firestore.rules rejects this for customers. */
export const subscribeToOrders = (callback, onError) => {
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(mapOrder)),
    (error) => {
      console.error('Firebase orders subscription error:', error);
      if (onError) onError(error);
    }
  );
};

/**
 * A single customer's own orders. Deliberately unsorted in the query so no
 * composite index is required; the caller sorts.
 */
export const subscribeToUserOrders = (userId, callback, onError) => {
  const q = query(ordersRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(mapOrder)),
    (error) => {
      console.error('Firebase user orders subscription error:', error);
      if (onError) onError(error);
    }
  );
};

export const getOrdersFromFirebase = async () => {
  const snapshot = await getDocs(query(ordersRef, orderBy('createdAt', 'desc')));
  return snapshot.docs.map(mapOrder);
};

// ========== STORE DATA (products, categories, brands, offers, banners, ...) ==========
//
// Each collection is one document under `store/`. Writes are admin-only per
// firestore.rules; reads are public so the shop works signed-out.

const syncStoreDoc = async (name, data) => {
  await setDoc(doc(db, 'store', name), { data, updatedAt: serverTimestamp() });
  return true;
};

/**
 * Subscribe to one store document.
 *
 * Passes `null` when the document does not exist yet (so the caller can keep
 * its seed data) and the real value when it does — including an empty array.
 * Collapsing those two cases is what previously made "delete the last product"
 * invisible to every other browser.
 */
const subscribeToStoreDoc = (name, callback) =>
  onSnapshot(
    doc(db, 'store', name),
    (docSnap) => callback(docSnap.exists() ? docSnap.data().data ?? null : null),
    (error) => console.error(`Firebase ${name} subscription error:`, error)
  );

export const syncProductsToFirebase = (products) => syncStoreDoc('products', products);
export const subscribeToProducts = (cb) => subscribeToStoreDoc('products', cb);

export const syncCategoriesToFirebase = (categories) => syncStoreDoc('categories', categories);
export const subscribeToCategories = (cb) => subscribeToStoreDoc('categories', cb);

export const syncBrandsToFirebase = (brands) => syncStoreDoc('brands', brands);
export const subscribeToBrands = (cb) => subscribeToStoreDoc('brands', cb);

export const syncOffersToFirebase = (offers) => syncStoreDoc('offers', offers);
export const subscribeToOffers = (cb) => subscribeToStoreDoc('offers', cb);

export const syncBannersToFirebase = (banners) => syncStoreDoc('banners', banners);
export const subscribeToBanners = (cb) => subscribeToStoreDoc('banners', cb);

// These three used to live only in the admin's own localStorage, so changes
// never reached a single customer — including shippingCost, which the payment
// server now reads from store/settings.
export const syncTestimonialsToFirebase = (testimonials) => syncStoreDoc('testimonials', testimonials);
export const subscribeToTestimonials = (cb) => subscribeToStoreDoc('testimonials', cb);

export const syncSettingsToFirebase = (settings) => syncStoreDoc('settings', settings);
export const subscribeToSettings = (cb) => subscribeToStoreDoc('settings', cb);

export const syncHomepageToFirebase = (homepage) => syncStoreDoc('homepage', homepage);
export const subscribeToHomepage = (cb) => subscribeToStoreDoc('homepage', cb);

// ========== STOCK NOTIFICATIONS ("Notify Me") ==========
const stockNotificationsRef = collection(db, 'stockNotifications');

export const addStockNotificationRequest = async (productId, contact) => {
  await addDoc(stockNotificationsRef, {
    productId: String(productId),
    contact,
    notified: false,
    createdAt: serverTimestamp(),
  });
};

export const getPendingStockNotifications = async (productId) => {
  try {
    const q = query(
      stockNotificationsRef,
      where('productId', '==', String(productId)),
      where('notified', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ firebaseDocId: d.id, ...d.data() }));
  } catch (error) {
    console.error('Firebase error fetching stock notifications:', error);
    return [];
  }
};

export const markStockNotificationsSent = async (docIds) => {
  await Promise.all(
    docIds.map((id) => updateDoc(doc(db, 'stockNotifications', id), { notified: true }))
  );
};

export const subscribeToStockNotifications = (callback) => {
  const q = query(stockNotificationsRef, where('notified', '==', false));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ firebaseDocId: d.id, ...d.data() }))),
    (error) => console.error('Firebase stock notifications subscription error:', error)
  );
};
