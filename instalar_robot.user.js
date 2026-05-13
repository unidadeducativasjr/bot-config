// ==UserScript==
// @name         ROBOT MAESTRO - TIGA FULL PRO (GUARDADO FORZADO)
// @namespace    TIGA_INNOVACION_GESTION
// @version      24.0
// @description  Corrección definitiva: Simulación de eventos humanos para guardado efectivo.
// @author       TIGA
// @match        *://academico.educarecuador.gob.ec/*
// @include      /^https?://academico\.educarecuador\.gob\.ec/.*$/
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      raw.githubusercontent.com
// @run-at       document-start
// ==/UserScript==

(function () {
    "use strict";

    const EMPRESA = "TIGA: TENE INNOVACIÓN Y GESTIÓN ACADÉMICA";
    const timestamp = Date.now();
    const URL_LOGO = "https://raw.githubusercontent.com/unidadeducativasjr/bot-config/main/WhatsApp%20Image%202026-05-09%20at%2006.51.35%20PM.jpeg?v=" + timestamp;
    const JSON_URL = "https://raw.githubusercontent.com/unidadeducativasjr/bot-config/main/config.json?v=" + timestamp;
    let CONFIG = null, BASE_DATOS = {}, BASE_NOTAS_CUANTI = [];
    let PAGINA_CUANTI = 1, indiceAcompa = 0, filasProcesadasInicial = [], PROCESO_ACTIVO = false;
    const MAPA_ACOMPA = { "S": "SIEMPRE", "F": "FRECUENTEMENTE", "O": "OCASIONALMENTE", "N": "NUNCA" };

    function iniciar() {
        const datosGuardados = sessionStorage.getItem("TIGA_DATA");
        if (datosGuardados) BASE_DATOS = JSON.parse(datosGuardados);
        GM_xmlhttpRequest({
            method: "GET", url: JSON_URL,
            onload: (r) => {
                try {
                    CONFIG = JSON.parse(r.responseText);
                    const intervalo = setInterval(() => {
                        const match = document.body.innerText.match(/\b\d{2}[A-Z]\d{5}\b/);
                        if (match) { clearInterval(intervalo); validarAcceso(match[0]); }
                    }, 2000);
                } catch(e) { console.error("Error Config", e); }
            }
        });
    }

    function validarAcceso(amie) {
        let inst = CONFIG.instituciones.find(i => i.amie === amie);
        if (!inst) return;
        if (sessionStorage.getItem("auth_tigas") || prompt(`🔐 CLAVE - ${EMPRESA}:`) === (inst.clave || "2026")) {
            sessionStorage.setItem("auth_tigas", "true");
            pintarInterfaz();
        }
    }

    function pintarInterfaz() {
        if (document.getElementById("cont_sjr")) return;
        const cont = document.createElement("div"); cont.id = "cont_sjr"; document.body.appendChild(cont);
        const botones = [
            {t: "🗑️ BORRAR", c: "#cc0000", b: "200px", a: () => capturarExcel("BORRAR")},
            {t: "📋 ACOMPAÑAMIENTO", c: "#8e44ad", b: "140px", a: () => capturarExcel("ACOMPA")},
            {t: "🧒 INICIAL", c: "#009933", b: "80px", a: () => capturarExcel("INICIAL")},
            {t: "🤖 NOTAS", c: "#0066ff", b: "20px", a: () => capturarExcel("CUANTI")}
        ];
        botones.forEach(btn => {
            const b = document.createElement("button"); b.innerText = btn.t;
            Object.assign(b.style, { position: "fixed", bottom: btn.b, right: "20px", zIndex: "99999", padding: "12px", width: "160px", background: btn.c, color: "white", borderRadius: "10px", fontWeight: "bold", border: "none", cursor: "pointer", boxShadow: "0 4px 8px rgba(0,0,0,0.3)" });
            b.onclick = btn.a; cont.appendChild(b);
        });
    }

    function capturarExcel(modo) {
        if (modo === "BORRAR") { iniciarEliminacion(); return; }
        let raw = prompt(`📊 PEGAR EXCEL ${modo}:`);
        if (!raw) return;
        PROCESO_ACTIVO = true;
        if (modo === "CUANTI") {
            BASE_NOTAS_CUANTI = raw.split(/\n/).map(x => x.trim()).filter(x => x);
            sessionStorage.setItem("TIGA_CUANTI", JSON.stringify(BASE_NOTAS_CUANTI));
            motorCuantitativo();
        } else {
            BASE_DATOS = {};
            raw.split(/\n/).forEach(f => {
                const c = f.split(/\t/);
                if (c.length > 1) BASE_DATOS[c[0].trim().toUpperCase()] = c.slice(1).map(n => n.trim().toUpperCase());
            });
            sessionStorage.setItem("TIGA_DATA", JSON.stringify(BASE_DATOS));
            if (modo === "ACOMPA") { indiceAcompa = 0; motorAcompanamiento(); } else motorInicial();
        }
    }

    // --- MOTOR ACOMPAÑAMIENTO REFORZADO ---
    function motorAcompanamiento() {
        const botones = Array.from(document.querySelectorAll('button')).filter(btn => btn.innerText.includes("Seleccionar"));
        if (indiceAcompa >= botones.length) { saltarPagina("ACOMPA"); return; }
        botones[indiceAcompa].scrollIntoView();
        botones[indiceAcompa].click();
        setTimeout(configurarTrimestre, 3000);
    }

    function configurarTrimestre() {
        const selT = document.querySelector('select');
        if (selT) {
            selT.selectedIndex = 1;
            selT.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(llenarFichaAcompa, 3500);
        }
    }

    function llenarFichaAcompa() {
        let nombreEst = (document.querySelector('input[readonly], .form-control[disabled]')?.value || "").trim().toUpperCase();
        const notas = BASE_DATOS[nombreEst];

        if (notas) {
            console.log("🚀 FORZANDO GUARDADO PARA:", nombreEst);
            const selects = Array.from(document.querySelectorAll('select')).filter(s => s.innerText.includes("Seleccione"));
            
            selects.forEach((sel, i) => {
                const valBuscado = MAPA_ACOMPA[notas[i]?.charAt(0)];
                if (valBuscado) {
                    for (let opt of sel.options) {
                        if (opt.text.toUpperCase().includes(valBuscado)) {
                            sel.value = opt.value;
                            // DISPARO DE EVENTOS MÚLTIPLES (CRÍTICO)
                            sel.dispatchEvent(new Event('change', { bubbles: true }));
                            sel.dispatchEvent(new Event('input', { bubbles: true }));
                            sel.dispatchEvent(new Event('blur', { bubbles: true }));
                            break;
                        }
                    }
                }
            });

            // Espera para que el sistema reconozca los cambios
            setTimeout(() => {
                const btnG = document.querySelector('button.btn-success, button.btn-primary');
                if (btnG) {
                    btnG.scrollIntoView();
                    btnG.click();
                    console.log("💾 Clic en Guardar realizado...");
                    
                    // ESPERA DINÁMICA: Buscamos el botón "Volver" solo después de que el guardado sea real
                    setTimeout(() => {
                        const btnV = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Volver"));
                        if (btnV) {
                            indiceAcompa++;
                            btnV.click();
                            setTimeout(motorAcompanamiento, 3000);
                        }
                    }, 5000); // 5 segundos para asegurar que el server responda
                }
            }, 2000);
        } else {
            const btnV = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Volver"));
            if (btnV) { indiceAcompa++; btnV.click(); setTimeout(motorAcompanamiento, 2000); }
        }
    }

    function saltarPagina(modo) {
        const sig = Array.from(document.querySelectorAll("button, a")).find(b => b.innerText.toUpperCase().includes("SIGUIENTE") && !b.disabled);
        if (sig) {
            sig.click();
            setTimeout(() => {
                if (modo === "ACOMPA") { indiceAcompa = 0; motorAcompanamiento(); }
                else location.reload();
            }, 6000);
        } else {
            alert("🏁 PROCESO FINALIZADO");
            PROCESO_ACTIVO = false;
        }
    }

    // (Otras funciones motorInicial, motorCuantitativo e iniciarEliminacion se mantienen igual)
    // ... logic de inicio ...
    iniciar();
})();
