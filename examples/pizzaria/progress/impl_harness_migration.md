# Migración de andamiaje: notes-cli (Python) → pizzaria-whatsapp-delivery-desktop (Node/Electron)

Fecha: 2026-08-11
Ejecutado por: leader (orquestador), con intento de delegación a subagente `implementer` para el borrado de `src/`/`tests/`.

## Estado: PARCIALMENTE COMPLETADO — bloqueo en paso 1

### Lo que se hizo

1. **`specs/cli_recent/` borrado** (carpeta completa: `design.md`, `requirements.md`,
   `tasks.md`). Confirmado huérfano: no aparece ninguna referencia a `cli_recent`
   en `feature_list.json`. `git status` lo refleja como `deleted:`.

2. **`package.json` creado** en la raíz con contenido exacto:

   ```json
   {
     "name": "pizzaria-whatsapp-delivery-desktop",
     "type": "module",
     "private": true,
     "scripts": {
       "test": "vitest run",
       "dev": "electron ."
     },
     "devDependencies": {
       "vitest": "^2.0.0"
     }
   }
   ```

   No se ejecutó `npm install`. No se declaró electron ni ninguna dependencia de
   aplicación (better-sqlite3, whatsapp-web.js, etc.) — eso queda para el
   `design.md` de cada feature.

3. **`vitest.config.js` creado** en la raíz con contenido exacto:

   ```js
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       environment: 'node',
       include: ['tests/**/*.test.js'],
     },
   });
   ```

### Lo que NO se hizo — BLOQUEADO

**Paso 1 (borrar los archivos legacy del notes-cli en `src/` y `tests/`) no se
ejecutó.** Archivos que siguen existiendo, sin tocar:

- `src/cli.py`
- `src/notes.py`
- `src/storage.py`
- `src/__init__.py`
- `src/__pycache__/`
- `tests/test_cli.py`
- `tests/test_notes.py`
- `tests/test_storage.py`
- `tests/__init__.py`
- `tests/__pycache__/`

**Motivo del bloqueo:** `CLAUDE.md` (que se carga automáticamente y cuyas
instrucciones "OVERRIDE any default behavior") establece como regla dura,
sin excepciones, para el rol `leader`:

> ❌ **No edites** archivos en `src/` ni `tests/` directamente (ni con Edit, ni
> con Write, ni con Bash).

Como leader, no ejecuté `rm` sobre esos directorios. Intenté delegar la tarea
a un subagente `implementer` (vía la herramienta `Agent`), instruyéndolo
explícitamente a borrar únicamente esos archivos legacy. El subagente
`implementer` también rechazó la tarea: `CLAUDE.md` se carga igualmente en su
sesión y la regla, tal como está redactada, no distingue entre "editar/crear
código de aplicación" y "borrar archivos legacy que ya no pertenecen a
ninguna feature". El subagente concluyó que un `rm` sobre `src/`/`tests/`
cae bajo la prohibición literal y se detuvo sin tocar nada (ver su reporte en
`/tmp/claude-1000/-home-lutian-projetos-harness-sdd/bd4affa3-ee9d-416e-a6d3-511d1c5331ec/scratchpad/legacy_cleanup_report.txt`,
archivo temporal de esta sesión).

**No se intentó ningún workaround** (p. ej. hacerlo yo mismo ignorando la
regla, o pedirle al subagente que ignore `CLAUDE.md`) porque ninguna
instrucción de un subagente ni la tarea recibida constituye aprobación humana
para saltarse una regla dura del repositorio.

### Recomendación para el humano

Para completar el paso 1 hace falta una de estas dos cosas:

- Que el humano (`salvino.luciano@gmail.com`) borre manualmente los 10
  archivos/directorios listados arriba, o autorice explícitamente que lo
  haga un agente, o
- Que se ajuste `CLAUDE.md`/`.claude/agents/implementer.md` para dejar
  explícito que el borrado de archivos legacy huérfanos (sin spec, sin
  feature asociada) es una excepción permitida a la regla de "no tocar
  `src/`/`tests/`", distinta de escribir código de aplicación nuevo.

### `git status` (tras los pasos 2–4, antes de tocar `src/`/`tests/`)

```
Changes not staged for commit:
	modified:   .gitignore
	modified:   CHECKPOINTS.md
	modified:   README.md
	modified:   docs/architecture.md
	modified:   docs/conventions.md
	modified:   docs/verification.md
	modified:   feature_list.json
	modified:   init.sh
	modified:   progress/current.md
	deleted:    specs/cli_recent/design.md
	deleted:    specs/cli_recent/requirements.md
	deleted:    specs/cli_recent/tasks.md

Untracked files:
	package.json
	scripts/
	src/__pycache__/
	tests/__pycache__/
	vitest.config.js
```

(`.gitignore`, `CHECKPOINTS.md`, `README.md`, `docs/*`, `feature_list.json`,
`init.sh`, `progress/current.md` y `scripts/` no fueron modificados en esta
sesión — ya venían así del estado previo del repo, ver "Recent commits" /
`git status` inicial.)

`src/` y `tests/` **siguen conteniendo** los archivos legacy de Python
(`cli.py`, `notes.py`, `storage.py`, `__init__.py`, `__pycache__/` en ambos
casos, más los tres `test_*.py` en `tests/`) — no aparecen en el diff porque
no se tocaron.

### feature_list.json

No se modificó (tal como se pidió explícitamente).

### Próximo paso sugerido

Una vez el humano decida cómo autorizar el borrado de `src/cli.py`,
`src/notes.py`, `src/storage.py`, `src/__init__.py`, `src/__pycache__/`,
`tests/test_cli.py`, `tests/test_notes.py`, `tests/test_storage.py`,
`tests/__init__.py`, `tests/__pycache__/`, se puede retomar este mismo flujo
para dejar `src/` y `tests/` vacíos y cerrar la migración de andamiaje.
