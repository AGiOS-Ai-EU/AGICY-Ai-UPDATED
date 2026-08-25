; Close a running UPDATED instance before install/upgrade so NSIS can replace
; files without forcing a manual "remove previous version" / close-app dance.
!macro customInit
  nsExec::ExecToLog 'taskkill /IM UPDATED.exe /F /T'
  Sleep 1000
!macroend
