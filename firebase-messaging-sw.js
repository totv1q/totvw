importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCk0dSmHGQ248b-OQi44Rm2zWrfbpLBkpU',
  authDomain:        'totvq-8e439.firebaseapp.com',
  projectId:         'totvq-8e439',
  storageBucket:     'totvq-8e439.firebasestorage.app',
  messagingSenderId: '214530463737',
  appId:             '1:214530463737:web:8c45ab9fcb43807a164f28',
  measurementId:     'G-4QLB7GVRJT',
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {};
  return self.registration.showNotification(title || 'TOTV+', {
    body:  body || '',
    icon:  '/icons/Icon-192.png',
    badge: '/icons/Icon-32.png',
  });
});
