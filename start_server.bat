@echo off
title NexusCall DBMS - PostgreSQL JDBC Server
echo ========================================================
echo  NexusCall DBMS - PostgreSQL Relational Call Center Server
echo ========================================================
echo.
echo Starting Server with native PostgreSQL JDBC endpoints:
echo   - Web App UI:        http://localhost:3000/
echo   - SQL Terminal API:  http://localhost:3000/api/sql/execute
echo   - Tables API:        http://localhost:3000/api/tables/
echo.
start http://localhost:3000

node server.js
if %ERRORLEVEL% NEQ 0 (
    echo [Notice] Node.js failed, falling back to Python HTTP server...
    py -m http.server 3000
)

pause
