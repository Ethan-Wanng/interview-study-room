declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_BOOTSTRAP_HASH?: string;
    AUTO_QUESTION_API_TOKEN?: string;
    DEEPSEEK_API_KEY?: string;
    GEMINI_API_KEY?: string;
    GEMINI_PROXY_URL?: string;
    GEMINI_ANYTLS_NODE?: string;
  }
}
