project(Playground LANGUAGES CXX)
message(STATUS "${PROJECT_NAME}")

add_executable(${PROJECT_NAME} "main.cpp")  # or your actual source files

# Link against the TimetableGen static library
target_link_libraries(${PROJECT_NAME} PRIVATE TimetableGen::TimetableGen)

# Also include its headers
target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_SOURCE_DIR}/TimetableGen/src
)