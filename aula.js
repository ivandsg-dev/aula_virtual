// ==========================================
// 1. IMPORTACIONES OFICIALES Y CONFIGURACIÓN DE EMAILJS
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// INICIALIZACIÓN DE EMAILJS (Reemplaza con tu Public Key de EmailJS)
emailjs.init({ publicKey: "hB83knHaT6twiUZJ9" });

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
// 2. CONTROL DE INTERFAZ DINÁMICA
// ==========================================
function mostrarInterfazDocente() {
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'block');
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'none';

  cargarEntregasParaDocenteSeparadas();
  inicializarCronograma(true); 
  inicializarVisibilidadElementosAvanzado(true);
}

function mostrarInterfazEstudiante(nombreCompleto, uid) {
  document.querySelectorAll('.admin-view, .admin-only').forEach(el => el.style.display = 'none');
  const vistaEstudiante = document.getElementById('vista-estudiante');
  if (vistaEstudiante) vistaEstudiante.style.display = 'block';

  for (let i = 1; i <= 4; i++) {
    inicializarFormularioEntregaEspecifico(nombreCompleto, uid, i);
  }
  
  escucharTodasLasEntregasAlumno(uid); 
  inicializarCronograma(false); 
  inicializarVisibilidadElementosAvanzado(false);
}

// ==========================================
// 3. GESTIÓN DEL CRONOGRAMA
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
          { clase: "Clase 1", fecha: "Semana 1", tema: "Fundamentos de Datos y Looker Studio", link: "" }
        ];
      }
      renderizarCronogramaAmodoVista();
    }
  });
}

