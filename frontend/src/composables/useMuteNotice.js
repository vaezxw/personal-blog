import { ref } from 'vue'

const open = ref(false)

export function showMuteNotice() {
  open.value = true
}

export function closeMuteNotice() {
  open.value = false
}

/** Returns true when the user may proceed. Shows the mute dialog when blocked. */
export function assertNotMuted(user) {
  if (user?.muted) {
    showMuteNotice()
    return false
  }
  return true
}

export function useMuteNotice() {
  return {
    open,
    showMuteNotice,
    closeMuteNotice,
    assertNotMuted,
  }
}
