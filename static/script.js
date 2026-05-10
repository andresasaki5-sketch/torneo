let partidoActual = null;
let equipoActual = null;
let golesAntesEmpate = { g1: 0, g2: 0 };

window.onload = function() {
    cargarPartidos();
    cargarEquipos();
};

// ── EQUIPOS ──
function cargarEquipos() {
    fetch('/api/equipos')
    .then(r => r.json())
    .then(equipos => {
        const sel1 = document.getElementById('equipo1-partido');
        const sel2 = document.getElementById('equipo2-partido');
        sel1.innerHTML = '';
        sel2.innerHTML = '';
        equipos.forEach(e => {
            sel1.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
            sel2.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
        });
        renderEquipos(equipos);
    });
}

function renderEquipos(equipos) {
    const div = document.getElementById('lista-equipos');
    div.innerHTML = '';
    equipos.forEach(e => {
        const goleador = e.goleador_nombre
            ? `⚽ ${e.goleador_nombre} (${e.goleador_goles} goles)`
            : 'Sin goleador registrado';
        div.innerHTML += `
            <div class="equipo-card" onclick="abrirGoleador(${e.id}, '${e.nombre}', '${e.goleador_nombre}', ${e.goleador_goles})">
                <h3>${e.nombre}</h3>
                <div class="goles">${e.goles_total}</div>
                <div class="goles-label">goles totales</div>
                <div class="goleador-info">${goleador}</div>
            </div>
        `;
    });
}

function crearEquipo() {
    const nombre = document.getElementById('nombre-equipo').value.trim();
    if (!nombre) { alert('Ingresa el nombre del equipo'); return; }
    fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
    })
    .then(r => r.json())
    .then(() => {
        document.getElementById('nombre-equipo').value = '';
        cargarEquipos();
    });
}

// ── PARTIDOS ──
function cargarPartidos() {
    fetch('/api/partidos')
    .then(r => r.json())
    .then(partidos => {
        ['octavos','cuartos','semifinal','final'].forEach(id => {
            document.getElementById(id).innerHTML = '';
        });

        const porRonda = {
            octavos: partidos.filter(p => p.ronda === 'Octavos'),
            cuartos: partidos.filter(p => p.ronda === 'Cuartos'),
            semifinal: partidos.filter(p => p.ronda === 'Semifinal'),
            final: partidos.filter(p => p.ronda === 'Final')
        };

        const slots = { octavos: 8, cuartos: 4, semifinal: 2, final: 1 };

        Object.entries(slots).forEach(([ronda, total]) => {
            const cont = document.getElementById(ronda);
            const lista = porRonda[ronda];
            for (let i = 0; i < total; i++) {
                const slot = document.createElement('div');
                slot.className = 'partido-slot';
                if (lista[i]) {
                    slot.appendChild(crearTarjeta(lista[i]));
                } else {
                    slot.appendChild(crearSlotVacio());
                }
                cont.appendChild(slot);
            }
        });

        // Campeón
        const finalPartidos = porRonda.final;
        const campeonDiv = document.getElementById('campeon');
        const campeonNombre = document.getElementById('campeon-nombre');
        if (finalPartidos.length > 0) {
            const f = finalPartidos[0];
            if (f.estado === 'finalizado' && f.ganador_id) {
                const nombre = f.ganador_id === f.equipo1_id ? f.equipo1 : f.equipo2;
                campeonNombre.textContent = nombre;
                campeonDiv.style.display = 'flex';
            } else {
                campeonDiv.style.display = 'none';
            }
        } else {
            campeonDiv.style.display = 'none';
        }
    });
}

function crearSlotVacio() {
    const div = document.createElement('div');
    div.className = 'partido-card';
    div.style.opacity = '0.35';
    div.innerHTML = `
        <div class="equipo tbd"><span>Por definir</span></div>
        <div class="separador"></div>
        <div class="equipo tbd"><span>Por definir</span></div>
    `;
    return div;
}

function crearTarjeta(p) {
    const div = document.createElement('div');
    div.className = 'partido-card';

    const g1 = p.estado !== 'pendiente' ? p.goles1 : '-';
    const g2 = p.estado !== 'pendiente' ? p.goles2 : '-';
    const ganador1 = p.estado === 'finalizado' && p.ganador_id === p.equipo1_id;
    const ganador2 = p.estado === 'finalizado' && p.ganador_id === p.equipo2_id;

    let estadoTexto = '';
    if (p.estado === 'pendiente') estadoTexto = '⏳ Pendiente';
    else if (p.estado === 'en_curso') estadoTexto = '🔴 En Curso';
    else estadoTexto = '✅ Finalizado';

    let penalesTexto = '';
    if (p.estado === 'finalizado' && p.goles1 === p.goles2) {
        penalesTexto = `<div class="penales-info">Penales: ${p.penales1} - ${p.penales2}</div>`;
    }

    const t1 = p.equipo1 || 'Por definir';
    const t2 = p.equipo2 || 'Por definir';

    div.innerHTML = `
        <div class="equipo ${ganador1 ? 'ganador' : ''}">
            <span>${t1}</span>
            <span>${g1}</span>
        </div>
        <div class="separador"></div>
        <div class="equipo ${ganador2 ? 'ganador' : ''}">
            <span>${t2}</span>
            <span>${g2}</span>
        </div>
        ${penalesTexto}
        <div class="estado-badge estado-${p.estado}">${estadoTexto}</div>
        <button class="btn-editar" onclick='abrirResultado(${JSON.stringify(p)})'>✏️ Editar</button>
    `;
    return div;
}

