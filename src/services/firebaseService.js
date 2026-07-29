import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const ordersRef = collection(db, 'orders');

// ========== ORDERS ==========
export const addOrderToFirebase = async (order) => {
  try {
    const orderWithTimestamp = {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(ordersRef, orderWithTimestamp);
    return { firebaseDocId: docRef.id, ...orderWithTimestamp };
  } catch (error) {
    console.error('Firebase error adding order:', error);
    throw error;
  }
};

export const getOrdersFromFirebase = async () => {
  try {
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      firebaseDocId: doc.id,
      ...doc.data(),
      date: doc.data().date || new Date().toISOString().split('T')[0],
      time: doc.data().time || new Date().toLocaleTimeString(),
    }));
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
};

export const updateOrderStatusInFirebase = async (firebaseDocId, status) => {
  try {
    const orderDoc = doc(db, 'orders', firebaseDocId);
    await updateDoc(orderDoc, { status, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

export const deleteOrderFromFirebase = async (firebaseDocId) => {
  try {
    const orderDoc = doc(db, 'orders', firebaseDocId);
    await deleteDoc(orderDoc);
    return true;
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

export const subscribeToOrders = (callback) => {
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, 
    (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        firebaseDocId: doc.id,
        ...doc.data(),
        date: doc.data().date || new Date().toISOString().split('T')[0],
        time: doc.data().time || new Date().toLocaleTimeString(),
      }));
      callback(orders);
    },
    (error) => {
      console.error('Firebase subscription error:', error);
    }
  );
};

// ========== STORE DATA (Products, Categories, etc.) ==========
export const syncProductsToFirebase = async (products) => {
  try {
    await setDoc(doc(db, 'store', 'products'), { data: products, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Firebase error syncing products:', error);
    throw error;
  }
};

export const subscribeToProducts = (callback) => {
  return onSnapshot(doc(db, 'store', 'products'), 
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().data || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Firebase products subscription error:', error);
    }
  );
};

export const syncCategoriesToFirebase = async (categories) => {
  try {
    await setDoc(doc(db, 'store', 'categories'), { data: categories, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Firebase error syncing categories:', error);
    throw error;
  }
};

export const subscribeToCategories = (callback) => {
  return onSnapshot(doc(db, 'store', 'categories'), 
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().data || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Firebase categories subscription error:', error);
    }
  );
};

export const syncBrandsToFirebase = async (brands) => {
  try {
    await setDoc(doc(db, 'store', 'brands'), { data: brands, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Firebase error syncing brands:', error);
    throw error;
  }
};

export const subscribeToBrands = (callback) => {
  return onSnapshot(doc(db, 'store', 'brands'), 
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().data || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Firebase brands subscription error:', error);
    }
  );
};

export const syncOffersToFirebase = async (offers) => {
  try {
    await setDoc(doc(db, 'store', 'offers'), { data: offers, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Firebase error syncing offers:', error);
    throw error;
  }
};

export const subscribeToOffers = (callback) => {
  return onSnapshot(doc(db, 'store', 'offers'), 
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().data || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Firebase offers subscription error:', error);
    }
  );
};

export const syncBannersToFirebase = async (banners) => {
  try {
    await setDoc(doc(db, 'store', 'banners'), { data: banners, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Firebase error syncing banners:', error);
    throw error;
  }
};

export const subscribeToBanners = (callback) => {
  return onSnapshot(doc(db, 'store', 'banners'), 
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().data || []);
      } else {
        callback([]);
      }
    },
    (error) => {
      console.error('Firebase banners subscription error:', error);
    }
  );
};

// ========== STOCK NOTIFICATIONS ("Notify Me") ==========
const stockNotificationsRef = collection(db, 'stockNotifications');

export const addStockNotificationRequest = async (productId, contact) => {
  try {
    await addDoc(stockNotificationsRef, {
      productId: String(productId),
      contact,
      notified: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Firebase error adding stock notification request:', error);
    throw error;
  }
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
  try {
    await Promise.all(
      docIds.map((id) => updateDoc(doc(db, 'stockNotifications', id), { notified: true }))
    );
  } catch (error) {
    console.error('Firebase error marking stock notifications as sent:', error);
    throw error;
  }
};

export const subscribeToStockNotifications = (callback) => {
  const q = query(stockNotificationsRef, where('notified', '==', false));
  return onSnapshot(q, 
    (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ firebaseDocId: doc.id, ...doc.data() }));
      callback(requests);
    },
    (error) => {
      console.error('Firebase stock notifications subscription error:', error);
    }
  );
};