<p align="center">
  <img src="img/mega_greninja_square.webp" alt="SteelDex Logo" width="120">
</p>

<h1 align="center">🛡️ SteelDex — El Analizador y Constructor de Equipos</h1>

<p align="center">
  <strong>Construye tu equipo Pokémon definitivo, analiza debilidades y resistencias en tiempo real, y simula combates estratégicos contra los Campeones de la Liga Pokémon de todas las generaciones.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Estado-BETA-orange?style=for-the-badge" alt="Estado BETA">
  <img src="https://img.shields.io/badge/Plataforma-Web-blue?style=for-the-badge" alt="Web">
  <img src="https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge" alt="MIT License">
</p>

---

## 📖 Descripción

**SteelDex** es una aplicación web interactiva diseñada para entrenadores Pokémon competitivos y casuales. Permite construir equipos de hasta 6 Pokémon con un análisis completo de coberturas de tipos, debilidades, resistencias y estrategias de combate — todo desde el navegador, sin necesidad de servidor.

## ✨ Características Principales

| Característica | Descripción |
|---|---|
| **🏗️ Constructor de Equipos** | Selecciona hasta 6 Pokémon con soporte para Mega Evoluciones, ítems y habilidades. |
| **📊 Análisis en Tiempo Real** | Matriz de debilidades/resistencias del equipo actualizada al instante. |
| **📦 Caja Pokémon** | Almacena hasta 30 Pokémon con sets completos para intercambiar con el equipo activo. |
| **🏆 Simulador de Campeones** | Enfrenta tu equipo contra los Campeones de la Liga de todas las generaciones. |
| **🔧 Entrenamiento / Buildeo** | Configura movimientos, naturalezas, EVs/IVs y objetos de cada Pokémon. |
| **📋 Estrategias** | Consulta guías y estrategias predefinidas para cada Pokémon. |
| **🔗 Importar/Exportar** | Importa y exporta equipos vía PokéPaste y formatos compatibles con Showdown. |
| **💾 Persistencia Local** | Los equipos y la caja se guardan automáticamente en `localStorage`. |
| **🎨 UI Premium** | Interfaz moderna con Lucide Icons, animaciones fluidas y diseño responsivo. |

## 🏛️ Arquitectura del Proyecto

```
SteelDex-El-Analizador-y-Constructor-de-Equipos-BETA/
│
├── index.html                  # Punto de entrada principal (SPA)
├── css/
│   └── styles.css              # Estilos globales (~70KB)
├── js/
│   ├── app.js                  # Lógica principal de la aplicación (~190KB)
│   ├── pokemon-db.js           # Base de datos completa del Pokédex
│   ├── moves-db.js             # Base de datos de movimientos
│   └── preset-teams.js         # Equipos predefinidos de Campeones
├── api/
│   └── sync_pokepaste.php      # Backend PHP para sincronización con PokéPaste
├── meta/
│   └── teams.json              # Datos de equipos del metagame
├── scripts/
│   └── update-meta-teams.py    # Script Python para actualizar datos del meta
├── img/                        # Recursos gráficos (sprites, iconos)
├── exportacion repositorio/    # Scripts de exportación (PowerShell, Batch)
├── .github/
│   └── workflows/              # GitHub Actions para automatización
├── CHANGELOG.md                # Historial detallado de cambios
├── AllTeams.txt                # Base de datos de equipos en texto plano
└── iniciar pokemon.bat         # Lanzador rápido para Windows
```

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla — sin frameworks)
- **Íconos:** [Lucide Icons](https://lucide.dev/) vía CDN
- **Sprites:** [Pokémon Showdown](https://play.pokemonshowdown.com/) sprites
- **Backend (opcional):** PHP para integración con PokéPaste
- **Automatización:** GitHub Actions, Python, PowerShell

## 🚀 Instalación y Ejecución

### Opción 1 — Abrir directamente

SteelDex es una aplicación **100% del lado del cliente**. Solo necesitas un navegador moderno:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/EdsonAntonio41/SteelDex-El-Analizador-y-Constructor-de-Equipos-BETA.git
   ```
2. Abre `index.html` en tu navegador favorito.

### Opción 2 — Lanzador rápido (Windows)

Haz doble clic en `iniciar pokemon.bat` para abrir la aplicación automáticamente.

### Opción 3 — Servidor local (para funciones PHP)

Si necesitas la funcionalidad de sincronización con PokéPaste:

```bash
# Con PHP instalado:
php -S localhost:8000

# O con Python:
python -m http.server 8000
```

Luego navega a `http://localhost:8000`.

## 📸 Vista Previa

La interfaz incluye:
- **Pestaña de Análisis de Equipo:** Grilla con los 6 slots del equipo y matriz de coberturas de tipos.
- **Caja Pokémon:** Almacenamiento con drag & drop.
- **Entrenamiento:** Configuración detallada de stats, movimientos y builds.
- **Estrategias:** Guías y consejos tácticos.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Para contribuir:

1. Haz un **Fork** del repositorio.
2. Crea tu **rama** de feature: `git checkout -b feature/nueva-funcionalidad`
3. **Commitea** tus cambios: `git commit -m 'feat: agregar nueva funcionalidad'`
4. **Sube** tu rama: `git push origin feature/nueva-funcionalidad`
5. Abre un **Pull Request**.

## 📜 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

## 📬 Contacto

- **Repositorio:** [github.com/EdsonAntonio41/SteelDex](https://github.com/EdsonAntonio41/SteelDex-El-Analizador-y-Constructor-de-Equipos-BETA)

---

<p align="center"><em>Hecho con ❤️ para la comunidad Pokémon competitiva.</em></p>
