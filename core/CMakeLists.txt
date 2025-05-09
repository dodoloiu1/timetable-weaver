cmake_minimum_required(VERSION 3.18)
project(TimetableWeaverCore VERSION 0.0.1 LANGUAGES CXX)
message(STATUS "${PROJECT_NAME} version: ${PROJECT_VERSION}")

add_subdirectory(TimetableGen)
add_subdirectory(Playground)