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
  appId: "1:1014108490203:web:0a23139f68d8aa9c54bffe"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let editandoCronograma = false;
let datosCronogramaLocal = [];
let alumnoDatosEnvio = { nombre: "", uid: "" };

// ==========================================
// 3. CONTROL DE INTERFAZ DINÁMICA
// ==========================================
function mostrarInterfazDocente() {
  console.log("-> Ejecutando mostrarInterfazDocente...");
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'block');
  
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'none';

  document.querySelectorAll('.materiales-descarga, .contenido-detalle-unidad, .student-only').forEach(el => {
    el.style.display = 'none';
  });

  cargarEntregasParaDocente();
  inicializarCronograma(true); 
  inicializarVisibilidadUnidades(true);
}

function mostrarInterfazEstudiante(nombreCompleto, uid) {
  console.log("-> Ejecutando mostrarInterfazEstudiante...");
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'none');
  
  document.querySelectorAll('.materiales-descarga, .contenido-detalle-unidad, #detalle-unidad').forEach(el => {
    el.style.display = 'block';
  });

  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'block';

  inicializarFormularioEntrega(nombreCompleto, uid);
  escucharEstadoEntregaAlumno(uid); 
  inicializarCronograma(false); 
  inicializarVisibilidadUnidades(false);
}

// ==========================================
// 4. GESTIÓN DEL CRONOGRAMA
// ==========================================
function inicializarCronograma(esDocente) {
  const contenedor = document.getElementById('contenedor-cronograma');
  const btnEditar = document.getElementById('btn-editar-cronograma');
  if (!contenedor) return;

  if (esDocente && btnEditar) {
    btnEditar.style.display = 'inline-block';
    btnEditar.onclick = () => alternarEdicionCronograma();
  }

  onSnapshot(doc(db, "configuracion", "cronograma"), (docSnap) => {
    if (!editandoCronograma) {
      if (docSnap.exists()) {
        datosCronogramaLocal = docSnap.data().clases || [];
      } else {
        datosCronogramaLocal = [
          { clase: "Clase 1", fecha: "Semana 1", tema: "Fundamentos de Datos y Looker Studio" },
          { clase: "Clase 2", fecha: "Semana 2", tema: "Modelado e introducción a la visualización" }
        ];
      }
      renderizarCronogramaAmodoVista();
    }
  });
}

function renderizarCronogramaAmodoVista() {
  const contenedor = document.getElementById('contenedor-cronograma');
  let html = `
    <table class="tabla-cronograma">
      <thead>
        <tr>
          <th>Sesión</th>
          <th>Fecha</th>
          <th>Eje Temático</th>
        </tr>
      </thead>
      <tbody>
  `;
  datosCronogramaLocal.forEach(c => {
    html += `
      <tr>
        <td class="txt-bold">${c.clase}</td>
        <td class="txt-muted">${c.fecha}</td>
        <td>${c.tema}</td>
      </tr>
    `;
  });
  html += `</tbody></table>`;
  if (contenedor) contenedor.innerHTML = html;
}

function alternarEdicionCronograma() {
  const contenedor = document.getElementById('contenedor-cronograma');
  const btnEditar = document.getElementById('btn-editar-cronograma');

  if (!editandoCronograma) {
    editandoCronograma = true;
    btnEditar.innerText = "💾 Guardar Cambios";
    btnEditar.style.backgroundColor = "#2563eb";

    let html = `<table class="tabla-cronograma"><tbody>`;
    datosCronogramaLocal.forEach((c, index) => {
      html += `
        <tr>
          <td><input type="text" id="edit-clase-${index}" value="${c.clase}" class="input-inline"></td>
          <td><input type="text" id="edit-fecha-${index}" value="${c.fecha}" class="input-inline"></td>
          <td><input type="text" id="edit-tema-${index}" value="${c.tema}" class="input-inline"></td>
        </tr>
      `;
    });
    html += `</tbody></table>
    <button onclick="agregarFilaCronograma()" class="btn-secundario">➕ Añadir Fila</button>`;
    if (contenedor) contenedor.innerHTML = html;
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
        btnEditar.style.backgroundColor = "#10b981";
        alert("¡Cronograma actualizado!");
      })
      .catch(err => alert("Error al salvar cronograma."));
  }
}

