---
name: detectar-oportunidades-de-skills
description: "Detecta tareas o flujos de trabajo repetidos que podrían convertirse en una skill reutilizable. Úsala cuando el usuario mencione tareas repetitivas, automatizar un proceso, crear una skill, o pregunte si un flujo merece una skill."
---

# Detectar oportunidades para crear skills

Ayuda al usuario a reconocer cuándo un procedimiento recurrente merece convertirse en una skill de Copilot y, si lo solicita, define y crea esa skill en el ámbito acordado.

## Alcance y límites

- Usa únicamente las tareas repetidas que sean visibles en la conversación actual o que el usuario señale explícitamente.
- No afirmes que puedes observar, contar o recordar automáticamente tareas de otras conversaciones.
- Una skill se carga bajo demanda; no puede vigilar por sí sola todas las tareas del workspace.
- No crees ni modifiques una skill sin que el usuario lo solicite.

## Evaluación

Cuando el usuario pregunte si conviene una skill o describa un patrón repetido:

1. Identifica el flujo común y separa los pasos estables de los detalles que cambian entre casos.
2. Revisa primero las skills disponibles para encontrar una que ya cubra el flujo. Si existe, recomienda usarla y evita crear una duplicada. Por ejemplo, para crear o modificar formularios Angular, deriva a `crear-formularios-angular` cuando esté disponible.
3. Considera que puede merecer una skill nueva si el proceso se repite, tiene pasos o criterios reutilizables y requiere conocimiento especializado que sería útil cargar bajo demanda.
4. No recomiendes una skill para una acción trivial de una sola etapa. Si la regla debe aplicarse a casi todas las tareas del proyecto, sugiere instrucciones del workspace; para un flujo especializado y bajo demanda, sugiere una skill.
5. Expón brevemente la evidencia disponible, los beneficios esperados y cualquier incertidumbre. No inventes frecuencia ni historial.
6. Si faltan datos importantes sobre el comportamiento esperado o el alcance, pregunta antes de diseñarla.

## Diseño y creación

Cuando el usuario pida crear la skill:

1. Confirma el alcance (workspace o perfil) si todavía no está definido. Para este workspace, usa `.github/skills/<nombre>/SKILL.md`.
2. Define una descripción concreta con términos que faciliten su descubrimiento y activen la skill en los casos pertinentes.
3. Escribe instrucciones autocontenidas, accionables y concisas: cuándo usarla, procedimiento, validaciones y límites.
4. Asegúrate de que `name` coincida con el nombre de la carpeta y que el YAML del encabezado sea válido.
5. Crea solo los archivos necesarios. No agregues instrucciones globales ni scripts salvo que el usuario los pida o el flujo los requiera.
6. Informa la ruta creada y el modo de invocarla; aclara los límites de activación si el usuario espera detección automática continua.
