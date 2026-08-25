; Kill running UPDATED before install/upgrade.
; Also replace electron-builder's default "app running" check: it uses a
; substring match, so "UPDATED Setup.exe" (this installer) matches
; "UPDATED.exe" and always shows "cannot be closed" even after a real quit.

!macro _UPDATED_KILL_APP
  DetailPrint "Closing UPDATED if it is running…"
  nsExec::ExecToLog 'taskkill /IM UPDATED.exe /F /T'
  Pop $0
  Sleep 800
  nsExec::ExecToLog 'taskkill /IM UPDATED.exe /F /T'
  Pop $0
  Sleep 500
!macroend

!macro customInit
  !insertmacro _UPDATED_KILL_APP
!macroend

!macro customCheckAppRunning
  !insertmacro _UPDATED_KILL_APP
  ; Do NOT call the default MessageBox check — it false-positives on the
  ; installer process name ("UPDATED Setup"). Proceed with install.
!macroend
