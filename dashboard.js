import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. Tu misma configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBfSWaVPdbqtkxX7pLpCSWVehSVtK-olNY",
  authDomain: "aula-virtual-data-studio.firebaseapp.com",
  projectId: "aula-virtual-data-studio",
  storageBucket: "aula-virtual-data-studio.firebasestorage.app",
  messagingSenderId: "1014108490203",
  appId: "1:1014108490203:web:0a23139f68d8aa9c54bffe",
  measurementId: "G-MLB9YFMSXV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// REGLA DE SEGURIDAD FÁCIL: Define aquí tu correo de docente
const EMAIL_DOCENTE = "tu-email-de-linkedin-o-profesional@ejemplo.com"; 

// 2. Controlar quién está de visita en la página
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Si no hay usuario logueado, lo expulsamos al Login inmediatamente
        window.location.href = "index.html";
    } else {
        // ¡El usuario está logueado! Ahora chequeamos su rol
        console.log("Usuario actual:", user.email);
        
        configurarInterfazSegunRol(user.email);
    }
});

// 3. Función para mostrar/ocultar elementos según el rol
function configurarInterfazSegunRol(emailUsuario) {
    const vistasAdmin = document.querySelectorAll('.admin-view, .admin-only');
    const vistasEstudiante = document.querySelectorAll('.student-view');

    if (emailUsuario === EMAIL_DOCENTE) {
        // SOS EL DOCENTE: Mostramos herramientas de edición y entregas de alumnos
        vistasAdmin.forEach(el => el.style.display = 'block');
        vistasEstudiante.forEach(el => el.style.display = 'none'); // El docente no necesita entregar tareas
        console.log("Modo: Docente habilitado.");
    } else {
        // ES UN ALUMNO: Ocultamos lo del admin y aseguramos la vista de estudiante
        vistasAdmin.forEach(el => el.style.display = 'none');
        vistasEstudiante.forEach(el => el.style.display = 'block');
        console.log("Modo: Estudiante habilitado.");
    }
}

// 4. Agregar lógica para el botón de Cerrar Sesión (opcional, por si quieres sumarlo al HTML)
// Solo necesitas un botón con id="btnCerrarSesion" en tu dashboard
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if(btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}
