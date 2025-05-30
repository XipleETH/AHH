// Script simple para verificar el estado de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDmNyFQGOwUd9HX8pzHxz3K0-DQzKSV8h8",
  authDomain: "lottomojifun.firebaseapp.com",
  projectId: "lottomojifun",
  storageBucket: "lottomojifun.firebasestorage.app",
  messagingSenderId: "1088547430547",
  appId: "1:1088547430547:web:6b7c30f89b6e6b1ab33e6f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirebaseData() {
  console.log('🔍 Verificando datos en Firebase...\n');

  try {
    // Verificar tickets
    console.log('📝 Verificando tickets...');
    const ticketsRef = collection(db, 'player_tickets');
    const ticketsQuery = query(ticketsRef, orderBy('timestamp', 'desc'), limit(10));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    
    console.log(`Total tickets encontrados: ${ticketsSnapshot.size}`);
    
    if (ticketsSnapshot.size > 0) {
      console.log('Últimos tickets:');
      ticketsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ID: ${doc.id}, Numbers: ${data.numbers}, UserId: ${data.userId}, Timestamp: ${new Date(data.timestamp?.toMillis() || data.timestamp).toLocaleString()}`);
      });
    }

    console.log('\n🎯 Verificando resultados del juego...');
    const resultsRef = collection(db, 'game_results');
    const resultsQuery = query(resultsRef, orderBy('timestamp', 'desc'), limit(5));
    const resultsSnapshot = await getDocs(resultsQuery);
    
    console.log(`Total resultados encontrados: ${resultsSnapshot.size}`);
    
    if (resultsSnapshot.size > 0) {
      console.log('Últimos resultados:');
      resultsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}. ID: ${doc.id}`);
        console.log(`     Winning Numbers: ${data.winningNumbers}`);
        console.log(`     Winners: 1st=${data.firstPrize?.length || 0}, 2nd=${data.secondPrize?.length || 0}, 3rd=${data.thirdPrize?.length || 0}, Free=${data.freePrize?.length || 0}`);
        console.log(`     Timestamp: ${new Date(data.timestamp?.toMillis() || data.timestamp).toLocaleString()}`);
        console.log('');
      });
    }

    console.log('🎮 Verificando estado del juego...');
    const gameStateRef = collection(db, 'game_state');
    const gameStateSnapshot = await getDocs(gameStateRef);
    
    if (gameStateSnapshot.size > 0) {
      gameStateSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Estado del juego (${doc.id}):`);
        console.log(`  Winning Numbers: ${data.winningNumbers}`);
        console.log(`  Next Draw: ${data.nextDrawTime ? new Date(data.nextDrawTime.toMillis()).toLocaleString() : 'N/A'}`);
        console.log(`  Last Updated: ${data.lastUpdated ? new Date(data.lastUpdated.toMillis()).toLocaleString() : 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error verificando Firebase:', error);
  }
}

checkFirebaseData().then(() => {
  console.log('\n✅ Verificación completa');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
}); 