import { CookieOptions } from "express";

export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
});

export const getAccessTokenCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  path: "/",
  maxAge: 15 * 60 * 1000, // 15 minutos
});
