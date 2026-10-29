---
name: flujo-git-diario
description: "Gestiona el flujo diario de trabajo con Git: inspecciona el repositorio, crea o reutiliza ramas work/YYYY-MM-DD, valida cambios y los deja listos para revisión sin integrarlos ni subirlos sin aprobación. Úsala al iniciar o finalizar trabajo con Git, crear ramas, preparar una integración o revisar el estado del árbol."
---

# Flujo diario de Git

Trabaja de forma segura en una rama diaria y conserva el control del usuario sobre la integración a la rama principal.

## Activadores de la jornada

- `Hola` inicia el flujo diario. Antes de empezar tareas, ejecuta el procedimiento de inicio y confirma al usuario en qué rama trabajarás.
- `Bye` termina el flujo diario. Ejecuta el procedimiento de finalización y resume los cambios, la rama activa y las validaciones.
- No interpretes otros mensajes como activadores de inicio o cierre. Si el usuario pide explícitamente iniciar o finalizar el flujo sin usar esas palabras, respeta la solicitud explícita.

## Inicio del trabajo

1. Revisa `git status --short --branch`, la rama actual y las ramas locales/remotas. No asumas que la rama principal se llama `main`: identifica `main` o `master` a partir de las referencias reales.
2. Si el árbol está limpio y la rama principal está identificada, usa la fecha local con el formato ISO `YYYY-MM-DD` para el nombre `work/YYYY-MM-DD`.
3. Si la rama diaria de hoy ya existe, reutilízala solo si puede confirmarse que es la rama prevista para el trabajo actual.
4. Si no existe, créala desde la rama principal actualizada localmente, sin hacer `pull`, `fetch` ni otras operaciones de red salvo que el usuario lo autorice.
5. Si el repositorio no tiene commits, no hay una rama principal identificable, el árbol tiene cambios sin guardar, hay conflictos, o existe una rama diaria anterior con trabajo no integrado, detente y pregunta qué hacer.
6. No cambies de rama mientras existan cambios de usuario que puedan perderse o trasladarse de forma inesperada. No uses `stash`, `reset`, `clean`, `checkout` destructivo ni rebase para resolverlo sin autorización expresa.

## Durante el trabajo

- Mantén los cambios relacionados en la rama diaria; no alteres commits ni trabajo ajeno.
- No crees commits automáticamente. Crea commits solo cuando el usuario lo solicite o autorice.
- Ejecuta las pruebas y validaciones pertinentes antes de proponer integrar el trabajo.

## Finalización y revisión

1. Resume los cambios y las validaciones ejecutadas, y comprueba el estado final con `git status`.
2. Deja el trabajo en la rama diaria para revisión.
3. No hagas merge/rebase hacia `main` o `master`, no hagas push y no elimines ramas sin aprobación explícita del usuario.
4. Si el usuario solicita integrar, confirma que la rama destino es la correcta y que las validaciones están completas. Si hay cambios ajenos, divergencias o conflictos, detente y solicita instrucciones; no fuerces la integración.

## Seguridad de Git

- Nunca uses `git reset --hard`, `git clean`, `git push --force` ni comandos equivalentes que descarten o sobrescriban trabajo.
- No integres directamente a la rama principal por conveniencia o de manera implícita.
- Explica cualquier bloqueo con el estado concreto observado y espera autorización antes de realizar una operación que pueda afectar trabajo existente.