window.agregarFilaCronograma = function() {
  datosCronogramaLocal.forEach((_, index) => {
    const claseInput = document.getElementById(`edit-clase-${index}`);
    const fechaInput = document.getElementById(`edit-fecha-${index}`);
    const temaInput = document.getElementById(`edit-tema-${index}`);
    if (claseInput) datosCronogramaLocal[index].clase = claseInput.value;
    if (fechaInput) datosCronogramaLocal[index].fecha = fechaInput.value;
    if (temaInput) datosCronogramaLocal[index].tema = temaInput.value;
  });
  datosCronogramaLocal.push({ clase: "Nueva Clase", fecha: "Fecha", tema: "Descripción" });
  editandoCronograma = false; 
  alternarEdicionCronograma();
};

// ==========================================
// 5. VISIBILIDAD DE UNIDADES
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
      botonVisibilidad.innerText = estaVisible ? "👁️ Unidad 1: Visible para alumnos" : "👁️ Unidad 1: Oculta para alumnos";
      botonVisibilidad.style.backgroundColor = estaVisible ? "#10b981" : "#ef4444";
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
// 6. ENVIAR Y LEER ENTREGAS
// ==========================================
async function ejecutarEnvioFormulario(e) {
  e.preventDefault();
  const urlProyecto = document.getElementById('url-proyecto').value;
  const comentarios = document.getElementById('comentarios-proyecto').value;

  try {
    await setDoc(doc(db, "entregas", alumnoDatosEnvio.uid), {
      nombreAlumno: alumnoDatosEnvio.nombre,
      alumnoId: alumnoDatosEnvio.uid,
      linkLookerStudio: urlProyecto,
      comentariosAlumno: comentarios,
      fecha: new Date().toISOString(),
      estado: "Pendiente", 
      feedbackDocente: ""  
    });
    alert("¡Proyecto enviado con éxito a revisión!");
  } catch (error) {
    console.error("Error al subir entrega:", error);
  }
}

function inicializarFormularioEntrega(nombreEstudiante, userId) {
  const formEntrega = document.getElementById('form-entrega');
  if (!formEntrega) return;
  alumnoDatosEnvio.nombre = nombreEstudiante;
  alumnoDatosEnvio.uid = userId;
  formEntrega.removeEventListener('submit', ejecutarEnvioFormulario);
  formEntrega.addEventListener('submit', ejecutarEnvioFormulario);
}

function escucharEstadoEntregaAlumno(userId) {
  const form = document.getElementById('form-entrega');
  const leyendaUrl = document.getElementById('leyenda-url');
  const divPendiente = document.getElementById('estado-pendiente');
  const divAprobado = document.getElementById('estado-aprobado');
  const divRevisar = document.getElementById('estado-revisar');
  const txtAprobado = document.getElementById('feedback-aprobado');
  const txtRevisar = document.getElementById('feedback-revisar');

  onSnapshot(doc(db, "entregas", userId), (docSnap) => {
    if (form) form.style.display = 'block';
    if (leyendaUrl) leyendaUrl.style.display = 'block'; 
    if (divPendiente) divPendiente.style.display = 'none';
    if (divAprobado) divAprobado.style.display = 'none';
    if (divRevisar) divRevisar.style.display = 'none';

    if (docSnap.exists()) {
      const entrega = docSnap.data();
      const estado = entrega.estado;
      const feedback = entrega.feedbackDocente || "Sin observaciones adicionales.";

      if (estado === "Pendiente") {
        if (form) form.style.display = 'none';
        if (leyendaUrl) leyendaUrl.style.display = 'none'; 
        if (divPendiente) divPendiente.style.display = 'block';
      } else if (estado === "Aprobado") {
        if (form) form.style.display = 'none';
        if (leyendaUrl) leyendaUrl.style.display = 'none'; 
        if (divAprobado) {
          divAprobado.style.display = 'block';
          txtAprobado.innerText = feedback;
        }
      } else if (estado === "revisar") {
        if (form) form.style.display = 'none';
        if (leyendaUrl) leyendaUrl.style.display = 'none'; 
        if (divRevisar) {
          divRevisar.style.display = 'block';
          txtRevisar.innerText = feedback;
        }
      }
    }
  });
}

