
document.addEventListener("DOMContentLoaded", function () {
  const fechaInput = document.getElementById("fecha");
  const btnReiniciar = document.getElementById("reiniciarFecha");

  let fechaInicio = localStorage.getItem("fechaInicio");

  function inicializarFecha() {
    if (!fechaInicio) {
      const seleccion = prompt("¿Con qué fecha deseas iniciar tu plan de lectura? (formato: AAAA-MM-DD)");
      if (seleccion) {
        localStorage.setItem("fechaInicio", seleccion);
        fechaInicio = seleccion;
      } else {
        return;
      }
    }

    let ultimoLeido = 0;
    for (let i = 1; i <= 365; i++) {
      if (localStorage.getItem(`leido-dia-${i}`) === "true") {
        ultimoLeido = i;
      }
    }

    const fechaMostrar = new Date(fechaInicio);
    if (ultimoLeido > 0) {
      fechaMostrar.setDate(fechaMostrar.getDate() + (ultimoLeido - 1));
    } else {
      const hoy = new Date();
      fechaMostrar.setTime(hoy.getTime());
    }

    const yyyyMMdd = fechaMostrar.toISOString().split("T")[0];
    fechaInput.value = yyyyMMdd;
    mostrarLectura(yyyyMMdd);
    actualizarProgreso();
    actualizarListaDiasLeidos();
  }

  async function mostrarLectura(fechaSeleccionada) {
    const fechaInicioObj = new Date(fechaInicio);
    const seleccionada = new Date(fechaSeleccionada);
    const dia = Math.floor((seleccionada - fechaInicioObj) / (1000 * 60 * 60 * 24)) + 1;

    if (dia < 1 || dia > 365) {
      document.getElementById("contenido").innerHTML = "<p class='error'>La fecha seleccionada está fuera del rango del plan de lectura (1-365).</p>";
      return;
    }

    const data = await fetch("plan_lectura_dinamico.json").then(res => res.json());
    const lectura = data.find(d => d.dia === dia);

    if (!lectura) {
      document.getElementById("contenido").innerHTML = "<p class='error'>No se encontró lectura para el día " + dia + ".</p>";
      return;
    }

    const claveProgreso = `leido-dia-${dia}`;
    const leido = localStorage.getItem(claveProgreso) === "true";
    const tituloDia = leido ? `<span style="color:green;">Día ${dia} ✅</span>` : `Día ${dia}`;

    let html = `
      <h2>${tituloDia}</h2>
      <p><strong>Antiguo Testamento:</strong> ${Array.isArray(lectura.antiguo_testamento) ? lectura.antiguo_testamento.join(", ") : lectura.antiguo_testamento}</p>
      ${lectura.salmos_proverbios ? `<p><strong>Salmos/Proverbios:</strong> ${Array.isArray(lectura.salmos_proverbios) ? lectura.salmos_proverbios.join(", ") : lectura.salmos_proverbios}</p>` : ''}
      <p><strong>Nuevo Testamento:</strong> ${Array.isArray(lectura.nuevo_testamento) ? lectura.nuevo_testamento.join(", ") : lectura.nuevo_testamento}</p>
      <div class="frase">"${lectura.frase_biblica}"</div>
    `;

    Object.entries(lectura).forEach(([clave, valor]) => {
      if (clave.startsWith("reflexion")) {
        html += `
          <div class="reflexion-bloque">
            <h3>📖 Reflexión:</h3>
            <p>${valor}</p>
          </div>
        `;
      }
    });

    html += `
      <div style="margin-top: 2rem; text-align: center;">
        <label>
          <input type="checkbox" id="checkLectura" ${leido ? "checked" : ""}>
          Marcar este día como leído
        </label>
        <div style="margin-top: 1.5rem;">
          <button id="btnSiguienteDia" class="boton-principal" disabled>👉 Siguiente día</button>
        </div>
        <div style="margin-top: 1rem;">
          <button id="btnMostrarLecturas" class="boton-principal">📖 Mostrar lecturas del día</button>
        </div>
      </div>
    `;

    document.getElementById("contenido").innerHTML = html;

    document.getElementById("checkLectura").addEventListener("change", (e) => {
      const marcado = e.target.checked;
      localStorage.setItem(claveProgreso, marcado);
      actualizarProgreso();
      actualizarListaDiasLeidos();
      document.getElementById("btnSiguienteDia").disabled = !marcado;
    });

    document.getElementById("btnSiguienteDia").disabled = !leido;
    document.getElementById("btnSiguienteDia").addEventListener("click", () => {
      const siguiente = new Date(fechaSeleccionada);
      siguiente.setDate(siguiente.getDate() + 1);
      const siguienteStr = siguiente.toISOString().split("T")[0];
      fechaInput.value = siguienteStr;
      mostrarLectura(siguienteStr);
    });

    document.getElementById("btnMostrarLecturas").addEventListener("click", async () => {
      const textos = await fetch("textos_biblicos.json").then(r => r.json());

      const secciones = [
        { clave: "antiguo_testamento", titulo: "ANTIGUO TESTAMENTO" },
        { clave: "salmos_proverbios", titulo: "SALMOS / PROVERBIOS" },
        { clave: "nuevo_testamento", titulo: "NUEVO TESTAMENTO" }
      ];

      let htmlModal = "";

      secciones.forEach(({ clave, titulo }) => {
        const contenido = lectura[clave];
        if (!contenido) return;

        htmlModal += `<h3 style='text-align:center;'><strong>${titulo}</strong></h3>`;
        const pasajes = Array.isArray(contenido) ? contenido : [contenido];

        pasajes.forEach(pasaje => {
          const [libro, cap] = pasaje.split(" ");
          const capitulo = cap?.trim();
          const versiculos = textos[libro]?.[capitulo];
          if (versiculos) {
            htmlModal += `<h4 style='text-align:center;'><strong>${pasaje}</strong></h4><div style='text-align:justify;'>`;
            for (const [num, texto] of Object.entries(versiculos)) {
              htmlModal += `<p>${num}. ${texto}</p>`;
            }
            htmlModal += `</div>`;
          } else {
            htmlModal += `<p><em>${pasaje} no disponible.</em></p>`;
          }
        });
      });

      document.getElementById("contenidoLecturas").innerHTML = htmlModal;
      document.getElementById("modalLecturas").style.display = "block";
    });
  }

  function actualizarProgreso() {
    let leidos = 0;
    for (let i = 1; i <= 365; i++) {
      if (localStorage.getItem(`leido-dia-${i}`) === "true") leidos++;
    }
    const porcentaje = Math.floor((leidos / 365) * 100);
    const barra = document.getElementById("barraProgreso");
    if (barra) {
      barra.style.width = `${porcentaje}%`;
      barra.textContent = `${porcentaje}%`;
    }
  }

  function actualizarListaDiasLeidos() {
    const contenedor = document.getElementById("listaDiasLeidos");
    contenedor.innerHTML = "";
    const fechaInicio = new Date(localStorage.getItem("fechaInicio"));
    for (let i = 1; i <= 365; i++) {
      if (localStorage.getItem(`leido-dia-${i}`) === "true") {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + i - 1);
        const span = document.createElement("span");
        span.textContent = `✅ Día ${i} – ${fecha.toISOString().split("T")[0]}`;
        contenedor.appendChild(span);
      }
    }
  }

  document.getElementById("cerrarModalLecturas").addEventListener("click", () => {
    document.getElementById("modalLecturas").style.display = "none";
  });

  btnReiniciar.addEventListener("click", () => {
    if (confirm("¿Deseas reiniciar tu plan de lectura?")) {
      localStorage.clear();
      location.reload();
    }
  });

  fechaInput.addEventListener("change", () => mostrarLectura(fechaInput.value));

  inicializarFecha();
});
