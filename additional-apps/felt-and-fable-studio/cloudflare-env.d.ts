declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    FELT_ASSET_ADMIN_TOKEN?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
