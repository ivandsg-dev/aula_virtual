// ==========================================
// 1. IMPORTACIONES OFICIALES DE FIREBASE 10.8.0
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 2. CONFIGURACIÓN DE FIREBASE
// ==========================================
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

let editandoCronograma = false;
let datosCronogramaLocal = [];

// ==========================================
// 3. VISTAS Y ROLES: CONTROL DE FLUJO
// ==========================================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario autenticado:", user.email);
    try {
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const datosUsuario = userDocSnap.data();
        const rol = datosUsuario.rol;

        if (rol === "docente") {
          mostrarInterfazDocente();
        } else {
          mostrarInterfazEstudiante(user.email, user.uid);
        }
      } else {
        mostrarInterfazEstudiante(user.email, user.uid);
      }
    } catch (error) {
      console.error("Error al obtener el rol:", error);
      mostrarInterfazEstudiante(user.email, user.uid);
    }
  } else {
    window.location.href = "index.html";
  }
});

function mostrarInterfazDocente() {
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'block');
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'none';

  cargarEntregasParaDocente();
  inicializarCronograma(true); 
  inicializarVisibilidadUnidades(true);
}

function mostrarInterfazEstudiante(email, uid) {
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'none');
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'block';

  inicializarFormularioEntrega(email, uid);
  escucharEstadoEntregaAlumno(uid); // Escucha en tiempo real si el docente lo califica
  inicializarCronograma(false); 
  inicializarVisibilidadUnidades(false);
}

// ==========================================
// 4. SECCIÓN: GESTIÓN DEL CRONOGRAMA
// ==========================================
function inicializarCronograma(esDocente) {
  const contenedor = document.getElementById('contenedor-cronograma');
  const btnEditar = document.getElementById('btn-editar-cronograma');
  if (!contenedor) return;

  if (esDocente && btnEditar) {
    btnEditar.style.display = 'block';
    btnEditar.onclick = () => alternarEdicionCronograma();
  }

  onSnapshot(doc(db, "configuracion", "cronograma"), (docSnap) => {
    if (!editandoCronograma) {
      if (docSnap.exists()) {
        datosCronogramaLocal = docSnap.data().clases || [];
      } else {
        datosCronogramaLocal = [
          { clase: "Clase 1", fecha: "Semana 1", tema: "Fundamentos de Datos" },
          { clase: "Clase 2", fecha: "Semana 2", tema: "Primeros pasos en Looker Studio" }
        ];
      }
      renderizarCronogramaAmodoVista();
    }
  });
}

