@echo off
echo ===================================================
echo    Iniciando UniverseTeca CMS - Aguarde...
echo ===================================================
echo.

REM Ir para o diretório do projeto
cd /d %~dp0

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js não encontrado! Por favor, instale o Node.js antes de continuar.
    echo Pressione qualquer tecla para sair...
    pause >nul
    exit /b 1
)

REM Verificar se o arquivo de configuração existe
if not exist .env.local (
    echo [AVISO] Arquivo de configuração não encontrado.
    echo Iniciando o assistente de configuração...
    echo.
    call config.bat
    
    if not exist .env.local (
        echo [ERRO] Configuração não concluída. Não é possível continuar.
        echo Pressione qualquer tecla para sair...
        pause >nul
        exit /b 1
    )
)

REM Verificar dependências instaladas
if not exist node_modules (
    echo Instalando dependências do projeto...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] Falha ao instalar dependências!
        echo Pressione qualquer tecla para sair...
        pause >nul
        exit /b 1
    )
)

REM Verificar se é a primeira execução e oferecer criar um atalho
if not exist .shortcut_created (
    echo Deseja criar um atalho na Área de Trabalho? (S/N)
    set /p CREATE_SHORTCUT=
    if /i "%CREATE_SHORTCUT%"=="S" (
        echo Criando atalho...
        cscript //nologo create-shortcut.vbs
        echo.> .shortcut_created
    )
)

REM Abrir o navegador padrão após alguns segundos
start "" cmd /c "timeout /t 5 /nobreak && start http://localhost:3000"

REM Iniciar o servidor Next.js
echo Iniciando o servidor - Um navegador será aberto automaticamente...
call npm run dev

REM Se o servidor for interrompido
echo.
echo ===================================================
echo  Servidor encerrado. 
echo  Para iniciar novamente, execute este arquivo.
echo ===================================================
pause 