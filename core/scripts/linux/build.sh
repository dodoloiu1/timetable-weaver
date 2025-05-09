#!/bin/bash
set -e

# Set default build type to Debug
BUILD_TYPE="Debug"

# If the first argument is passed as build type, use it
if [[ ! -z "$1" ]]; then
  BUILD_TYPE="$1"
fi

# Validate that the build type is either Debug or Release
if [[ "$BUILD_TYPE" != "Debug" && "$BUILD_TYPE" != "Release" ]]; then
  echo "Warning: Invalid build type specified. Defaulting to Debug."
  BUILD_TYPE="Debug"
fi

# Create the build directory if it doesn't exist
if [[ ! -d "./build/" ]]; then
  mkdir build
fi

cd build

# Run cmake with the selected build type
cmake ..

# Build the project
cmake --build . --config $BUILD_TYPE -v --parallel
set +e
