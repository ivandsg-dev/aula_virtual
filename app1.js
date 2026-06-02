// 1. Importar las funciones necesarias desde los servidores de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 2. CONFIGURACIÓN DE TU PROYECTO (Pega aquí lo que te dio la consola de Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyBfSWaVPdbqtkxX7pLpCSWVehSVtK-olNY",
  authDomain: "aula-virtual-data-studio.firebaseapp.com",
  projectId: "aula-virtual-data-studio",
  storageBucket: "aula-virtual-data-studio.firebasestorage.app",
  messagingSenderId: "1014108490203",
  appId: "1:1014108490203:web:0a23139f68d8aa9c54bffe",
  measurementId: "G-MLB9YFMSXV"
};

// 3. Inicializar Firebase y el servicio de Autenticación
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 4. Capturar el formulario de Login en el HTML
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

// 5. Escuchar el evento de envío del formulario
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Evita que la página se recargue

    // Obtener los datos ingresados por el alumno
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Ocultar mensaje de error previo si existía
    errorMessage.style.display = 'none';

    // Función de Firebase para loguear usuarios con Mail y Clave
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Login exitoso
            const user = userCredential.user;
            console.log("Usuario logueado con éxito:", user.uid);
            
            // Redirigir al alumno al panel principal del curso
            window.location.href = "aula.html";
        })
        .catch((error) => {
            // Si hay un error (ej: contraseña incorrecta o usuario no existe)
            errorMessage.innerText = "Error: Credenciales incorrectas. Verifica tu correo y contraseña.";
            errorMessage.style.display = 'block';
            console.error("Error en Firebase Auth:", error.message);
        });
});

// 6. OBSERVAR EL ESTADO DEL USUARIO (Opcional pero recomendado)
// Esto sirve para saber si un usuario ya estaba logueado y mandarlo directo al dashboard sin pasar por el login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Si ya está logueado, lo mandamos al dashboard
        window.location.href = "aula.html";
    }
});
