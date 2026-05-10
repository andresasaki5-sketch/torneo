import sqlite3

def conectar():
    return sqlite3.connect('torneo.db')

def iniciar_db():
    con = conectar()
    c = con.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        grupo TEXT,
        jugados INTEGER DEFAULT 0,
        ganados INTEGER DEFAULT 0,
        empatados INTEGER DEFAULT 0,
        perdidos INTEGER DEFAULT 0,
        goles_favor INTEGER DEFAULT 0,
        goles_contra INTEGER DEFAULT 0,
        puntos INTEGER DEFAULT 0
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS partidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ronda TEXT,
        equipo1_id INTEGER,
        equipo2_id INTEGER,
        goles1 INTEGER DEFAULT 0,
        goles2 INTEGER DEFAULT 0,
        estado TEXT DEFAULT 'pendiente'
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS jugadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        equipo_id INTEGER,
        goles INTEGER DEFAULT 0,
        asistencias INTEGER DEFAULT 0,
        tarjetas_amarillas INTEGER DEFAULT 0,
        tarjetas_rojas INTEGER DEFAULT 0
    )''')

    con.commit()
    con.close()