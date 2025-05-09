@echo off

:: Check if argument is passed
set BUILD_TYPE=%1

:: Validate the build type argument
if "%BUILD_TYPE%"=="" (
    echo Build type not set. Defaulting to Debug.
    set BUILD_TYPE=Debug
)

:: Validate that build type is either Debug or Release
if not "%BUILD_TYPE%"=="Debug" if not "%BUILD_TYPE%"=="Release" (
    echo Warning: Invalid build type specified. Defaulting to Debug.
    set BUILD_TYPE=Debug
)

:: Create the build directory if it doesn't exist
if not exist "build" (
    mkdir build
)

cd build


:: Run cmake with the selected build type
cmake  ..

:: Build the project
cmake --build . --config %BUILD_TYPE% -v --parallel 
