// ==========================================================================
// CONFIGURACIÓN Y CONEXIÓN DE FIREBASE
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// CREDENCIALES REALES ACTUALIZADAS (Sincronizadas con tu aula.js)
const firebaseConfig = {
  apiKey: "AIzaSyBfSWaVPdbqtkxX7pLpCSWVehSVtK-olNY", 
  authDomain: "aula-virtual-data-studio.firebaseapp.com",
  projectId: "aula-virtual-data-studio",
  storageBucket: "aula-virtual-data-studio.firebasestorage.app",
  messagingSenderId: "1014108490203",
  appId: "1:1014108490203:web:0a23139f68d8aa9c54bffe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Variables de estado global de la página
let listaAlumnosGlobal = []; 
let datosDocente = null;

// ==========================================================================
// SEGURIDAD: CONTROL DE ACCESO (SOLO DOCENTES)
// ==========================================================================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // Si no está logueado, afuera
    return;
  }

  try {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().rol === "docente") {
      datosDocente = docSnap.data();
      
      // Control de seguridad por si el elemento visual tarda en renderizar
      const txtNombreDocente = document.getElementById("docente-nombre");
      if (txtNombreDocente) {
        txtNombreDocente.innerText = datosDocente.nombre || "Profesor";
      }
      
      // Inicializamos los motores del tablero ya que las credenciales son válidas
      inicializarSeguimientoAlumnos();
      inicializarBuscador();
    } else {
      // Si es un alumno, rebota de vuelta a su panel
      alert("Acceso denegado. Este panel es exclusivo para instructores.");
      window.location.href = "aula.html";
    }
  } catch (error) {
    console.error("Error validando rol de docente:", error);
  }
});

// Botón Cerrar Sesión
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");
if (btnCerrarSesion) {
  btnCerrarSesion.onclick = () => {
    signOut(auth).then(() => window.location.href = "index.html");
  };
}

// ==========================================================================
// MOTOR 1: SEGUIMIENTO EN TIEMPO REAL Y SEMÁFOROS
// ==========================================================================
function inicializarSeguimientoAlumnos() {
  const qAlumnos = query(collection(db, "usuarios"), orderBy("nombre", "asc"));
  
  onSnapshot(qAlumnos, (snapshot) => {
    listaAlumnosGlobal = [];
    
    snapshot.forEach((docSnap) => {
      const usuario = docSnap.data();
      // Filtramos para no auto-incluirte en la grilla de alumnos
      if (usuario.rol !== "docente") {
        listaAlumnosGlobal.push({ id: docSnap.id, ...usuario });
      }
    });

    renderizarTabla(listaAlumnosGlobal);
  });
}

function renderizarTabla(alumnos) {
  const tbody = document.getElementById("tabla-alumnos-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (alumnos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="txt-centered">No se encontraron alumnos registrados.</td></tr>`;
    return;
  }

  alumnos.forEach((alumno) => {
    const tr = document.createElement("tr");

    let ultimoLogin = "Nunca";
    if (alumno.ultimoLogin) {
      const d = new Date(alumno.ultimoLogin);
      ultimoLogin = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }

    tr.innerHTML = `
      <td><strong>${alumno.nombre || 'Sin Nombre'}</strong><br><small class="txt-muted">${alumno.email}</small></td>
      <td>${ultimoLogin}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp1)}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp2)}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp3)}</td>
      <td>${obtenerBadgeStatus(alumno.status_tp4)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Lógica de semáforos puros (Solo círculos de color)
function obtenerBadgeStatus(status) {
  const st = (status || "rojo").toLowerCase().trim();

  // Devolvemos solo el círculo con un "title" para que si pasas el mouse arriba, te diga qué significa
  if (st === "aprobado" || st === "verde") {
    return `<span class="semaforo semaforo-verde" title="Aprobado"></span>`;
  } else if (st === "esperando revision docente" || st === "amarillo") {
    return `<span class="semaforo semaforo-amarillo" title="Esperando Corrección"></span>`;
  } else if (st === "esperando correcciones alumno" || st === "naranja") {
    return `<span class="semaforo semaforo-naranja" title="Reentrega Alumno"></span>`;
  } else {
    return `<span class="semaforo semaforo-rojo" title="No Entregado"></span>`;
  }
}

// ==========================================================================
// MOTOR 2: BUSCADOR EN TIEMPO REAL (Filtro Dinámico)
// ==========================================================================
function inicializarBuscador() {
  const buscador = document.getElementById("buscador-alumnos");
  if (!buscador) return;

  buscador.oninput = (e) => {
    const termino = e.target.value.toLowerCase().trim();
    
    const alumnosFiltrados = listaAlumnosGlobal.filter(alumno => {
      const nombreCompleto = (alumno.nombre || "").toLowerCase();
      const emailCompleto = (alumno.email || "").toLowerCase();
      return nombreCompleto.includes(termino) || emailCompleto.includes(termino);
    });

    renderizarTabla(alumnosFiltrados);
  };
}

// ==========================================================================
// MOTOR 3: EXPORTADOR NATIVO A EXCEL / GOOGLE SHEETS (.CSV)
// ==========================================================================
const btnExportar = document.getElementById("btn-exportar-csv");
if (btnExportar) {
  btnExportar.onclick = () => {
    if (listaAlumnosGlobal.length === 0) return alert("No hay datos disponibles para exportar.");

    let contenidoCSV = "Alumno,Email,Ultimo Login,Status TP1,Status TP2,Status TP3,Status TP4\n";

    listaAlumnosGlobal.forEach((al) => {
      const nombre = (al.nombre || "Sin Nombre").replace(/,/g, " ");
      const email = (al.email || "").replace(/,/g, " ");
      const login = al.ultimoLogin ? new Date(al.ultimoLogin).toLocaleString() : "Nunca";
      const tp1 = al.status_tp1 || "No Entregado";
      const tp2 = al.status_tp2 || "No Entregado";
      const tp3 = al.status_tp3 || "No Entregado";
      const tp4 = al.status_tp4 || "No Entregado";

      contenidoCSV += `"${nombre}","${email}","${login}","${tp1}","${tp2}","${tp3}","${tp4}"\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), contenidoCSV], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Seguimiento_Alumnos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
}

