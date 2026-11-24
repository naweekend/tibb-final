cmake_minimum_required(VERSION 3.22.1)
project("tibb_ai_jni")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_BUILD_TYPE Release)

# Point these to your cloned llama.cpp and whisper.cpp folders inside android/app/src/main/cpp/
add_subdirectory(llama.cpp llama_build EXCLUDE_FROM_ALL)
add_subdirectory(whisper.cpp whisper_build EXCLUDE_FROM_ALL)

add_library(tibb_ai_jni SHARED tibb_llama_jni.cpp)

target_link_libraries(tibb_ai_jni
    llama
    whisper
    android
    log
)
