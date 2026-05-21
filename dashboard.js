import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firestore.js";

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

// CONTROL DE ACCESO MEDIANTE FIRESTORE
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Si no está logueado, va al login
        window.location.href = "index.html";
    } else {
        // El usuario se autenticó. Vamos a buscar su rol real en la base de datos
        try {
            const usuarioDocRef = doc(db, "usuarios", user.uid); // Buscamos su documento usando su UID
            const usuarioSnap = await getDoc(usuarioDocRef);

            if (usuarioSnap.exists()) {
                const datosUsuario = usuarioSnap.data();
                const rolUsuario = datosUsuario.rol; // Almacena "docente" o "estudiante"

                console.log(`Usuario verificado: ${datosUsuario.nombre} | Rol: ${rolUsuario}`);
                aplicarPermisosEnPantalla(rolUsuario);
            } else {
                // Caso extremo: El usuario existe en Authentication pero lo borraste de Firestore
                console.error("El usuario no tiene un perfil configurado en la base de datos.");
                alert("Error de acceso: Perfil no encontrado.");
                window.location.href = "index.html";
            }
        } catch (error) {
            console.error("Error al validar el rol:", error);
        }
    }
});

// FUNCIÓN PARA RESTRINGIR O MOSTRAR LA INTERFAZ
function aplicarPermisosEnPantalla(rol) {
    const elementosDocente = document.querySelectorAll('.admin-only, .admin-view');
    const elementosEstudiante = document.querySelectorAll('.student-view');

    if (rol === "docente") {
        // PERMISOS DE DOCENTE: Ve herramientas de edición y paneles de corrección
        elementosDocente.forEach(el => el.style.display = 'block');
        elementosEstudiante.forEach(el => el.style.display = 'none'); 
        
        // Ejecuta tus funciones de gestión
        cargarControlesVisibilidad();
        cargarTodasLasEntregas();
    } else {
        // PERMISOS DE ESTUDIANTE: Solo ve el material permitido y su zona de entrega
        elementosDocente.forEach(el => el.style.display = 'none');
        elementosEstudiante.forEach(el => el.style.display = 'block');
        
        // Aplica el filtro para ocultar las unidades desactivadas por el docente
        aplicarRestriccionesAlumno();
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
