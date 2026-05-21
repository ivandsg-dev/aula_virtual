import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. Tu misma configuración de Firebase
const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUÍ",
    authDomain: "TU_AUTH_DOMAIN_AQUÍ",
    projectId: "TU_PROJECT_ID_AQUÍ",
    storageBucket: "TU_STORAGE_BUCKET_AQUÍ",
    messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUÍ",
    appId: "TU_APP_ID_AQUÍ"
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
