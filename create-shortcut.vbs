Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")

' Criar atalho na área de trabalho
Set oShellLink = WshShell.CreateShortcut(strDesktop & "\UniverseTeca CMS.lnk")
oShellLink.TargetPath = WshShell.CurrentDirectory & "\start-universeteca.bat"
oShellLink.WorkingDirectory = WshShell.CurrentDirectory
oShellLink.Description = "Iniciar UniverseTeca CMS"
oShellLink.IconLocation = "%SystemRoot%\system32\SHELL32.dll,128"
oShellLink.Save

' Informar ao usuário
MsgBox "Atalho 'UniverseTeca CMS' criado na área de trabalho!" & vbCrLf & vbCrLf & _
       "Para mudar o ícone:" & vbCrLf & _
       "1. Clique com o botão direito no atalho" & vbCrLf & _
       "2. Escolha 'Propriedades'" & vbCrLf & _
       "3. Clique em 'Alterar ícone' e escolha um ícone personalizado", _
       vbInformation, "UniverseTeca CMS - Atalho Criado" 