function renderizarCronogramaAmodoVista() {
  const contenedor = document.getElementById('contenedor-cronograma');
  let html = `
    <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; text-align: left;">
          <th style="padding: 10px;">Sesión</th>
          <th style="padding: 10px;">Fecha</th>
          <th style="padding: 10px;">Eje Temático</th>
        </tr>
      </thead>
      <tbody>
  `;
  datosCronogramaLocal.forEach(c => {
    html += `
      <tr style="border-bottom: 1px solid #dee2e6;">
        <td style="padding: 10px; font-weight: bold;">${c.clase}</td>
        <td style="padding: 10px; color: #555;">${c.fecha}</td>
        <td style="padding: 10px;">${c.tema}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

function alternarEdicionCronograma() {
  const contenedor = document.getElementById('contenedor-cronograma');
  const btnEditar = document.getElementById('btn-editar-cronograma');

  if (!editandoCronograma) {
    editandoCronograma = true;
    btnEditar.innerText = "💾 Guardar Cambios";
    btnEditar.style.backgroundColor = "#007bff";

    let html = `<table style="width:100%; border-collapse: collapse;"><tbody>`;
    datosCronogramaLocal.forEach((c, index) => {
      html += `
        <tr style="border-bottom: 1px solid #dee2e6; background: #fdfdfd;">
          <td style="padding: 6px;"><input type="text" id="edit-clase-${index}" value="${c.clase}" style="width:90%; padding:4px;"></td>
          <td style="padding: 6px;"><input type="text" id="edit-fecha-${index}" value="${c.fecha}" style="width:90%; padding:4px;"></td>
          <td style="padding: 6px;"><input type="text" id="edit-tema-${index}" value="${c.tema}" style="width:95%; padding:4px;"></td>
        </tr>
      `;
    });
    html += `</tbody></table>
    <button onclick="agregarFilaCronograma()" style="margin-top:10px; padding: 5px 10px; background:#6c757d; color:white; border:none; border-radius:3px; cursor:pointer;">➕ Añadir Fila</button>`;
    contenedor.innerHTML = html;
  } else {
    const nuevasClases = [];
    datosCronogramaLocal.forEach((_, index) => {
      const claseVal = document.getElementById(`edit-clase-${index}`).value;
      const fechaVal = document.getElementById(`edit-fecha-${index}`).value;
      const temaVal = document.getElementById(`edit-tema-${index}`).value;
      if (claseVal || fechaVal || temaVal) {
        nuevasClases.push({ clase: claseVal, fecha: fechaVal, tema: temaVal });
      }
    });

    setDoc(doc(db, "configuracion", "cronograma"), { clases: nuevasClases })
      .then(() => {
        editandoCronograma = false;
        btnEditar.innerText = "📝 Editar cronograma";
        btnEditar.style.backgroundColor = "#28a745";
        alert("¡Cronograma actualizado!");
      })
      .catch(err => alert("Error al salvar cronograma."));
  }
}

window.agregarFilaCronograma = function() {
  datosCronogramaLocal.forEach((_, index) => {
    datosCronogramaLocal[index].clase = document.getElementById(`edit-clase-${index}`).value;
    datosCronogramaLocal[index].fecha = document.getElementById(`edit-fecha-${index}`).value;
    datosCronogramaLocal[index].tema = document.getElementById(`edit-tema-${index}`).value;
  });
  datosCronogramaLocal.push({ clase: "Nueva Clase", fecha: "Fecha", tema: "Descripción" });
  editandoCronograma = false; 
  alternarEdicionCronograma();
};

// ==========================================
// 5. SECCIÓN: VISIBILIDAD DE UNIDADES
// ==========================================
function inicializarVisibilidadUnidades(esDocente) {
  onSnapshot(doc(db, "configuracion", "unidades_visibilidad"), (docSnap) => {
    const estados = docSnap.exists() ? docSnap.data() : { unidad1: true };
    gestionarFiltroUnidad("unidad1", "1", estados.unidad1, esDocente);
  });
}

function gestionarFiltroUnidad(keyUnidad, numeroId, estaVisible, esDocente) {
  const contenido = document.getElementById(`contenido-unidad-${numeroId}`);
  const bloqueo = document.getElementById(`bloqueo-unidad-${numeroId}`);
  const botonVisibilidad = document.getElementById(`btn-visibilidad-u1`);

  if (!contenido) return;

  if (esDocente) {
    contenido.style.display = "block";
    if (bloqueo) bloqueo.style.display = "none";
    if (botonVisibilidad) {
      botonVisibilidad.innerText = estaVisible ? "👁️ Unidad: VISIBLE para alumnos" : "👁️ Unidad: OCULTA para alumnos";
      botonVisibilidad.style.backgroundColor = estaVisible ? "#28a745" : "#dc3545";
    }
  } else {
    if (estaVisible) {
      contenido.style.display = "block";
      if (bloqueo) bloqueo.style.display = "none";
    } else {
      contenido.style.display = "none";
      if (bloqueo) bloqueo.style.display = "block";
    }
  }
}

window.cambiarVisibilidadUnidad = async function(keyUnidad) {
  const docRef = doc(db, "configuracion", "unidades_visibilidad");
  try {
    const docSnap = await getDoc(docRef);
    let estadosActuales = docSnap.exists() ? docSnap.data() : { unidad1: true };
    await setDoc(docRef, { ...estadosActuales, [keyUnidad]: !estadosActuales[keyUnidad] }, { merge: true });
  } catch (error) {
    console.error("Error al cambiar visibilidad:", error);
  }
};

// ==========================================
// 6. LÓGICA DE PROCESOS: ENVIAR Y LEER ENTREGAS
// ==========================================

// Alumno: Inicializa el envío del formulario
function inicializarFormularioEntrega(userEmail, userId) {
  const formEntrega = document.getElementById('form-entrega');
  if (!formEntrega) return;

  const nuevoForm = formEntrega.cloneNode(true);
  formEntrega.parentNode.replaceChild(nuevoForm, formEntrega);

  nuevoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const urlProyecto = document.getElementById('url-proyecto').value;
    const comentarios = document.getElementById('comentarios-proyecto').value;

    try {
      await setDoc(doc(db, "entregas", userId), {
        emailAlumno: userEmail,
        alumnoId: userId,
        linkLookerStudio: urlProyecto,
        comentariosAlumno: comentarios,
        fecha: new Date().toISOString(),
        estado: "Pendiente", // Estado inicial base
        feedbackDocente: ""  // Inicialmente vacío
      });
      alert("¡Proyecto enviado a evaluación!");
    } catch (error) {
      console.error("Error al subir entrega:", error);
    }
  });
}

// Alumno: Escucha en tiempo real cambios en su nota para reajustar los cuadros informativos
function escucharEstadoEntregaAlumno(userId) {
  const form = document.getElementById('form-entrega');
  const divPendiente = document.getElementById('estado-pendiente');
  const divAprobado = document.getElementById('estado-aprobado');
  const divRevisar = document.getElementById('estado-revisar');
  const txtAprobado = document.getElementById('feedback-aprobado');
  const txtRevisar = document.getElementById('feedback-revisar');

  onSnapshot(doc(db, "entregas", userId), (docSnap) => {
    // Ocultamos todos los elementos por defecto para resetear la vista
    if (form) form.style.display = 'block';
    if (divPendiente) divPendiente.style.display = 'none';
    if (divAprobado) divAprobado.style.display = 'none';
    if (divRevisar) divRevisar.style.display = 'none';

    if (docSnap.exists()) {
      const entrega = docSnap.data();
      const estado = entrega.estado;
      const feedback = entrega.feedbackDocente || "Sin observaciones adicionales.";

      if (estado === "Pendiente") {
        if (form) form.style.display = 'none';
        if (divPendiente) divPendiente.style.display = 'block';
      } else if (estado === "Aprobado") {
        if (form) form.style.display = 'none';
        if (divAprobado) {
          divAprobado.style.display = 'block';
          txtAprobado.innerText = feedback;
        }
      } else if (estado === "revisar") {
        if (form) form.style.display = 'none';
        if (divRevisar) {
          divRevisar.style.display = 'block';
          txtRevisar.innerText = feedback;
        }
      }
    }
  });
}

// Función auxiliar por si el alumno hace clic en "Volver a presentar tarea"
window.reabrirFormularioEntrega = function() {
  const form = document.getElementById('form-entrega');
  const divRevisar = document.getElementById('estado-revisar');
  if (form) form.style.display = 'block';
  if (divRevisar) divRevisar.style.display = 'none';
};

// Docente: Carga la lista de alumnos entregados
function cargarEntregasParaDocente() {
  const tablaU1 = document.getElementById('lista-entregas-u1');
  if (!tablaU1) return;

  onSnapshot(collection(db, "entregas"), (snapshot) => {
    tablaU1.innerHTML = "";
    if (snapshot.empty) {
      tablaU1.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay entregas registradas aún.</td></tr>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const entrega = docSnap.data();
      const idEntrega = docSnap.id;

      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td><strong>${entrega.emailAlumno || 'Alumno'}</strong><br><small style="color:gray;">${entrega.comentariosAlumno || ''}</small></td>
        <td><a href="${entrega.linkLookerStudio}" target="_blank" class="download-link" style="padding: 5px 10px; font-size: 12px; text-decoration: none;">🔗 Ver Reporte</a></td>
        <td><span style="background: #e0e0e0; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight:bold;">${entrega.estado}</span></td>
        <td>
          <button class="btn-logout" style="padding: 4px 8px; font-size: 11px; background: #007bff;" onclick="corregirEntrega('${idEntrega}')">Evaluar</button>
        </td>
      `;
      tablaU1.appendChild(fila);
    });
  });
}

