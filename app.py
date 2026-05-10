from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def conectar():
    return sqlite3.connect('torneo.db')

def iniciar_db():
    con = conectar()
    c = con.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        goles_total INTEGER DEFAULT 0,
        goleador_nombre TEXT DEFAULT '',
        goleador_goles INTEGER DEFAULT 0
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS partidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ronda TEXT,
        equipo1_id INTEGER,
        equipo2_id INTEGER,
        goles1 INTEGER DEFAULT 0,
        goles2 INTEGER DEFAULT 0,
        penales1 INTEGER DEFAULT 0,
        penales2 INTEGER DEFAULT 0,
        estado TEXT DEFAULT 'pendiente',
        ganador_id INTEGER DEFAULT NULL
    )''')
    con.commit()
    con.close()

iniciar_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/equipos')
def get_equipos():
    con = conectar()
    c = con.cursor()
    c.execute('SELECT * FROM equipos ORDER BY nombre')
    equipos = c.fetchall()
    con.close()
    return jsonify([{
        'id': e[0], 'nombre': e[1],
        'goles_total': e[2],
        'goleador_nombre': e[3],
        'goleador_goles': e[4]
    } for e in equipos])

@app.route('/api/equipos', methods=['POST'])
def crear_equipo():
    datos = request.json
    con = conectar()
    c = con.cursor()
    c.execute('INSERT INTO equipos (nombre) VALUES (?)', (datos['nombre'],))
    con.commit()
    con.close()
    return jsonify({'mensaje': 'Equipo creado'})

@app.route('/api/equipos/<int:id>/goleador', methods=['PUT'])
def actualizar_goleador(id):
    datos = request.json
    con = conectar()
    c = con.cursor()
    c.execute('UPDATE equipos SET goleador_nombre=?, goleador_goles=? WHERE id=?',
              (datos['nombre'], datos['goles'], id))
    con.commit()
    con.close()
    return jsonify({'mensaje': 'Goleador actualizado'})

@app.route('/api/partidos')
def get_partidos():
    con = conectar()
    c = con.cursor()
    c.execute('''SELECT p.id, p.ronda, e1.nombre, e2.nombre,
                 p.goles1, p.goles2, p.penales1, p.penales2,
                 p.estado, p.ganador_id, e1.id, e2.id
                 FROM partidos p
                 JOIN equipos e1 ON p.equipo1_id = e1.id
                 JOIN equipos e2 ON p.equipo2_id = e2.id
                 ORDER BY p.id''')
    partidos = c.fetchall()
    con.close()
    return jsonify([{
        'id': p[0], 'ronda': p[1],
        'equipo1': p[2], 'equipo2': p[3],
        'goles1': p[4], 'goles2': p[5],
        'penales1': p[6], 'penales2': p[7],
        'estado': p[8], 'ganador_id': p[9],
        'equipo1_id': p[10], 'equipo2_id': p[11]
    } for p in partidos])

@app.route('/api/partidos', methods=['POST'])
def crear_partido():
    datos = request.json
    con = conectar()
    c = con.cursor()
    c.execute('INSERT INTO partidos (ronda, equipo1_id, equipo2_id) VALUES (?, ?, ?)',
              (datos['ronda'], datos['equipo1_id'], datos['equipo2_id']))
    con.commit()
    con.close()
    return jsonify({'mensaje': 'Partido creado'})

@app.route('/api/partidos/<int:id>', methods=['DELETE'])
def eliminar_partido(id):
    con = conectar()
    c = con.cursor()
    c.execute('SELECT equipo1_id, equipo2_id, goles1, goles2, estado FROM partidos WHERE id=?', (id,))
    p = c.fetchone()
    if p and p[4] == 'finalizado':
        c.execute('UPDATE equipos SET goles_total=MAX(0, goles_total-?) WHERE id=?', (p[2], p[0]))
        c.execute('UPDATE equipos SET goles_total=MAX(0, goles_total-?) WHERE id=?', (p[3], p[1]))
    c.execute('DELETE FROM partidos WHERE id=?', (id,))
    con.commit()
    con.close()
    return jsonify({'mensaje': 'Partido eliminado'})

@app.route('/api/partidos/<int:id>', methods=['PUT'])
def actualizar_partido(id):
    datos = request.json
    con = conectar()
    c = con.cursor()
    g1 = datos['goles1']
    g2 = datos['goles2']
    p1 = datos.get('penales1', 0)
    p2 = datos.get('penales2', 0)
    estado = datos['estado']
    ganador_id = None

    c.execute('SELECT equipo1_id, equipo2_id, goles1, goles2, estado FROM partidos WHERE id=?', (id,))
    anterior = c.fetchone()
    eq1_id, eq2_id = anterior[0], anterior[1]

    if anterior[4] == 'finalizado':
        c.execute('UPDATE equipos SET goles_total=MAX(0, goles_total-?) WHERE id=?', (anterior[2], eq1_id))
        c.execute('UPDATE equipos SET goles_total=MAX(0, goles_total-?) WHERE id=?', (anterior[3], eq2_id))

    if estado == 'finalizado':
        if g1 > g2:
            ganador_id = eq1_id
        elif g2 > g1:
            ganador_id = eq2_id
        else:
            ganador_id = eq1_id if p1 > p2 else eq2_id
        c.execute('UPDATE equipos SET goles_total=goles_total+? WHERE id=?', (g1, eq1_id))
        c.execute('UPDATE equipos SET goles_total=goles_total+? WHERE id=?', (g2, eq2_id))
        avanzar_ganador(c, id, ganador_id, datos['ronda'])

    c.execute('''UPDATE partidos SET goles1=?, goles2=?, penales1=?,
              penales2=?, estado=?, ganador_id=? WHERE id=?''',
              (g1, g2, p1, p2, estado, ganador_id, id))
    con.commit()
    con.close()
    return jsonify({'mensaje': 'Partido actualizado'})

def avanzar_ganador(c, partido_id, ganador_id, ronda):
    if ronda == 'Octavos': siguiente_ronda = 'Cuartos'
    elif ronda == 'Cuartos': siguiente_ronda = 'Semifinal'
    elif ronda == 'Semifinal': siguiente_ronda = 'Final'
    else: return

    c.execute('SELECT id FROM partidos WHERE ronda=? ORDER BY id', (ronda,))
    partidos_ronda = [r[0] for r in c.fetchall()]

    try:
        pos = partidos_ronda.index(partido_id)
    except ValueError:
        return

    par = pos // 2
    lugar = pos % 2

    c.execute('SELECT id, equipo1_id, equipo2_id FROM partidos WHERE ronda=? ORDER BY id', (siguiente_ronda,))
    partidos_sig = c.fetchall()

    if par < len(partidos_sig):
        pid = partidos_sig[par][0]
        if lugar == 0:
            c.execute('UPDATE partidos SET equipo1_id=? WHERE id=?', (ganador_id, pid))
        else:
            c.execute('UPDATE partidos SET equipo2_id=? WHERE id=?', (ganador_id, pid))
    else:
        if lugar == 0:
            c.execute('INSERT INTO partidos (ronda, equipo1_id, equipo2_id) VALUES (?, ?, 0)', (siguiente_ronda, ganador_id))
        else:
            c.execute('SELECT id FROM partidos WHERE ronda=? ORDER BY id DESC LIMIT 1', (siguiente_ronda,))
            row = c.fetchone()
            if row:
                c.execute('UPDATE partidos SET equipo2_id=? WHERE id=?', (ganador_id, row[0]))

if __name__ == '__main__':
    app.run(debug=True)