' ==============================================================================
' UROSTONE.AI - Ain Shams University Desktop Application Silent Launcher
' Opens the clinical workstation directly in its own standalone window with zero console
' ==============================================================================
Option Explicit

Dim WshShell, fso, currentDir, batPath

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = Chr(34) & currentDir & "\Launch_UroStone_AI.bat" & Chr(34)

' Run hidden with window style 0 (no command prompt window appears)
WshShell.Run batPath, 0, False

Set WshShell = Nothing
Set fso = Nothing
