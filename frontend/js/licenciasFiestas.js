import toast from './toast.js';
import {
    TIPOS_FIESTAS,
    getSemanasTemporada,
    temporadaPorDefecto,
    sugerirLicencia,
    vacacionesCercanas,
    etiquetaPrivado,
    formatDiaMes,
    formatFechaCompleta
} from './licenciasFiestasUtils.js';

document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const selectTemporada = document.getElementById('select-temporada');
    const semanasInfo = document.getElementById('semanas-info');
    const bannerEstado = document.getElementById('banner-estado');
    const contadores = document.getElementById('contadores');
    const tbody = document.getElementById('tabla-fiestas-body');
    const btnGuardar = document.getElementById('btn-guardar');
    const btnGuardarAbajo = document.getElementById('btn-guardar-abajo');
    const btnRestablecer = document.getElementById('btn-restablecer');

    // Estado de la página
    let usuarios = [];
    let semanas = null;
    let temporadaActual = temporadaPorDefecto();
    let temporadaGuardada = false;
    let hayCambiosSinGuardar = false;

    // Aviso al salir con cambios sin guardar. No se reutiliza warnBeforeUnload.js
    // porque ese módulo está atado al botón de imprimir del asistente.
    window.addEventListener('beforeunload', (event) => {
        if (!hayCambiosSinGuardar) return;
        event.preventDefault();
        event.returnValue = '';
        return '';
    });

    function marcarCambios(valor) {
        hayCambiosSinGuardar = valor;
    }

    // --- Inicialización del selector de temporada ---
    const base = temporadaPorDefecto();
    for (let anio = base - 2; anio <= base + 2; anio++) {
        const option = document.createElement('option');
        option.value = anio;
        option.textContent = `${anio} / ${anio + 1}`;
        selectTemporada.appendChild(option);
    }
    selectTemporada.value = String(temporadaActual);

    selectTemporada.addEventListener('change', async () => {
        if (hayCambiosSinGuardar && !confirm('Hay cambios sin guardar. ¿Querés descartarlos y cambiar de temporada?')) {
            selectTemporada.value = String(temporadaActual);
            return;
        }
        temporadaActual = Number(selectTemporada.value);
        await cargarTemporada();
    });

    btnGuardar.addEventListener('click', guardar);
    btnGuardarAbajo.addEventListener('click', guardar);

    btnRestablecer.addEventListener('click', () => {
        if (!confirm('Se van a descartar las asignaciones actuales de la pantalla y volver a calcular las sugerencias automáticas. ¿Continuar?')) return;
        renderTabla({ forzarSugerencias: true });
        marcarCambios(true);
        toast.success('Sugerencias restablecidas. Recordá guardar para aplicarlas.');
    });

    cargarTemporada();

    // --- Carga de datos ---
    async function cargarTemporada() {
        semanas = getSemanasTemporada(temporadaActual);
        marcarCambios(false);

        try {
            const [usuariosRes, estadoRes] = await Promise.all([
                fetch(`${apiUrl}/auth/users`, {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                }),
                fetch(`${apiUrl}/licencias-fiestas?temporada=${temporadaActual}`, {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
            ]);

            // getAllUsers responde un arreglo pelado; el resto de la API usa { success, ... }
            const usuariosData = await usuariosRes.json();
            usuarios = (usuariosData.users || usuariosData || []).filter(u => u && u._id);
            usuarios.sort((a, b) => String(a.username).localeCompare(String(b.username), 'es'));

            const estado = await estadoRes.json();
            if (!estado.success) {
                toast.error(estado.message || 'Error al cargar el estado de la temporada');
                return;
            }

            temporadaGuardada = estado.guardada;
            const guardadas = new Map(estado.asignaciones.map(a => [String(a.userId), a.holiday]));

            renderSemanasInfo();
            renderBanner();
            renderTabla({ guardadas });
        } catch (error) {
            toast.error('Error de conexión al cargar las licencias de fiestas');
        }
    }

    // --- Render ---
    function renderSemanasInfo() {
        const nav = semanas['Navidad'];
        const an = semanas['Año Nuevo'];
        semanasInfo.textContent =
            `Navidad: ${formatFechaCompleta(nav.inicio)} al ${formatFechaCompleta(nav.fin)}  ·  ` +
            `Año Nuevo: ${formatFechaCompleta(an.inicio)} al ${formatFechaCompleta(an.fin)}`;
    }

    function renderBanner() {
        const etiqueta = `${temporadaActual}/${temporadaActual + 1}`;
        if (temporadaGuardada) {
            bannerEstado.className = 'banner-estado guardada';
            bannerEstado.textContent = `Temporada ${etiqueta} — guardada. Se muestran las asignaciones confirmadas.`;
        } else {
            bannerEstado.className = 'banner-estado sin-guardar';
            bannerEstado.textContent = `Temporada ${etiqueta} — sin guardar. Las opciones marcadas en ámbar son sugerencias automáticas.`;
        }
    }

    /**
     * Dibuja la tabla.
     * - Si la temporada está guardada, se muestra el estado guardado tal cual y no
     *   se vuelve a sugerir (quien quedó en "Ninguna" fue una decisión del admin).
     * - Si no, o si el admin pidió restablecer, se muestran las sugerencias.
     */
    function renderTabla({ guardadas = null, forzarSugerencias = false } = {}) {
        tbody.innerHTML = '';

        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="tabla-mensaje">No hay usuarios para mostrar</td></tr>';
            actualizarContadores();
            return;
        }

        const usarSugerencias = forzarSugerencias || !temporadaGuardada;

        usuarios.forEach(user => {
            const privado = etiquetaPrivado(user);
            const sugerencia = sugerirLicencia(user.vacations, semanas);
            const cercanas = vacacionesCercanas(user.vacations, semanas);

            let seleccion = '';
            let esSugerido = false;

            if (usarSugerencias) {
                seleccion = sugerencia.holiday;
                esSugerido = !!sugerencia.holiday;
            } else if (guardadas) {
                seleccion = guardadas.get(String(user._id)) || '';
            }

            const tr = document.createElement('tr');
            tr.dataset.userId = user._id;
            tr.dataset.categoria = privado.categoria;
            if (esSugerido) tr.classList.add('sugerido');

            const vacacionesTexto = cercanas.length
                ? cercanas.map(v => `${formatDiaMes(v.inicio)} → ${formatDiaMes(v.fin)}`).join(' · ')
                : 'Sin vacaciones cercanas';

            const motivoHtml = (usarSugerencias && sugerencia.motivo)
                ? `<span class="motivo-sugerencia">${sugerencia.motivo}</span>`
                : '';

            tr.innerHTML = `
                <td><span class="usuario-nombre"></span></td>
                <td><span class="chip-privado ${privado.clase}">${privado.texto}</span></td>
                <td>
                    <span class="${cercanas.length ? 'vacaciones-lista' : 'vacaciones-vacio'}">${vacacionesTexto}</span>
                    ${motivoHtml}
                </td>
                <td>
                    <div class="radio-group">
                        ${radioHtml(user._id, 'Navidad', seleccion, esSugerido)}
                        ${radioHtml(user._id, 'Año Nuevo', seleccion, esSugerido)}
                        ${radioHtml(user._id, '', seleccion, false, 'Ninguna')}
                        ${esSugerido ? '<span class="badge-sugerido">Sugerido</span>' : ''}
                    </div>
                </td>
            `;

            // El username va por textContent para no interpretar HTML en datos de usuario.
            tr.querySelector('.usuario-nombre').textContent = user.username || '(sin nombre)';

            tr.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    // Al elegir a mano, la fila deja de ser una sugerencia.
                    tr.classList.remove('sugerido');
                    tr.querySelector('.badge-sugerido')?.remove();
                    tr.querySelector('.motivo-sugerencia')?.remove();
                    tr.querySelectorAll('.radio-group label').forEach(l => l.classList.remove('es-sugerido'));
                    marcarCambios(true);
                    actualizarContadores();
                });
            });

            tbody.appendChild(tr);
        });

        actualizarContadores();
    }

    function radioHtml(userId, valor, seleccion, esSugerido, etiqueta = null) {
        const checked = valor === seleccion ? 'checked' : '';
        const claseSugerido = (esSugerido && valor === seleccion) ? 'es-sugerido' : '';
        const texto = etiqueta || valor;
        return `<label class="${claseSugerido}">
            <input type="radio" name="fiesta-${userId}" value="${valor}" ${checked}>
            <span>${texto}</span>
        </label>`;
    }

    // --- Contadores ---
    function leerAsignaciones() {
        return Array.from(tbody.querySelectorAll('tr[data-user-id]')).map(tr => {
            const marcado = tr.querySelector('input[type="radio"]:checked');
            return {
                userId: tr.dataset.userId,
                categoria: tr.dataset.categoria,
                holiday: marcado ? marcado.value : ''
            };
        });
    }

    function actualizarContadores() {
        const filas = leerAsignaciones();

        const resumen = {};
        TIPOS_FIESTAS.forEach(tipo => {
            resumen[tipo] = { total: 0, nqn: 0, rn: 0, ambos: 0, ninguno: 0 };
        });
        let sinLicencia = 0;

        filas.forEach(f => {
            if (!f.holiday) {
                sinLicencia++;
                return;
            }
            const r = resumen[f.holiday];
            if (!r) return;
            r.total++;
            r[f.categoria] = (r[f.categoria] || 0) + 1;
        });

        // Aviso blando: si alguna categoría queda desbalanceada por más de 2 personas
        // entre las dos semanas, la cobertura de ese sitio puede no cerrar.
        const desbalanceado = ['nqn', 'rn', 'ambos'].some(cat =>
            Math.abs(resumen['Navidad'][cat] - resumen['Año Nuevo'][cat]) > 2
        );

        const detalle = r => `Nqn ${r.nqn} · RN ${r.rn} · Ambos ${r.ambos}`;

        contadores.innerHTML = `
            <div class="contador ${desbalanceado ? 'desbalanceado' : ''}">
                <span class="contador-titulo">Navidad</span>
                <span class="contador-valor">${resumen['Navidad'].total}</span>
                <span class="contador-detalle">${detalle(resumen['Navidad'])}</span>
            </div>
            <div class="contador ${desbalanceado ? 'desbalanceado' : ''}">
                <span class="contador-titulo">Año Nuevo</span>
                <span class="contador-valor">${resumen['Año Nuevo'].total}</span>
                <span class="contador-detalle">${detalle(resumen['Año Nuevo'])}</span>
            </div>
            <div class="contador">
                <span class="contador-titulo">Sin licencia</span>
                <span class="contador-valor">${sinLicencia}</span>
                <span class="contador-detalle">&nbsp;</span>
            </div>
            <div class="contador">
                <span class="contador-titulo">Total</span>
                <span class="contador-valor">${filas.length}</span>
                <span class="contador-detalle">${desbalanceado ? 'Reparto desbalanceado por sitio' : '&nbsp;'}</span>
            </div>
        `;
    }

    // --- Guardado ---
    async function guardar() {
        const asignaciones = leerAsignaciones()
            .filter(f => f.holiday)
            .map(f => ({ userId: f.userId, holiday: f.holiday }));

        btnGuardar.disabled = true;
        btnGuardarAbajo.disabled = true;

        try {
            const response = await fetch(`${apiUrl}/licencias-fiestas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ temporada: temporadaActual, asignaciones })
            });

            const data = await response.json();

            if (data.success) {
                marcarCambios(false);
                toast.success(data.message || 'Licencias de fiestas guardadas');
                // Se recarga desde el servidor en lugar de confiar en el estado local:
                // así un guardado parcial se ve de inmediato.
                await cargarTemporada();
            } else {
                toast.error(data.message || 'Error al guardar las licencias de fiestas');
            }
        } catch (error) {
            toast.error('Error de conexión al guardar');
        } finally {
            btnGuardar.disabled = false;
            btnGuardarAbajo.disabled = false;
        }
    }
});
