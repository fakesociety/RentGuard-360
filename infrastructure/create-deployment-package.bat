@echo off
REM ==============================================================================
REM RentGuard 360 - Create Deployment Package
REM ==============================================================================
REM Creates a ZIP file with all necessary files for deployment to a new AWS account
REM ==============================================================================

setlocal EnableDelayedExpansion

echo.
echo =====================================================
echo   RentGuard 360 - Deployment Package Creator
echo =====================================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."
set "DIST_DIR=%SCRIPT_DIR%dist"
set "LAMBDA_DIR=%PROJECT_DIR%\backend\lambdas"
set "OUTPUT_ZIP=%DIST_DIR%\RentGuard360-Deployment.zip"

REM Create dist folder if not exists
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

echo [1/4] Packaging Lambda functions...

REM Create temp folder for lambda files (will rename hyphens to underscores)
set "LAMBDA_TEMP=%DIST_DIR%\lambda_temp"
if exist "%LAMBDA_TEMP%" rmdir /s /q "%LAMBDA_TEMP%"
mkdir "%LAMBDA_TEMP%"

REM Copy all Lambda files to temp folder
copy "%LAMBDA_DIR%\*.py" "%LAMBDA_TEMP%\" >nul 2>nul
copy "%LAMBDA_DIR%\*.json" "%LAMBDA_TEMP%\" >nul 2>nul
copy "%LAMBDA_DIR%\*.txt" "%LAMBDA_TEMP%\" >nul 2>nul

REM Rename hyphen files to underscore (Python requires underscores in module names)
cd /d "%LAMBDA_TEMP%"
for %%f in (*-*.py) do (
    set "oldname=%%f"
    set "newname=!oldname:-=_!"
    if not "!oldname!"=="!newname!" (
        ren "%%f" "!newname!" 2>nul
        echo    Renamed: %%f -^> !newname!
    )
)
cd /d "%SCRIPT_DIR%"

REM Remove handler loader if exists (not needed with renamed files)
if exist "%LAMBDA_TEMP%\_handler_loader.py" del "%LAMBDA_TEMP%\_handler_loader.py"

REM Create lambdas.zip from temp folder
set "LAMBDA_ZIP=%DIST_DIR%\lambdas.zip"
if exist "%LAMBDA_ZIP%" del "%LAMBDA_ZIP%"

powershell -Command "Compress-Archive -Path '%LAMBDA_TEMP%\*' -DestinationPath '%LAMBDA_ZIP%' -Force"

REM Cleanup lambda temp folder
rmdir /s /q "%LAMBDA_TEMP%"

if exist "%LAMBDA_ZIP%" (
    echo    [OK] lambdas.zip created with Python-compatible filenames
) else (
    echo    [ERROR] Failed to create lambdas.zip
    exit /b 1
)

echo [2/4] Collecting infrastructure files...

REM Create temp folder for package
set "TEMP_PKG=%DIST_DIR%\package_temp"
if exist "%TEMP_PKG%" rmdir /s /q "%TEMP_PKG%"
mkdir "%TEMP_PKG%"
mkdir "%TEMP_PKG%\infrastructure"
mkdir "%TEMP_PKG%\infrastructure\dist"
mkdir "%TEMP_PKG%\frontend"
mkdir "%TEMP_PKG%\backend"
mkdir "%TEMP_PKG%\backend\api-gateway"
mkdir "%TEMP_PKG%\backend\step-functions"
mkdir "%TEMP_PKG%\docs"

REM Copy infrastructure files
copy "%SCRIPT_DIR%cloudformation.yaml" "%TEMP_PKG%\infrastructure\" >nul
copy "%SCRIPT_DIR%deploy-cloudshell.sh" "%TEMP_PKG%\infrastructure\" >nul
copy "%SCRIPT_DIR%config.env.template" "%TEMP_PKG%\infrastructure\" >nul
copy "%SCRIPT_DIR%deploy.ps1" "%TEMP_PKG%\infrastructure\" >nul 2>nul
copy "%LAMBDA_ZIP%" "%TEMP_PKG%\infrastructure\dist\" >nul

REM Copy handoff documentation (preferred)
if exist "%PROJECT_DIR%\DEPLOYMENT_INSTRUCTIONS.md" copy "%PROJECT_DIR%\DEPLOYMENT_INSTRUCTIONS.md" "%TEMP_PKG%\" >nul

REM Copy API definition + workflow files (for source-control/handoff completeness)
if exist "%PROJECT_DIR%\backend\api-gateway\RentGuardAPI-prod-swagger-apigateway.json" copy "%PROJECT_DIR%\backend\api-gateway\RentGuardAPI-prod-swagger-apigateway.json" "%TEMP_PKG%\backend\api-gateway\" >nul
if exist "%PROJECT_DIR%\backend\step-functions\workflow.json" copy "%PROJECT_DIR%\backend\step-functions\workflow.json" "%TEMP_PKG%\backend\step-functions\" >nul

REM Optional: include HTML API documentation
if exist "%PROJECT_DIR%\docs\api_documentation.html" copy "%PROJECT_DIR%\docs\api_documentation.html" "%TEMP_PKG%\docs\" >nul

REM Copy frontend template
copy "%PROJECT_DIR%\frontend\.env.template" "%TEMP_PKG%\frontend\" >nul

echo    [OK] Infrastructure files collected

echo [3/4] Creating deployment package...

REM Remove old package if exists
if exist "%OUTPUT_ZIP%" del "%OUTPUT_ZIP%"

REM Create final ZIP
powershell -Command "Compress-Archive -Path '%TEMP_PKG%\*' -DestinationPath '%OUTPUT_ZIP%' -Force"

echo    [OK] Package created

echo [4/4] Cleaning up...
rmdir /s /q "%TEMP_PKG%"
echo    [OK] Cleanup complete

echo.
echo =====================================================
echo   SUCCESS!
echo =====================================================
echo.
echo   Package created:
echo   %OUTPUT_ZIP%
echo.
echo   Contents:
echo   - infrastructure/cloudformation.yaml
echo   - infrastructure/deploy-cloudshell.sh
echo   - infrastructure/deploy.ps1
echo   - infrastructure/config.env.template
echo   - DEPLOYMENT_INSTRUCTIONS.md
echo   - infrastructure/dist/lambdas.zip
echo   - frontend/.env.template
echo   - backend/api-gateway/RentGuardAPI-prod-swagger-apigateway.json
echo   - backend/step-functions/workflow.json
echo   - docs/api_documentation.html
echo.
echo   To deploy:
echo   1. Upload ZIP to AWS CloudShell
echo   2. unzip RentGuard360-Deployment.zip
echo   3. cd infrastructure
echo   4. cp config.env.template config.env
echo   5. Edit config.env with your values
echo   6. chmod +x deploy-cloudshell.sh
echo   7. ./deploy-cloudshell.sh
echo.
echo =====================================================
echo.

endlocal
