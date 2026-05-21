import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firestore.js";

// 1. Configuración de Firebase
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
const db = getFirestore(app);

// CONTROL DE ACCESO MEDIANTE FIRESTORE
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        try {
            const usuarioDocRef = doc(db, "usuarios", user.uid); 
            const usuarioSnap = await getDoc(usuarioDocRef);

            if (usuarioSnap.exists()) {
                const datosUsuario = usuarioSnap.data();
                const rolUsuario = datosUsuario.rol; 

                console.log(`Usuario verificado: ${datosUsuario.nombre} | Rol: ${rolUsuario}`);
                aplicarPermisosEnPantalla(rolUsuario);
            } else {
                console.error("El usuario no tiene un perfil configurado en la base de datos.");
                alert("Error de acceso: Perfil no encontrado en Firestore. Verifica que el ID del documento coincida exactamente con tu User UID.");
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
        elementosDocente.forEach(el => el.style.display = 'block');
        elementosEstudiante.forEach(el => el.style.display = 'none'); 
        
        cargarControlesVisibilidad();
        cargarTodasLasEntregas();
    } else {
        elementosDocente.forEach(el => el.style.display = 'none');
        elementosEstudiante.forEach(el => el.style.display = 'block');
        
        aplicarRestriccionesAlumno();
    }
}

// LOGICA PARA EL BOTÓN DE CERRAR SESIÓN
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if(btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((err) => {
            console.error("Error al cerrar sesión:", err);
        });
    });
}

// =========================================================================
// FUNCIONES DE SOPORTE (Evitan que el código falle por no estar declaradas)
// =========================================================================

async function cargarControlesVisibilidad() {
    try {
        const configDoc = doc(db, "configuracion", "unidades");
        const docSnap = await getDoc(configDoc);
        if (docSnap.exists()) {
            const estados = docSnap.data();
            for (let i = 1; i <= 4; i++) {
                const botonEstado = document.getElementById(`estado-unidad${i}`);
                if (botonEstado) {
                    botonEstado.innerText = estados[`unidad${i}`] ? "🟢 Visible para Alumnos" : "🔴 Oculto para Alumnos";
                }
            }
        }
    } catch (e) { console.log("Nota: Colección 'configuracion' aún no creada en Firestore."); }
}

async function cargarTodasLasEntregas() {
    try {
        const querySnapshot = await getDocs(collection(db, "tp_entregas"));
        for(let i=1; i<=4; i++) {
            const lista = document.getElementById(`lista-entregas-u${i}`);
            if(lista) lista.innerHTML = "";
        }
        querySnapshot.forEach((alumnoDoc) => {
            const datos = alumnoDoc.data();
            const idUnidad = datos.unidad;
            const contenedorLista = document.getElementById(`lista-entregas-u${idUnidad.replace("unidad", "")}`);
            if (contenedorLista) {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td><strong>${datos.alumnoNombre}</strong><br><small>${datos.alumnoEmail}</small></td>
                    <td><a href="${datos.linkEntrega}" target="_blank">🔗 Ver Trabajo</a></td>
                    <td><span>${datos.nota || "Sin calificar"}</span></td>
                    <td><button>📝 Corregir</button></td>
                `;
                contenedorLista.appendChild(fila);
            }
        });
    } catch(e) { console.log("Nota: Colección 'tp_entregas' vacía o aún no creada."); }
}

async function aplicarRestriccionesAlumno() {
    try {
        const configDoc = doc(db, "configuracion", "unidades");
        const docSnap = await getDoc(configDoc);
        if (docSnap.exists()) {
            const estados = docSnap.data();
            for (let i = 1; i <= 4; i++) {
                const seccionUnidad = document.getElementById(`unidad${i}`);
                if (seccionUnidad && !estados[`unidad${i}`]) {
                    seccionUnidad.style.display = "none";
                }
            }
        }
    } catch(e) { console.log("Error al aplicar restricciones."); }
}

// Ventana global para usar los botones del HTML
window.cambiarVisibilidad = async function(idUnidad) {
    const botonEstado = document.getElementById(`estado-${idUnidad}`);
    const configDoc = doc(db, "configuracion", "unidades");
    const esVisibleActual = botonEstado.innerText.includes("🟢");
    const nuevoEstado = !esVisibleActual;

    await updateDoc(configDoc, { [idUnidad]: nuevoEstado });
    botonEstado.innerText = nuevoEstado ? "🟢 Visible para Alumnos" : "🔴 Oculto para Alumnos";
};
