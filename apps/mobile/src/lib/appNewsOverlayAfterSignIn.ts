/**
 * Modal de novidades no mapa: só após login explícito (`SIGNED_IN`), não ao reabrir o app com sessão salva.
 * O AppShell marca pending no auth; MapHome consome ao entrar no mapa carregado.
 */
let pendingMapOverlayAfterSignIn = false;

export function requestAppNewsMapOverlayAfterSignIn() {
  pendingMapOverlayAfterSignIn = true;
}

export function clearPendingAppNewsMapOverlayAfterSignIn() {
  pendingMapOverlayAfterSignIn = false;
}

/** Uma vez true, zera e devolve true — usado para disparar a RPC só nessa visita ao mapa. */
export function consumePendingAppNewsMapOverlayAfterSignIn(): boolean {
  if (!pendingMapOverlayAfterSignIn) {
    return false;
  }
  pendingMapOverlayAfterSignIn = false;
  return true;
}
