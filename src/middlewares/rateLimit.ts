import rateLimit from "express-rate-limit";

type RateLimiterConfig = {
  windowMs: number;
  max: number;
  message: string;
};

const createRateLimiter = (config: RateLimiterConfig) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: config.message,
    },
  });
};

export const authLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // 5 tentativas
  message: "Muitas tentativas de login. Tente novamente em 5 minutos.",
});

export const refreshLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 20 refresh por 5 minutos
  message: "Muitas tentativas de refresh. Tente novamente em breve.",
});
