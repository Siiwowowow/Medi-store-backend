// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */

//src/app/utils/cookie.ts
import { CookieOptions, Request } from "express";

const setCookie = (res: any, key: string, value: string, options: CookieOptions) => {
    res.cookie(key, value, options);
}

const getCookie = (req: Request, key: string) => {
    return req.cookies[key];
}

const clearCookie = (res: any, key: string, options: CookieOptions) => {
    res.clearCookie(key, options);
}

export const CookieUtils = {
    setCookie,
    getCookie,
    clearCookie,
}
