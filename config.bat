@echo off
title Configuração do UniverseTeca CMS
color 0b

echo ===============================================
echo      Configuração do UniverseTeca CMS
echo ===============================================
echo.
echo Este script irá configurar as variáveis de ambiente
echo necessárias para o funcionamento do UniverseTeca CMS.
echo.

REM Verifica se o arquivo .env.local existe
if exist .env.local (
    echo Um arquivo de configuração já existe.
    set /p OVERWRITE=Deseja sobrescrever? (S/N): 
    if /i "%OVERWRITE%" neq "S" goto :EOF
)

echo.
echo Por favor, forneça as seguintes informações do Supabase:
echo (Você pode encontrá-las no painel do Supabase em Configurações do Projeto)
echo.

set /p SUPABASE_URL=URL do Supabase (https://xxxxx.supabase.co): 
set /p SUPABASE_KEY=Chave Anônima (public) do Supabase: 

echo.
echo Salvando configurações...
echo.

(
echo NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_KEY%
) > .env.local

echo Configuração concluída com sucesso!
echo.
echo Para iniciar o sistema, execute o arquivo "start-universeteca.bat"
echo ou use o atalho na área de trabalho.
echo.
pause 