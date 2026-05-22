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

// Inicializar servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables globales de control para el cronograma
let editandoCronograma = false;
let datosCronogramaLocal = [];

// ==========================================
// 3. VISTAS Y ROLES: CONTROL DE FLUJO
// ==========================================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Usuario autenticado:", user.email);
    
    try {
      // Buscamos el rol del usuario en la colección 'usuarios' de Firestore
      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const datosUsuario = userDocSnap.data();
        const rol = datosUsuario.rol; // Puede ser 'docente' o 'estudiante'
        console.log("Rol detectado:", rol);

        if (rol === "docente") {
          mostrarInterfazDocente();
        } else {
          mostrarInterfazEstudiante(user.email, user.uid);
        }
      } else {
        console.warn("El usuario no tiene un documento de rol en Firestore. Forzando vista estudiante.");
        mostrarInterfazEstudiante(user.email, user.uid);
      }
    } catch (error) {
      console.error("Error al obtener el rol de Firestore:", error);
      // Por seguridad ante fallas, mostramos la vista básica de alumno
      mostrarInterfazEstudiante(user.email, user.uid);
    }
  } else {
    console.log("No hay usuario activo. Redirigiendo al login...");
    window.location.href = "index.html";
  }
});

// Activar la interfaz de Docente
function mostrarInterfazDocente() {
  // 1. Mostrar elementos de administración
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'block');
  
  // Ocultar formulario de entregas
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'none';

  // 2. Ejecutar cargadores pasando el parámetro de rol Docente (true)
  cargarEntregasParaDocente();
  inicializarCronograma(true); 
  inicializarVisibilidadUnidades(true);
}

// Activar la interfaz de Estudiante
function mostrarInterfazEstudiante(email, uid) {
  // 1. Ocultar herramientas exclusivas de profesor
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'none');
  
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'block';

  // 2. Ejecutar cargadores pasando el parámetro de rol Docente (false)
  inicializarFormularioEntrega(email, uid);
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

  // Escuchamos el documento "configuracion/cronograma" en tiempo real
  onSnapshot(doc(db, "configuracion", "cronograma"), (docSnap) => {
    if (!editandoCronograma) {
      if (docSnap.exists()) {
        datosCronogramaLocal = docSnap.data().clases || [];
      } else {
        // Datos por defecto si Firestore está vacío
        datosCronogramaLocal = [
          { clase: "Clase 1", fecha: "Semana 1", tema: "Fundamentos de Datos" },
          { clase: "Clase 2", fecha: "Semana 2", tema: "Primeros pasos en Looker Studio" }
        ];
      }
      renderizarCronogramaAmodoVista();
    }
  });
}

// Renderiza la tabla limpia para lectura
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

// Transforma la tabla en inputs editables para el Profesor
function alternarEdicionCronograma() {
  const contenedor = document.getElementById('contenedor-cronograma');
  const btnEditar = document.getElementById('btn-editar-cronograma');

  if (!editandoCronograma) {
    // Pasar a modo EDICIÓN
    editandoCronograma = true;
    btnEditar.innerText = "💾 Guardar Cambios";
    btnEditar.style.backgroundColor = "#007bff";

    let html = `
      <p style="color: #007bff; font-size:13px; font-weight:bold;">Modo Edición Activo. Modifica los campos directamente:</p>
      <table style="width:100%; border-collapse: collapse;">
        <tbody>
    `;

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
    <button onclick="agregarFilaCronograma()" style="margin-top:10px; padding: 5px 10px; font-size:12px; background:#6c757d; color:white; border:none; border-radius:3px; cursor:pointer;">➕ Añadir Fila</button>`;
    contenedor.innerHTML = html;

  } else {
    // GUARDAR los cambios en Firestore
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
        alert("¡Cronograma actualizado globalmente!");
      })
      .catch(err => {
        console.error("Error al salvar cronograma:", err);
        alert("No se pudieron guardar los cambios.");
      });
  }
}

// Función auxiliar global para añadir filas dinámicamente en modo edición
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
    const estados = docSnap.exists() ? docSnap.data() : { unidad1: true, unidad2: true };
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
      if (estaVisible) {
        botonVisibilidad.innerText = "👁️ Unidad: VISIBLE para alumnos";
        botonVisibilidad.style.backgroundColor = "#28a745";
      } else {
        botonVisibilidad.innerText = "👁️ Unidad: OCULTA para alumnos";
        botonVisibilidad.style.backgroundColor = "#dc3545";
      }
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
    
    const nuevoEstado = !estadosActuales[keyUnidad];
    
    await setDoc(docRef, {
      ...estadosActuales,
      [keyUnidad]: nuevoEstado
    }, { merge: true });
    
    console.log(`Estado de ${keyUnidad} cambiado a: ${nuevoEstado}`);
  } catch (error) {
    console.error("Error al cambiar visibilidad:", error);
  }
};

// ==========================================
// 6. LÓGICA DE PROCESOS: ENVIAR Y LEER ENTREGAS
// ==========================================

// Alumno: Envía la tarea
function inicializarFormularioEntrega(userEmail, userId) {
  const formEntrega = document.getElementById('form-entrega');
  if (!formEntrega) return;

  // Evitamos ejecuciones múltiples clonando el nodo del formulario
  const nuevoForm = formEntrega.cloneNode(true);
  formEntrega.parentNode.replaceChild(nuevoForm, formEntrega);

  nuevoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const urlProyecto = document.getElementById('url-proyecto').value;
    const comentarios = document.getElementById('comentarios-proyecto').value;
    const fechaEnvio = new Date().toISOString();

    try {
      await setDoc(doc(db, "entregas", userId), {
        emailAlumno: userEmail,
        alumnoId: userId,
        linkLookerStudio: urlProyecto,
        comentariosAlumno: comentarios,
        fecha: fechaEnvio,
        estado: "Pendiente de corrección"
      });

      const msg = document.getElementById('mensaje-exito');
      if (msg) {
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 5000);
      }
      nuevoForm.reset();
      alert("¡Proyecto enviado correctamente!");
    } catch (error) {
      console.error("Error al subir la entrega:", error);
      alert("Hubo un error al guardar tu entrega en la base de datos.");
    }
  });
}

// Docente: Trae las entregas en tiempo real
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
        <td><span style="background: #e0e0e0; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${entrega.estado || 'Pendiente'}</span></td>
        <td>
          <button class="btn-logout" style="padding: 4px 8px; font-size: 11px; background: #007bff;" onclick="corregirEntrega('${idEntrega}')">Calificar</button>
        </td>
      `;
      tablaU1.appendChild(fila);
    });
  });
}

// Docente: Cambiar estado o colocar nota
window.corregirEntrega = async function(id) {
  const nota = prompt("Introduce la nota o estado para este proyecto (Ej: Aprobado, 7/10, Rehacer):");
  if (nota === null || nota.trim() === "") return;

  try {
    const entregaRef = doc(db, "entregas", id);
    await updateDoc(entregaRef, { estado: nota });
    alert("¡Calificación guardada!");
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
    signOut(auth)
      .then(() => {
        console.log("Sesión cerrada correctamente.");
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Error al cerrar sesión:", error);
        alert("No se pudo cerrar la sesión correctamente.");
      });
  });
}
