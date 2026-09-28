# Puyo Puyo

Clon sencillo de Puyo Puyo desarrollado con HTML, CSS y JavaScript.

## Estructura

```text
puyo-puyo/
├── 1.html              # Pagina principal del juego
├── css/
│   └── styles.css      # Estilos visuales
├── js/
│   └── game.js         # Logica del juego y piezas animadas
└── README.md           # Documentacion del proyecto
```

## Como ejecutarlo

Abre `1.html` directamente en un navegador moderno. No requiere instalacion ni servidor.

## Controles

- **Flecha izquierda / derecha:** mover la pieza.
- **Flecha arriba:** rotar la pieza.
- **Flecha abajo:** acelerar la caida.

La pieza esta formada por tres imagenes SVG animadas y el juego conserva la logica de gravedad, combinaciones y puntuacion.

## Funciones

- Menu de inicio, pausa y reinicio.
- Pantalla de Game Over.
- Niveles con velocidad progresiva.
- Vista de la siguiente pieza.
- Record guardado en el navegador.