function crearPartido() {
    const ronda = document.getElementById('ronda-partido').value;
    const e1 = document.getElementById('equipo1-partido').value;
    const e2 = document.getElementById('equipo2-partido').value;
    if (e1 === e2) { alert('Selecciona dos equipos diferentes'); return; }
    fetch('/api/partidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ronda, equipo1_id: e1, equipo2_id: e2 })
    })
    .then(r => r.json())
    .then(() => cargarPartidos());
}

// ── MODAL RESULTADO ──
function abrirResultado(p) {
    partidoActual = p;
    document.getElementById('titulo-resultado').textContent = `${p.equipo1} vs ${p.equipo2}`;
    document.getElementById('nombre-e1').textContent = p.equipo1;
    document.getElementById('nombre-e2').textContent = p.equipo2;
    document.getElementById('goles-e1').value = p.goles1 || 0;
    document.getElementById('goles-e2').value = p.goles2 || 0;
    document.getElementById('modal-resultado').style.display = 'flex';
}

function cerrarModalResultado() {
    document.getElementById('modal-resultado').style.display = 'none';
}

function guardarEstado(estado) {
    const g1 = parseInt(document.getElementById('goles-e1').value) || 0;
    const g2 = parseInt(document.getElementById('goles-e2').value) || 0;

    if (estado === 'finalizado' && g1 === g2) {
        golesAntesEmpate = { g1, g2 };
        cerrarModalResultado();
        abrirPenales();
        return;
    }
    enviarResultado(estado, g1, g2, 0, 0);
}

function enviarResultado(estado, g1, g2, p1, p2) {
    fetch(`/api/partidos/${partidoActual.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            goles1: g1, goles2: g2,
            penales1: p1, penales2: p2,
            estado: estado,
            ronda: partidoActual.ronda
        })
    })
    .then(r => r.json())
    .then(() => {
        cerrarModalResultado();
        cargarPartidos();
        cargarEquipos();
    });
}

// ── ELIMINAR PARTIDO ──
function eliminarPartido() {
    if (!confirm('¿Seguro que deseas eliminar este partido?')) return;
    fetch(`/api/partidos/${partidoActual.id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(() => {
        cerrarModalResultado();
        cargarPartidos();
        cargarEquipos();
    });
}

// ── MODAL PENALES ──
function abrirPenales() {
    document.getElementById('penal-nombre-e1').textContent = partidoActual.equipo1;
    document.getElementById('penal-nombre-e2').textContent = partidoActual.equipo2;
    document.getElementById('penales-e1').value = 0;
    document.getElementById('penales-e2').value = 0;
    document.getElementById('modal-penales').style.display = 'flex';
}

function confirmarPenales() {
    const p1 = parseInt(document.getElementById('penales-e1').value) || 0;
    const p2 = parseInt(document.getElementById('penales-e2').value) || 0;
    if (p1 === p2) {
        alert('Los penales no pueden terminar en empate. Ingresa un ganador.');
        return;
    }
    document.getElementById('modal-penales').style.display = 'none';
    enviarResultado('finalizado', golesAntesEmpate.g1, golesAntesEmpate.g2, p1, p2);
}

// ── MODAL GOLEADOR ──
function abrirGoleador(id, nombre, goleadorNombre, goleadorGoles) {
    equipoActual = id;
    document.getElementById('titulo-goleador').textContent = '⚽ ' + nombre;
    document.getElementById('nombre-goleador').value = goleadorNombre || '';
    document.getElementById('goles-goleador').value = goleadorGoles || 0;
    document.getElementById('modal-goleador').style.display = 'flex';
}

function cerrarModalGoleador() {
    document.getElementById('modal-goleador').style.display = 'none';
}

function guardarGoleador() {
    const nombre = document.getElementById('nombre-goleador').value.trim();
    const goles = parseInt(document.getElementById('goles-goleador').value) || 0;
    if (!nombre) { alert('Ingresa el nombre del goleador'); return; }
    fetch(`/api/equipos/${equipoActual}/goleador`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, goles })
    })
    .then(r => r.json())
    .then(() => {
        cerrarModalGoleador();
        cargarEquipos();
    });
}