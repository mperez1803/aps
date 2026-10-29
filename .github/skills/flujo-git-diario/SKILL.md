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

1. Confirma que `origin` sea `https://github.com/mperez1803/aps.git`. Si falta o apunta a otro repositorio, detente y consulta antes de modificarlo.
2. Comprueba qué cuenta está activa con `gh auth status --hostname github.com` cuando GitHub CLI esté disponible. La cuenta autorizada para este proyecto es `mperez1803`. La sesión de GitHub CLI no garantiza que Git HTTPS use la misma cuenta: verifica el acceso de Git con una operación de solo lectura y, si hace falta comprobar escritura, usa `git push --dry-run` sin subir cambios.
3. Si la cuenta observada no es `mperez1803` o el acceso es rechazado, explica el resultado y pide al usuario que cambie/inicie sesión en GitHub Desktop. No leas ni manipules el Llavero, tokens, contraseñas ni credenciales. Espera confirmación y vuelve a verificar; no crees ni publiques ramas antes de confirmar el acceso requerido.
4. Revisa `git status --short --branch`, la rama actual y las ramas locales/remotas. No asumas que la rama principal se llama `main`: identifica `main` o `master` a partir de las referencias reales.
5. Si el árbol está limpio, la rama principal está identificada y la cuenta/acceso está verificado, usa la fecha local con el formato ISO `YYYY-MM-DD` para el nombre `work/YYYY-MM-DD`.
6. Si la rama diaria de hoy ya existe en remoto, reutilízala solo si puede confirmarse que es la prevista para el trabajo actual y que no contiene trabajo divergente; configúrala para seguimiento local sin sobrescribirla. Si existe solo localmente, reutilízala si es seguro.
7. Si la rama diaria no existe, actualiza referencias desde el remoto y créala desde la rama principal remota más reciente solo con el árbol limpio y tras verificar el acceso. No hagas `pull` que modifique el árbol ni cambies la rama principal.
8. Si el repositorio no tiene commits, no hay una rama principal identificable, el árbol tiene cambios sin guardar, hay conflictos, o existe una rama diaria con trabajo divergente/no integrado, detente y pregunta qué hacer.
9. No cambies de rama mientras existan cambios de usuario que puedan perderse o trasladarse de forma inesperada. No uses `stash`, `reset`, `clean`, `checkout` destructivo ni rebase para resolverlo sin autorización expresa.

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