window.reabrirFormularioEntrega = function() {
  const form = document.getElementById('form-entrega');
  const divRevisar = document.getElementById('estado-revisar');
  const leyendaUrl = document.getElementById('leyenda-url');
  if (form) form.style.display = 'block';
  if (leyendaUrl) leyendaUrl.style.display = 'block';
  if (divRevisar) divRevisar.style.display = 'none';
};

function cargarEntregasParaDocente() {
  const tablaU1 = document.getElementById('lista-entregas-u1');
  if (!tablaU1) return;

  onSnapshot(collection(db, "entregas"), (snapshot) => {
    tablaU1.innerHTML = "";
    if (snapshot.empty) {
      tablaU1.innerHTML = `<tr><td colspan="5" class="tabla-vacia">No hay entregas registradas aún.</td></tr>`;
      return;
    }

    snapshot.forEach(async (docSnap) => {
      const entrega = docSnap.data();
      const idEntrega = docSnap.id;
      let nombreIdentificado = entrega.nombreAlumno || "Cargando...";

      let fechaFormateada = "Sin fecha";
      if (entrega.fecha) {
        const d = new Date(entrega.fecha);
        fechaFormateada = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} hs`;
      }

      let claseBadge = "badge-pendiente"; 
      if (entrega.estado === "Aprobado") claseBadge = "badge-aprobado";
      else if (entrega.estado === "revisar") claseBadge = "badge-revisar";

      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>
          <strong>${nombreIdentificado}</strong><br>
          <small class="txt-muted">${entrega.comentariosAlumno || 'Sin comentarios'}</small>
        </td>
        <td class="txt-muted font-sm">${fechaFormateada}</td>
        <td><a href="${entrega.linkLookerStudio}" target="_blank" class="btn-link">🔗 Ver Reporte</a></td>
        <td class="text-center"><span class="badge ${claseBadge}">${entrega.estado.toUpperCase()}</span></td>
        <td class="text-center"><button class="btn-evaluar" onclick="corregirEntrega('${idEntrega}')">Evaluar</button></td>
      `;
      tablaU1.appendChild(fila);
    });
  });
}

window.corregirEntrega = async function(id) {
  const seleccion = prompt("Dictamen:\nEscribe 'Aprobado' o 'revisar'");
  if (!seleccion) return; 
  const estadoFinal = seleccion.trim();
  if (estadoFinal !== "Aprobado" && estadoFinal !== "revisar") return alert("Opción inválida.");

  const feedback = prompt("Introduce el feedback:");
  if (feedback === null) return;

  try {
    await updateDoc(doc(db, "entregas", id), { estado: estadoFinal, feedbackDocente: feedback.trim() });
    alert("Evaluación guardada.");
  } catch (error) { console.error(error); }
};

// ==========================================
// 7. FLUJO PRINCIPAL DE ROL (SIN REDIRECCIONES)
// ==========================================
onAuthStateChanged(auth, async (user) => {
  const txtSaludo = document.getElementById('saludo-usuario');
  if (user) {
    try {
      const userDocSnap = await getDoc(doc(db, "usuarios", user.uid));
      if (userDocSnap.exists()) {
        const datos = userDocSnap.data();
        const nombre = datos.nombre || user.email;
        
        if (datos.rol === "docente") {
          if (txtSaludo) txtSaludo.innerHTML = `👨‍🏫 <strong>Docente:</strong> ${nombre}`;
          mostrarInterfazDocente();
        } else {
          if (txtSaludo) txtSaludo.innerHTML = `👨‍🎓 <strong>Alumno:</strong> ${nombre}`;
          mostrarInterfazEstudiante(nombre, user.uid);
        }
      }
    } catch (e) { console.error("Error cargando perfil:", e); }
  } else {
    // Si cierran sesión o intentan forzar la URL sin loguearse, vuelven al inicio
    window.location.href = "index.html";
  }
});

const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if (btnCerrarSesion) {
  btnCerrarSesion.addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
  });
}
