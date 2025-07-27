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

  function mostrarLectura(fechaSeleccionada) {
    const fechaInicioObj = new Date(fechaInicio);
    const seleccionada = new Date(fechaSeleccionada);
    const dia = Math.floor((seleccionada - fechaInicioObj) / (1000 * 60 * 60 * 24)) + 1;

    if (dia < 1 || dia > 365) {
      document.getElementById("contenido").innerHTML = "<p class='error'>La fecha seleccionada está fuera del rango del plan de lectura (1-365).</p>";
      return;
    }

    fetch('plan_lectura_dinamico.json')
      .then(res => res.json())
      .then(data => {
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
          <p><strong>Antiguo Testamento:</strong> ${lectura.antiguo_testamento}</p>
          ${lectura.salmos_proverbios ? `<p><strong>Salmos/Proverbios:</strong> ${lectura.salmos_proverbios}</p>` : ''}
          <p><strong>Nuevo Testamento:</strong> ${lectura.nuevo_testamento}</p>
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
              <button id="btnSiguienteDia" disabled style="
                padding: 0.5rem 1.2rem;
                font-size: 1rem;
                background-color: #5a8dee;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.3s ease;
              ">
                👉 Siguiente día
              </button>
            </div>
            <div style="margin-top: 1rem;">
              <button id="btnMostrarLecturas" style="
                padding: 0.5rem 1.2rem;
                font-size: 1rem;
                background-color: #5a8dee;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.3s ease;
              ">
                📖 Mostrar lecturas del día
              </button>
            </div>
          </div>
        `;

        document.getElementById("contenido").innerHTML = html;

        document.getElementById("btnMostrarLecturas").addEventListener("click", async () => {
          const plan = await fetch("plan_lectura_dinamico.json").then(r => r.json());
          const textos = await fetch("textos_biblicos.json").then(r => r.json());
          const lecturas = plan.find(d => d.dia === dia);
          if (!lecturas) return;

          let html = "";
          const secciones = [
            { clave: "antiguo_testamento", titulo: "ANTIGUO TESTAMENTO" },
            { clave: "salmos_proverbios", titulo: "SALMOS / PROVERBIOS" },
            { clave: "nuevo_testamento", titulo: "NUEVO TESTAMENTO" }
          ];

          secciones.forEach(({ clave, titulo }) => {
            const contenido = lecturas[clave];
            if (!contenido) return;
            html += `<h3 style='text-align:center;'><strong>${titulo}</strong></h3>`;
            const pasajes = Array.isArray(contenido) ? contenido : [contenido];
            pasajes.forEach(pasaje => {
              const [libro, cap] = pasaje.split(" ");
              const capitulo = cap?.trim();
              const versiculos = textos[libro]?.[capitulo];
              if (versiculos) {
                html += `<h4 style='text-align:center;'><strong>${pasaje}</strong></h4><div style='text-align:justify;'>`;
                for (const [num, texto] of Object.entries(versiculos)) {
                  html += `<p>${num}. ${texto}</p>`;
                }
                html += `</div>`;
              } else {
                html += `<p><em>${pasaje} no disponible.</em></p>`;
              }
            });
          });

          document.getElementById("contenidoLecturas").innerHTML = html;
          document.getElementById("modalLecturas").style.display = "block";
        });

        const checkbox = document.getElementById("checkLectura");
        const btnSiguiente = document.getElementById("btnSiguienteDia");

        checkbox.addEventListener("change", () => {
          localStorage.setItem(claveProgreso, checkbox.checked);
          actualizarProgreso();
          actualizarListaDiasLeidos();
          btnSiguiente.disabled = !checkbox.checked;
        });

        btnSiguiente.disabled = !leido;
        btnSiguiente.addEventListener("click", () => {
          const siguiente = new Date(fechaSeleccionada);
          siguiente.setDate(siguiente.getDate() + 1);
          const siguienteStr = siguiente.toISOString().split("T")[0];
          fechaInput.value = siguienteStr;
          mostrarLectura(siguienteStr);
        });
      })
      .catch(error => {
        console.error("Error al cargar el plan de lectura:", error);
        document.getElementById("contenido").innerHTML = "<p class='error'>Error al cargar el plan de lectura.</p>";
      });
  }

  // ... (las funciones actualizarProgreso, actualizarListaDiasLeidos, etc. se mantienen igual)

  document.getElementById("cerrarModalLecturas").addEventListener("click", () => {
    document.getElementById("modalLecturas").style.display = "none";
  });

  inicializarFecha();
});

function cerrarModalHito() {
  document.getElementById("hitoModal").style.display = "none";
}
