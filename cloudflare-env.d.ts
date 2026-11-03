declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    INTRANET_BASE_URL?: string;
    INTRANET_AVISOS_TOKEN?: string;
    HOSTNAME_RESOLVER_URL?: string;
    CENTRAL_AD_URL?: string;
    CENTRAL_AD_DOMAIN?: string;
    CENTRAL_AD_BASE_DN?: string;
    CENTRAL_AD_USER_FILTER?: string;
    CENTRAL_AD_ALLOWED_GROUPS?: string;
    CENTRAL_AD_NTI_GROUPS?: string;
    CENTRAL_AD_GECOM_GROUPS?: string;
    CENTRAL_AD_ALLOW_INSECURE_LDAP?: string;
    CENTRAL_AD_TLS_REJECT_UNAUTHORIZED?: string;
    CENTRAL_AUTH_SECRET?: string;
  }
}