// ==========================================================================
// MOTOR 4: CENTRO DE COMUNICACIONES MASIVAS (EMAILJS)
// ==========================================================================
const SERVICE_ID = 'service_oq9kgrq'; // Sincronizado con EmailJS de tu aula.js

window.despacharMensajeMasivo = async function(tipoPlantilla) {
  if (listaAlumnosGlobal.length === 0) return alert("No hay alumnos cargados para notificar.");
  
  const confirmacion = confirm(`¿Estás seguro de que deseas enviar la notificación masiva de [${tipoPlantilla.toUpperCase()}] a todos los alumnos registrados?`);
  if (!confirmacion) return;

  let templateID = "";
  if (tipoPlantilla === 'bienvenida') templateID = 'TEMPLATE_ID_BIENVENIDA';
  if (tipoPlantilla === 'unidad2')    templateID = 'TEMPLATE_ID_U2';
  if (tipoPlantilla === 'unidad3')    templateID = 'TEMPLATE_ID_U3';
  if (tipoPlantilla === 'unidad4')    templateID = 'TEMPLATE_ID_U4';
  if (tipoPlantilla === 'fin_curso')  templateID = 'TEMPLATE_ID_CIERRE';

  let enviados = 0;
  let errores = 0;

  for (const alumno of listaAlumnosGlobal) {
    const parametrosTemplate = {
      to_email: alumno.email,
      to_name: alumno.nombre || "Alumno",
      profesor_name: datosDocente ? (datosDocente.nombre || "Tu Profesor") : "Tu Profesor",
      link_aula: window.location.href.replace("tablero.html", "aula.html")
    };

    try {
      await emailjs.send(SERVICE_ID, templateID, parametrosTemplate);
      enviados++;
    } catch (err) {
      console.error(`Error enviando mail a ${alumno.email}:`, err);
      errores++;
    }
  }

  alert(`📢 Despacho Finalizado.\nEmails enviados con éxito: ${enviados}\nErrores en envíos: ${errores}`);
};

// ==========================================================================
// MOTOR EXTRA: ALERTAS PARA ALUMNOS REZAGADOS
// ==========================================================================
const btnRezagados = document.getElementById("btn-alerta-rezagados");
if (btnRezagados) {
  btnRezagados.onclick = async () => {
    const rezagados = listaAlumnosGlobal.filter(al => {
      return (al.status_tp1 || "rojo") === "rojo" || 
             (al.status_tp2 || "rojo") === "rojo" || 
             (al.status_tp3 || "rojo") === "rojo" || 
             (al.status_tp4 || "rojo") === "rojo" ||
             (al.status_tp1 || "").toLowerCase().includes("naranja") ||
             (al.status_tp2 || "").toLowerCase().includes("naranja") ||
             (al.status_tp3 || "").toLowerCase().includes("naranja") ||
             (al.status_tp4 || "").toLowerCase().includes("naranja");
    });

    if (rezagados.length === 0) {
      return alert("🎉 ¡Excelente noticia! Todos tus alumnos están al día con sus entregas.");
    }

    const proceder = confirm(`Se detectaron ${rezagados.length} alumnos con entregas pendientes o reentregas asignadas. ¿Deseas enviarles un correo automático de aviso?`);
    if (!proceder) return;

    const TEMPLATE_REZAGADOS_ID = 'TEMPLATE_ID_REZAGADOS'; 
    let contadorFuegosApagados = 0;

    for (const al of rezagados) {
      let pendientesTexto = [];
      if (!al.status_tp1 || al.status_tp1 === "rojo" || al.status_tp1.includes("naranja")) pendientesTexto.push("Trabajo Práctico 1");
      if (!al.status_tp2 || al.status_tp2 === "rojo" || al.status_tp2.includes("naranja")) pendientesTexto.push("Trabajo Práctico 2");
      if (!al.status_tp3 || al.status_tp3 === "rojo" || al.status_tp3.includes("naranja")) pendientesTexto.push("Trabajo Práctico 3");
      if (!al.status_tp4 || al.status_tp4 === "rojo" || al.status_tp4.includes("naranja")) pendientesTexto.push("Trabajo Práctico 4");

      const parametrosTemplate = {
        to_email: al.email,
        to_name: al.nombre || "Alumno",
        lista_pendientes: pendientesTexto.join(", "),
        link_aula: window.location.href.replace("tablero.html", "aula.html")
      };

      try {
        await emailjs.send(SERVICE_ID, TEMPLATE_REZAGADOS_ID, parametrosTemplate);
        contadorFuegosApagados++;
      } catch (e) { console.error(e); }
    }

    alert(`🚀 Campaña de alertas finalizada. Se notificó a ${contadorFuegosApagados} alumnos rezagados.`);
  };
}
