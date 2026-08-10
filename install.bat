@echo off
REM G2Band - 一键安装/启动（Windows）
REM 注意：这个脚本只在 macOS 上写好、没有在真实 Windows 机器上跑过测试。
REM whisper.cpp 在 Windows 上的编译方式（需要 Visual Studio Build Tools 或 MinGW）跟 macOS
REM 完全不同，这里不做自动编译，只检测 + 提示，写作模块不受影响，口语模块的本地转录功能
REM 在 whisper-cli.exe 不存在时会报错，需要手动参考 whisper.cpp 官方 Windows 编译说明。

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==================================
echo  G2Band - 安装/启动
echo ==================================

echo.
echo [1/6] 检查 Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Node.js。请先从下面的链接下载安装 LTS 版本，再重新运行本脚本：
  echo   https://nodejs.org/
  pause
  exit /b 1
) else (
  for /f "tokens=*" %%v in ('node -v') do echo Node.js 已安装：%%v
)

echo.
echo [2/6] 安装依赖（第一次会比较久）...
call npm install
if errorlevel 1 goto :error

echo.
echo [3/6] 检查本地语音识别引擎（whisper.cpp）...
if not exist "tools\whisper.cpp\build\bin\whisper-cli.exe" (
  echo 未找到 whisper-cli.exe。
  echo 口语模块的本地语音转录功能需要手动编译 whisper.cpp（Windows 上需要装
  echo Visual Studio Build Tools 或 MinGW + cmake），参考：
  echo   https://github.com/ggml-org/whisper.cpp#usage
  echo 写作模块不受影响，可以正常使用。
) else (
  echo 已编译，跳过。
)

echo.
echo [4/6] 初始化题库...
call npm run seed -w server
if errorlevel 1 goto :error

echo.
echo [5/6] 构建前端...
call npm run build
if errorlevel 1 goto :error

echo.
echo [6/6] 启动服务...
echo ==================================
echo  启动完成，浏览器会自动打开 http://localhost:3000
echo  关闭这个窗口会停止服务。
echo ==================================
set PORT=3000
set OPEN_BROWSER=1
start http://localhost:3000
call npm run start
goto :eof

:error
echo.
echo 安装过程中出错，请检查上面的报错信息。
pause
exit /b 1
