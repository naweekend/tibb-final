#include <jni.h>
#include <string>
#include <vector>
#include "llama.h"
#include "whisper.h"

struct TibbLlamaCtx {
    llama_model *model = nullptr;
    llama_context *ctx = nullptr;
};

extern "C" JNIEXPORT jlong JNICALL
Java_pk_tibb_clinical_ai_LlamaBridgePlugin_nativeLoadLlama(
        JNIEnv *env, jobject, jstring modelPath, jint nCtx, jint threads, jboolean useMmap) {
    const char *path = env->GetStringUTFChars(modelPath, nullptr);
    llama_backend_init();

    llama_model_params mparams = llama_model_default_params();
    mparams.use_mmap = useMmap;
    mparams.use_mlock = false; // Do not pin RAM on 2GB-4GB phones

    llama_model *model = llama_model_load_from_file(path, mparams);
    env->ReleaseStringUTFChars(modelPath, path);
    if (!model) return 0;

    llama_context_params cparams = llama_context_default_params();
    cparams.n_ctx = nCtx;
    cparams.n_threads = threads;
    cparams.n_threads_batch = threads;

    llama_context *ctx = llama_init_from_model(model, cparams);
    if (!ctx) {
        llama_model_free(model);
        return 0;
    }

    auto *bundle = new TibbLlamaCtx{model, ctx};
    return reinterpret_cast<jlong>(bundle);
}

extern "C" JNIEXPORT jstring JNICALL
Java_pk_tibb_clinical_ai_LlamaBridgePlugin_nativeGenerate(
        JNIEnv *env, jobject, jlong handle, jstring jprompt, jint maxTokens, jfloat temp) {
    auto *bundle = reinterpret_cast<TibbLlamaCtx *>(handle);
    if (!bundle || !bundle->ctx || !bundle->model) {
        return env->NewStringUTF("");
    }
    const char *prompt = env->GetStringUTFChars(jprompt, nullptr);
    const llama_vocab *vocab = llama_model_get_vocab(bundle->model);

    std::vector<llama_token> tokens(2048);
    int n_tokens = llama_tokenize(vocab, prompt, strlen(prompt), tokens.data(), tokens.size(), true, true);
    env->ReleaseStringUTFChars(jprompt, prompt);
    if (n_tokens < 0) return env->NewStringUTF("");
    tokens.resize(n_tokens);

    llama_batch batch = llama_batch_get_one(tokens.data(), tokens.size());
    if (llama_decode(bundle->ctx, batch) != 0) {
        return env->NewStringUTF("");
    }

    llama_sampler *sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(temp));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(42));

    std::string result;
    for (int i = 0; i < maxTokens; ++i) {
        llama_token tok = llama_sampler_sample(sampler, bundle->ctx, -1);
        if (llama_vocab_is_eog(vocab, tok)) break;
        char buf[128];
        int len = llama_token_to_piece(vocab, tok, buf, sizeof(buf), 0, true);
        if (len > 0) result.append(buf, len);
        llama_batch next = llama_batch_get_one(&tok, 1);
        if (llama_decode(bundle->ctx, next) != 0) break;
    }
    llama_sampler_free(sampler);
    return env->NewStringUTF(result.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_pk_tibb_clinical_ai_LlamaBridgePlugin_nativeFreeLlama(JNIEnv *, jobject, jlong handle) {
    auto *bundle = reinterpret_cast<TibbLlamaCtx *>(handle);
    if (!bundle) return;
    if (bundle->ctx) llama_free(bundle->ctx);
    if (bundle->model) llama_model_free(bundle->model);
    delete bundle;
    llama_backend_free();
}

extern "C" JNIEXPORT jlong JNICALL
Java_pk_tibb_clinical_ai_WhisperBridgePlugin_nativeLoadWhisper(JNIEnv *env, jobject, jstring modelPath) {
    const char *path = env->GetStringUTFChars(modelPath, nullptr);
    struct whisper_context_params cparams = whisper_context_default_params();
    struct whisper_context *ctx = whisper_init_from_file_with_params(path, cparams);
    env->ReleaseStringUTFChars(modelPath, path);
    return reinterpret_cast<jlong>(ctx);
}

extern "C" JNIEXPORT jstring JNICALL
Java_pk_tibb_clinical_ai_WhisperBridgePlugin_nativeTranscribePcm(
        JNIEnv *env, jobject, jlong handle, jfloatArray pcmArray, jstring lang, jint threads) {
    auto *ctx = reinterpret_cast<struct whisper_context *>(handle);
    if (!ctx) return env->NewStringUTF("");

    jsize len = env->GetArrayLength(pcmArray);
    jfloat *pcm = env->GetFloatArrayElements(pcmArray, nullptr);
    const char *clang = env->GetStringUTFChars(lang, nullptr);

    whisper_full_params wparams = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    wparams.n_threads = threads;
    wparams.language = clang;
    wparams.print_progress = false;

    std::string out;
    if (whisper_full(ctx, wparams, pcm, len) == 0) {
        int n_seg = whisper_full_n_segments(ctx);
        for (int i = 0; i < n_seg; ++i) {
            out += whisper_full_get_segment_text(ctx, i);
        }
    }
    env->ReleaseStringUTFChars(lang, clang);
    env->ReleaseFloatArrayElements(pcmArray, pcm, JNI_ABORT);
    return env->NewStringUTF(out.c_str());
}

extern "C" JNIEXPORT void JNICALL
Java_pk_tibb_clinical_ai_WhisperBridgePlugin_nativeFreeWhisper(JNIEnv *, jobject, jlong handle) {
    auto *ctx = reinterpret_cast<struct whisper_context *>(handle);
    if (ctx) whisper_free(ctx);
}
