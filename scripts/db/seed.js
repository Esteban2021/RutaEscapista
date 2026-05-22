require('dotenv').config({ path: '.env.local' });
const { db } = require('./firebase-admin');

async function seed() {
  console.log('Iniciando seed de Firestore...');

  // Ejemplo: colección "users"
  // await db.collection('users').doc('user_001').set({
  //   email: 'demo@example.com',
  //   role: 'admin',
  //   createdAt: new Date(),
  // });

  console.log('Seed completado.');
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