function renderizarCronogramaAmodoVista() {
  const contenedor = document.getElementById('contenedor-cronograma');
  let html = `<table class="tabla-cronograma"><thead><tr><th>Sesión</th><th>Fecha</th><th>Eje Temático</th><th>Acceso Clase</th></tr></thead><tbody>`;
  datosCronogramaLocal.forEach(c => {
    const linkTexto = c.link ? `<a href="${c.link}" target="_blank" class="btn-link">🔗 Entrar a clase</a>` : `<span class="txt-muted">No asignado</span>`;
    html += `<tr><td class="txt-bold">${c.clase}</td><td class="txt-muted">${c.fecha}</td><td>${c.tema}</td><td>${linkTexto}</td></tr>`;
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

    let html = `<table class="tabla-cronograma"><thead><tr><th>Sesión</th><th>Fecha</th><th>Eje Temático</th><th>URL Clase Online</th></tr></thead><tbody>`;
    datosCronogramaLocal.forEach((c, index) => {
      html += `<tr>
        <td><input type="text" id="edit-clase-${index}" value="${c.clase}" class="input-inline"></td>
        <td><input type="text" id="edit-fecha-${index}" value="${c.fecha}" class="input-inline"></td>
        <td><input type="text" id="edit-tema-${index}" value="${c.tema}" class="input-inline"></td>
        <td><input type="url" id="edit-link-${index}" value="${c.link || ''}" class="input-inline"></td>
      </tr>`;
    });
    html += `</tbody></table><button onclick="agregarFilaCronograma()" class="btn-secundario" style="margin-top: 10px;">➕ Añadir Fila</button>`;
    if (contenedor) contenedor.innerHTML = html;
  } else {
    const nuevasClases = [];
    datosCronogramaLocal.forEach((_, index) => {
      const cl = document.getElementById(`edit-clase-${index}`).value;
      const fe = document.getElementById(`edit-fecha-${index}`).value;
      const te = document.getElementById(`edit-tema-${index}`).value;
      const li = document.getElementById(`edit-link-${index}`).value;
      if (cl || fe || te) nuevasClases.push({ clase: cl, fecha: fe, tema: te, link: li });
    });

    setDoc(doc(db, "configuracion", "cronograma"), { clases: nuevasClases })
      .then(() => {
        editandoCronograma = false;
        btnEditar.innerText = "📝 Editar cronograma";
        btnEditar.style.backgroundColor = "#10b981";
        alert("¡Cronograma actualizado!");
      }).catch(() => alert("Error al salvar cronograma."));
  }
}

window.agregarFilaCronograma = function() {
  datosCronogramaLocal.forEach((_, index) => {
    datosCronogramaLocal[index].clase = document.getElementById(`edit-clase-${index}`).value;
    datosCronogramaLocal[index].fecha = document.getElementById(`edit-fecha-${index}`).value;
    datosCronogramaLocal[index].tema = document.getElementById(`edit-tema-${index}`).value;
    datosCronogramaLocal[index].link = document.getElementById(`edit-link-${index}`).value;
  });
  datosCronogramaLocal.push({ clase: "Nueva Clase", fecha: "Fecha", tema: "Descripción", link: "" });
  editandoCronograma = false; 
  alternarEdicionCronograma();
};

// ==========================================
// 4. VISIBILIDAD DE CONTENIDOS (OCULTA Y LISTO)
// ==========================================
const clavesElementos = [
  "u1_materiales", "u1_entrega", "u2_materiales", "u2_entrega",
  "u3_materiales", "u3_entrega", "u4_materiales", "u4_entrega"
];

function inicializarVisibilidadElementosAvanzado(esDocente) {
  onSnapshot(doc(db, "configuracion", "visibilidad_avanzada"), (docSnap) => {
    const estados = docSnap.exists() ? docSnap.data() : {};
    clavesElementos.forEach(key => {
      const valorVisible = estados[key] !== undefined ? estados[key] : true;
      gestionarFiltroElementoEspecifico(key, valorVisible, esDocente);
    });
  });
}

function gestionarFiltroElementoEspecifico(key, estaVisible, esDocente) {
  const contenido = document.getElementById(`contenido-${key}`);
   
  let idBotonDocente = "";
  if (key === "u1_materiales") idBotonDocente = "btn-visibilidad-m1";
  if (key === "u1_entrega") idBotonDocente = "btn-visibilidad-t1";
  if (key === "u2_materiales") idBotonDocente = "btn-visibilidad-m2";
  if (key === "u2_entrega") idBotonDocente = "btn-visibilidad-t2";
  if (key === "u3_materiales") idBotonDocente = "btn-visibilidad-m3";
  if (key === "u3_entrega") idBotonDocente = "btn-visibilidad-t3";
  if (key === "u4_materiales") idBotonDocente = "btn-visibilidad-m4";
  if (key === "u4_entrega") idBotonDocente = "btn-visibilidad-t4";

  const botonVisibilidad = document.getElementById(idBotonDocente);

  if (esDocente) {
    if (contenido) contenido.style.display = "block"; // Al docente nunca se le oculta en su vista previa
    if (botonVisibilidad) {
      botonVisibilidad.innerText = estaVisible ? "👁️ Visible" : "🔒 Oculto";
      botonVisibilidad.style.backgroundColor = estaVisible ? "#10b981" : "#ef4444";
    }
  } else {
    // Si no está visible, se oculta por completo sin dejar carteles
    if (contenido) contenido.style.display = estaVisible ? "block" : "none";
  }
}

window.cambiarVisibilidadElemento = async function(keyElemento) {
  const docRef = doc(db, "configuracion", "visibilidad_avanzada");
  try {
    const docSnap = await getDoc(docRef);
    let estadosActuales = docSnap.exists() ? docSnap.data() : {};
    const valorActual = estadosActuales[keyElemento] !== undefined ? estadosActuales[keyElemento] : true;
    await setDoc(docRef, { ...estadosActuales, [keyElemento]: !valorActual }, { merge: true });
  } catch (error) { console.error(error); }
};

// ==========================================
// 5. FLUJO DE ENTREGAS Y PANEL DIVIDIDO POR UNIDAD
// ==========================================
function inicializarFormularioEntregaEspecifico(nombreEstudiante, userId, numUnidad) {
  const formEntrega = document.getElementById(`form-entrega-u${numUnidad}`);
  if (!formEntrega) return;
  
  alumnoDatosEnvio.nombre = nombreEstudiante;
  alumnoDatosEnvio.uid = userId;

  formEntrega.onsubmit = async (e) => {
    e.preventDefault();
    const urlProyecto = document.getElementById(`url-proyecto-u${numUnidad}`).value;
    const comentarios = document.getElementById(`comentarios-proyecto-u${numUnidad}`).value;

    // Obtener también el mail real para guardarlo y usarlo en el envío automático
    const mailEstudiante = auth.currentUser ? auth.currentUser.email : "";

    try {
      await setDoc(doc(db, "entregas", `${userId}_unidad${numUnidad}`), {
        nombreAlumno: nombreEstudiante,
        emailAlumno: mailEstudiante,
        alumnoId: userId,
        unidad: numUnidad,
        linkLookerStudio: urlProyecto,
        comentariosAlumno: comentarios,
        fecha: new Date().toISOString(),
        estado: "Pendiente", 
        feedbackDocente: ""  
      });

      // MODIFICACIÓN: Cuando el alumno entrega, seteamos preventivamente el status en la grilla del docente como "amarillo" (esperando revisión docente)
      const alumnoRef = doc(db, "usuarios", userId);
      await updateDoc(alumnoRef, {
        [`status_tp${numUnidad}`]: "amarillo"
      });

      alert(`¡Proyecto de la Unidad ${numUnidad} enviado correctamente!`);
    } catch (error) { console.error(error); }
  };
}

function escucharTodasLasEntregasAlumno(userId) {
  for (let i = 1; i <= 4; i++) {
    const num = i;
    onSnapshot(doc(db, "entregas", `${userId}_unidad${num}`), (docSnap) => {
      const form = document.getElementById(`form-entrega-u${num}`);
      const divPendiente = document.getElementById(`estado-pendiente-u${num}`);
      const divAprobado = document.getElementById(`estado-aprobado-u${num}`);
      const divRevisar = document.getElementById(`estado-revisar-u${num}`);
      const txtAprobado = document.getElementById(`feedback-aprobado-u${num}`);
      const txtRevisar = document.getElementById(`feedback-revisar-u${num}`);

      if (form) form.style.display = 'block';
      if (divPendiente) divPendiente.style.display = 'none';
      if (divAprobado) divAprobado.style.display = 'none';
      if (divRevisar) divRevisar.style.display = 'none';

      if (docSnap.exists()) {
        const entrega = docSnap.data();
        if (entrega.estado === "Pendiente") {
          if (form) form.style.display = 'none';
          if (divPendiente) divPendiente.style.display = 'block';
        } else if (entrega.estado === "Aprobado") {
          if (form) form.style.display = 'none';
          if (divAprobado) { divAprobado.style.display = 'block'; txtAprobado.innerText = entrega.feedbackDocente; }
        } else if (entrega.estado === "revisar") {
          if (form) form.style.display = 'none';
          if (divRevisar) { divRevisar.style.display = 'block'; txtRevisar.innerText = entrega.feedbackDocente; }
        }
      }
    });
  }
}

window.reabrirFormularioEntrega = function(numUnidad) {
  const form = document.getElementById(`form-entrega-u${numUnidad}`);
  const divRevisar = document.getElementById(`estado-revisar-u${numUnidad}`);
  if (form) form.style.display = 'block';
  if (divRevisar) divRevisar.style.display = 'none';
};

function cargarEntregasParaDocenteSeparadas() {
  onSnapshot(collection(db, "entregas"), (snapshot) => {
    // Limpiamos las 4 listas antes de volver a llenarlas
    for(let i=1; i<=4; i++) {
      const tbody = document.getElementById(`lista-entregas-docente-u${i}`);
      if(tbody) tbody.innerHTML = "";
    }

    snapshot.forEach((docSnap) => {
      const entrega = docSnap.data();
      const idEntrega = docSnap.id;
      const uNum = entrega.unidad || 1;
      const tbodyDestino = document.getElementById(`lista-entregas-docente-u${uNum}`);

      if (!tbodyDestino) return;

      let fechaFormateada = "Sin fecha";
      if (entrega.fecha) {
        const d = new Date(entrega.fecha);
        fechaFormateada = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      }

      let claseBadge = "badge-pendiente"; 
      if (entrega.estado === "Aprobado") claseBadge = "badge-aprobado";
      else if (entrega.estado === "revisar") claseBadge = "badge-revisar";

      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td><strong>${entrega.nombreAlumno || 'Alumno'}</strong><br><small class="txt-muted">${entrega.comentariosAlumno || 'Sin comentarios'}</small></td>
        <td class="txt-muted font-sm">${fechaFormateada}</td>
        <td><a href="${entrega.linkLookerStudio}" target="_blank" class="btn-link">🔗 Ver Reporte</a></td>
        <td class="text-center"><span class="badge ${claseBadge}">${entrega.estado.toUpperCase()}</span></td>
        <td class="text-center"><button class="btn-evaluar" onclick="corregirEntregaAvanzada('${idEntrega}', ${uNum}, '${entrega.nombreAlumno}', '${entrega.emailAlumno || ''}')">Evaluar</button></td>
      `;
      tbodyDestino.appendChild(fila);
    });
  });
}

// ==========================================
// 6. EVALUACIÓN Y DISPARO DE CORREO AUTOMÁTICO (UNIDAD 4)
// ==========================================
window.corregirEntregaAvanzada = async function(id, unidad, nombreAlumno, emailAlumno) {
  const seleccion = prompt("Dictamen:\nEscribe 'Aprobado' o 'revisar'");
  if (!seleccion) return; 
  const estadoFinal = seleccion.trim();
  if (estadoFinal !== "Aprobado" && estadoFinal !== "revisar") return alert("Opción inválida.");

  const feedback = prompt("Introduce el feedback para el alumno:");
  if (feedback === null) return;

  try {
    // 1. Guardar estado en el documento individual de la entrega
    await updateDoc(doc(db, "entregas", id), { estado: estadoFinal, feedbackDocente: feedback.trim() });
    
    // 2. MODIFICACIÓN: Sincronizar en tiempo real el estado en el perfil del alumno para el Tablero
    // Extraemos el UID del alumno sabiendo que el ID del documento es "${userId}_unidad${numUnidad}"
    const alumnoIdDeducido = id.split("_unidad")[0];
    const alumnoRef = doc(db, "usuarios", alumnoIdDeducido);

    // Traducimos tu dictamen a tus palabras clave de semáforo (Verde, Amarillo, Naranja, Rojo)
    let colorSemoforo = "rojo"; 
    if (estadoFinal === "Aprobado") {
      colorSemoforo = "verde"; // Aprobado
    } else if (estadoFinal === "revisar") {
      colorSemoforo = "naranja"; // Esperando correcciones del alumno
    }

    await updateDoc(alumnoRef, {
      [`status_tp${unidad}`]: colorSemoforo
    });

    alert("Evaluación guardada en base de datos y reflejada en el Tablero.");

    // SI EVALUAMOS LA UNIDAD 4 Y EL DICTAMEN ES APROBADO, ENVIAMOS EL CORREO POR EMAILJS
    if (unidad === 4 && estadoFinal === "Aprobado") {
      console.log("-> Disparando envío de correo de finalización...");
      
      const templateParams = {
        student_name: nombreAlumno,
        student_email: emailAlumno,
        feedback_notes: feedback.trim()
      };

      emailjs.send("service_oq9kgrq", "template_10lj365", templateParams)
        .then(() => {
          alert(`🎉 ¡Excelente! Se le envió un mail automático a ${nombreAlumno} notificando su graduación.`);
        }, (error) => {
          console.error("Fallo el envío de EmailJS:", error);
          alert("La nota se subió, pero hubo un detalle al despachar el correo electrónico.");
        });
    }

  } catch (error) { console.error(error); }
};

// ==========================================
// 7. CONTROL DE ACCESO GENERAL
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
          inicializarModuloAnuncios(true);
          inicializarModuloConsultas(nombre, user.uid);
          if (txtSaludo) txtSaludo.innerHTML = `👨‍🏫 <strong>Docente:</strong> ${nombre}`;
          
          // MODIFICACIÓN: Habilitar visualmente el acceso a tablero.html exclusivo para docentes
          const btnTablero = document.getElementById("btn-ir-tablero");
          if (btnTablero) {
            btnTablero.style.display = "inline-block";
          }

          mostrarInterfazDocente();
        } else {
          if (txtSaludo) txtSaludo.innerHTML = `👨‍🎓 <strong>Alumno:</strong> ${nombre}`;
          mostrarInterfazEstudiante(nombre, user.uid);
          inicializarModuloAnuncios(false);
          inicializarModuloConsultas(nombre, user.uid);
        }
      }
    } catch (e) { console.error(e); }
  } else {
    window.location.href = "index.html";
  }
});

const btnCerrarSesion = document.getElementById('btnCerrarSesion');
if (btnCerrarSesion) {
  btnCerrarSesion.addEventListener('click', () => {
    signOut(auth).then(() => { window.location.href = "index.html"; });
  });
}

// ==========================================
// 8. MÓDULO 1: NOVEDADES Y ANUNCIOS (UNIDIRECCIONAL)
// ==========================================
import { addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; 

function inicializarModuloAnuncios(esDocente) {
  const panelCrear = document.getElementById('panel-crear-anuncio');
  const btnPublicar = document.getElementById('btn-publicar-anuncio');

  if (esDocente && panelCrear) {
    panelCrear.style.display = 'block';
    btnPublicar.onclick = async () => {
      const titulo = document.getElementById('anuncio-nuevo-titulo').value.trim();
      const cuerpo = document.getElementById('anuncio-nuevo-cuerpo').value.trim();
      if (!titulo || !cuerpo) return alert("Por favor, completa el título y mensaje del anuncio.");

      try {
        await addDoc(collection(db, "anuncios"), {
          titulo: titulo,
          cuerpo: cuerpo,
          fecha: new Date().toISOString()
        });
        document.getElementById('anuncio-nuevo-titulo').value = "";
        document.getElementById('anuncio-nuevo-cuerpo').value = "";
        alert("¡Anuncio oficial publicado con éxito!");
      } catch (e) { console.error("Error publicando anuncio: ", e); }
    };
  }

  const qAnuncios = query(collection(db, "anuncios"), orderBy("fecha", "desc"));
  onSnapshot(qAnuncios, (snapshot) => {
    const contenedor = document.getElementById('lista-anuncios-contenedor');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (snapshot.empty) {
      contenedor.innerHTML = `<p class="txt-muted" style="font-size:13px;">No hay comunicados oficiales.</p>`;
      return;
    }

    const ultimoAnuncioIdSaved = localStorage.getItem('last_seen_anuncio_id');
    let primerDocId = "";

    snapshot.forEach((docSnap) => {
      const anuncio = docSnap.data();
      const id = docSnap.id;
      if (!primerDocId) primerDocId = id; 

      const d = new Date(anuncio.fecha);
      const fFormato = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

      const item = document.createElement('div');
      item.className = 'item-foro-link';
      item.innerHTML = `
        <div><strong>📢 ${anuncio.titulo}</strong><br><small class="txt-muted">Publicado el ${fFormato}</small></div>
        <div><span class="btn-link" style="font-size:12px;">Leer completo ➔</span></div>
      `;
      item.onclick = () => abrirPopupAnuncio(anuncio, id);
      contenedor.appendChild(item);
    });

    const alertaGlobal = document.getElementById('alerta-novedad-global');
    if (alertaGlobal) {
      if (ultimoAnuncioIdSaved !== primerDocId && !esDocente) {
        alertaGlobal.style.display = 'inline-block';
      } else {
        alertaGlobal.style.display = 'none';
      }
    }
  });
}

function abrirPopupAnuncio(anuncio, id) {
  localStorage.setItem('last_seen_anuncio_id', id);
  const alertaGlobal = document.getElementById('alerta-novedad-global');
  if (alertaGlobal) alertaGlobal.style.display = 'none';

  const bodyModal = document.getElementById('modal-foro-dinamico-body');
  bodyModal.innerHTML = `
    <h2 style="color:#0f172a; margin-bottom:10px;">📢 Anuncio Oficial</h2>
    <h3 style="color:#2563eb; margin-bottom:15px; font-size:18px;">${anuncio.titulo}</h3>
    <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; line-height:1.6; color:#334155; white-space: pre-wrap;">${anuncio.cuerpo}</div>
    <p style="font-size:11px; color:#94a3b8; margin-top:15px; text-align:right;">Fecha de emisión: ${new Date(anuncio.fecha).toLocaleString()}</p>
  `;
  document.getElementById('modal-foro-popup').style.display = 'flex';
}

// ==========================================
// 9. MÓDULO 2: FORO DE CONSULTAS Y DISCUSIÓN (OPTIMIZADO CON ALERTA DE COMENTARIOS)
// ==========================================
function inicializarModuloConsultas(nombreUsuario, uidUsuario) {
  const btnPublicar = document.getElementById('btn-publicar-consulta');
  if (btnPublicar) {
    btnPublicar.onclick = async () => {
      const titulo = document.getElementById('foro-nuevo-titulo').value.trim();
      if (!titulo) return alert("Por favor introduce una pregunta o tema para debatir.");

      try {
        await addDoc(collection(db, "foros_consultas"), {
          titulo: titulo,
          autorNombre: nombreUsuario,
          autorId: uidUsuario,
          fecha: new Date().toISOString(),
          comentarios: []
        });
        document.getElementById('foro-nuevo-titulo').value = "";
        alert("¡Consulta publicada! Ya está disponible para la comunidad.");
      } catch (e) { console.error(e); }
    };
  }

  const qForos = query(collection(db, "foros_consultas"), orderBy("fecha", "desc"));
  onSnapshot(qForos, (snapshot) => {
    const contenedor = document.getElementById('lista-consultas-contenedor');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (snapshot.empty) {
      contenedor.innerHTML = `<p class="txt-muted" style="font-size:13px;">Nadie ha iniciado consultas aún.</p>`;
      return;
    }

    const ultimaConsultaIdSaved = localStorage.getItem('last_seen_consulta_id');
    let primerDocId = "";

    snapshot.forEach((docSnap) => {
      const consulta = docSnap.data();
      const id = docSnap.id;
      if (!primerDocId) primerDocId = id;

      const comentariosExistentes = consulta.comentarios ? consulta.comentarios.length : 0;
      
      const claveStorageComentarios = `vistos_comentarios_${id}`;
      const comentariosVistosAnteriormente = parseInt(localStorage.getItem(claveStorageComentarios) || "0", 10);
      
      let badgeNuevasRespuestasHTML = "";
      if (comentariosExistentes > comentariosVistosAnteriormente) {
        badgeNuevasRespuestasHTML = `<span class="badge-comentarios-nuevos">¡Nuevas respuestas!</span>`;
      }

      const item = document.createElement('div');
      item.className = 'item-foro-link';
      item.innerHTML = `
        <div>
          <strong>❓ ${consulta.titulo}</strong> ${badgeNuevasRespuestasHTML}<br>
          <small class="txt-muted">Por ${consulta.autorNombre} • 💬 ${comentariosExistentes} aportes</small>
        </div>
        <div><span class="btn-link" style="font-size:12px;">Participar ➔</span></div>
      `;
      item.onclick = () => abrirPopupConsultaHilo(consulta, id, nombreUsuario);
      contenedor.appendChild(item);
    });

    const alertaForoGlobal = document.getElementById('alerta-foro-global');
    if (alertaForoGlobal) {
      if (ultimaConsultaIdSaved !== primerDocId && snapshot.docs[0].data().autorId !== uidUsuario) {
        alertaForoGlobal.style.display = 'inline-block';
      } else {
        alertaForoGlobal.style.display = 'none';
      }
    }
  });
}

function abrirPopupConsultaHilo(consulta, id, nombreLector) {
  localStorage.setItem('last_seen_consulta_id', id);
  const alertaForoGlobal = document.getElementById('alerta-foro-global');
  if (alertaForoGlobal) alertaForoGlobal.style.display = 'none';

  onSnapshot(doc(db, "foros_consultas", id), (docSnap) => {
    if (!docSnap.exists()) return;
    const datosActualizados = docSnap.data();
    
    const totalComentariosActuales = datosActualizados.comentarios ? datosActualizados.comentarios.length : 0;
    
    localStorage.setItem(`vistos_comentarios_${id}`, totalComentariosActuales);
    
    const bodyModal = document.getElementById('modal-foro-dinamico-body');
    let htmlComentarios = "";

    if (totalComentariosActuales > 0) {
      datosActualizados.comentarios.forEach(c => {
        htmlComentarios += `
          <div class="comentario-item">
            <strong>${c.autor}:</strong> ${c.texto}
          </div>`;
      });
    } else {
      htmlComentarios = `<p class="txt-muted" style="font-size:12px; padding:10px 0;">No hay respuestas aún. ¡Sé el primero en aportar!</p>`;
    }

    bodyModal.innerHTML = `
      <h2 style="color:#0f172a; margin-bottom:5px; font-size:16px;">❓ Consulta de Alumno:</h2>
      <h3 style="color:#0f172a; margin-bottom:15px; font-size:18px; font-weight:700;">"${datosActualizados.titulo}"</h3>
      <p style="font-size:12px; color:#64748b; margin-bottom:15px;">Iniciado por: <strong>${datosActualizados.autorNombre}</strong></p>
      
      <div style="border-top:1px solid #e2e8f0; padding-top:15px;">
         <h4 style="font-size:14px; color:#1e293b; margin-bottom:10px;">💬 Respuestas y aportes:</h4>
         <div style="max-height:180px; overflow-y:auto; margin-bottom:15px;">${htmlComentarios}</div>
      </div>

      <div style="margin-top:10px; border-top:1px solid #e2e8f0; padding-top:15px;">
        <input type="text" id="input-nuevo-comentario-texto" placeholder="Escribe tu respuesta o sugerencia técnica..." class="input-inline" style="width:75%; margin-right:2%;">
        <button id="btn-enviar-comentario-foro" class="btn-action" style="width:20%; padding:8px 0;">Enviar</button>
      </div>
    `;

    document.getElementById('btn-enviar-comentario-foro').onclick = async () => {
      const textoComentario = document.getElementById('input-nuevo-comentario-texto').value.trim();
      if (!textoComentario) return;

      const listaComentariosActuales = datosActualizados.comentarios || [];
      listaComentariosActuales.push({
        autor: nombreLector,
        texto: textoComentario,
        fecha: new Date().toISOString()
      });

      try {
        await updateDoc(doc(db, "foros_consultas", id), { comentarios: listaComentariosActuales });
        localStorage.setItem(`vistos_comentarios_${id}`, listaComentariosActuales.length);
      } catch (e) { console.error(e); }
    };
  });

  document.getElementById('modal-foro-popup').style.display = 'flex';
}

// ==========================================
// CONTROL DE MODALES EN EL OBJETO WINDOWS (MÓDULOS ES6)
// ==========================================
window.cerrarModalForoPopup = function() {
  const modal = document.getElementById('modal-foro-popup');
  if (modal) {
    modal.style.display = 'none';
  }
};
