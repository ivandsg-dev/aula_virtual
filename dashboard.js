import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
      document.querySelectorAll('.admin-view, .admin-only').forEach(el => {
        el.style.display = 'block';
        
        cargarControlesVisibilidad();
        cargarTodasLasEntregas();
        cargarEntregasParaDocente();
    } else {
        elementosDocente.forEach(el => el.style.display = 'none');
        elementosEstudiante.forEach(el => el.style.display = 'block');
        
        aplicarRestriccionesAlumno();
    }
}

// FUNCION PARA LA ENTREGA DE LOS TRABAJOS

function cargarEntregasParaDocente() {
  const tablaU1 = document.getElementById('lista-entregas-u1');
  if (!tablaU1) return;

  // Escuchamos la colección "entregas" en tiempo real
  onSnapshot(collection(db, "entregas"), (snapshot) => {
    tablaU1.innerHTML = ""; // Limpiamos la tabla para que no se dupliquen las filas

    if (snapshot.empty) {
      tablaU1.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay entregas registradas aún.</td></tr>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const entrega = docSnap.data();
      const idEntrega = docSnap.id; // Es el UID del alumno

      // Creamos una fila por cada entrega recibida
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td><strong>${entrega.emailAlumno || 'Alumno'}</strong><br><small style="color:gray;">${entrega.comentariosAlumno || ''}</small></td>
        <td><a href="${entrega.linkLookerStudio}" target="_blank" class="download-link" style="padding: 5px 10px; font-size: 12px;">🔗 Ver Reporte</a></td>
        <td><span class="badge-estado">${entrega.estado || 'Pendiente'}</span></td>
        <td>
          <button class="btn-toggle" style="padding: 4px 8px; font-size: 11px;" onclick="corregirEntrega('${idEntrega}')">Calificar</button>
        </td>
      `;
      tablaU1.appendChild(fila);
    });
  });
}

// Hacemos la función de corrección accesible desde el HTML global
window.corregirEntrega = async function(id) {
  const nota = prompt("Introduce la nota o estado para este proyecto (Ej: Aprobado, 9/10, Rehacer):");
  if (nota === null || nota.trim() === "") return; // Si cancela, no hace nada

  try {
    const entregaRef = doc(db, "entregas", id);
    await updateDoc(entregaRef, {
      estado: nota
    });
    alert("¡Calificación actualizada con éxito!");
  } catch (error) {
    console.error("Error al calificar:", error);
    alert("No se pudo guardar la nota. Revisa los permisos.");
  }
};

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