// Docente: Evalúa abriendo prompts para elegir el estado ("Aprobado" o "revisar") y añadir feedback escrito
window.corregirEntrega = async function(id) {
  const seleccion = prompt("Selecciona el dictamen del proyecto:\nEscribe 'Aprobado' para aprobar.\nEscribe 'revisar' si requiere correcciones.");
  
  if (seleccion === null) return; // Cancelado
  
  const estadoFinal = seleccion.trim();
  if (estadoFinal !== "Aprobado" && estadoFinal !== "revisar") {
    alert("Opción inválida. Debes escribir exactamente 'Aprobado' o 'revisar' (respetando minúsculas/mayúsculas).");
    return;
  }

  const feedback = prompt("Introduce las observaciones o feedback personalizado para el alumno:");
  if (feedback === null) return;

  try {
    const entregaRef = doc(db, "entregas", id);
    await updateDoc(entregaRef, { 
      estado: estadoFinal,
      feedbackDocente: feedback.trim()
    });
    alert("¡Evaluación y feedback guardados con éxito!");
  } catch (error) {
    console.error("Error al calificar:", error);
    alert("No se pudo actualizar la nota.");
  }
};

// ==========================================
// 7. BOTÓN DE CERRAR SESIÓN
// ==========================================
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if (btnCerrarSesion) {
  btnCerrarSesion.addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
  });
}
