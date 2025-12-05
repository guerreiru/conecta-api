export const AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRY: "15m",
  REFRESH_TOKEN_EXPIRY: "7d",
  REFRESH_TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  SALT_ROUNDS: 10,
  ERRORS: {
    INVALID_CREDENTIALS: "Email ou senha incorretos",
    TOKEN_MISSING: "Token ausente",
    TOKEN_INVALID: "Token inválido",
    TOKEN_EXPIRED: "Token expirado",
    REFRESH_TOKEN_EXPIRED: "Refresh token expirado",
    USER_NOT_FOUND: "Usuário não encontrado",
    UNAUTHORIZED: "Não autorizado",
  },
} as const;
