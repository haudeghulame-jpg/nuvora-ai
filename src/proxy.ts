import { NextResponse, type NextRequest } from "next/server";
import { localeCookieName } from "./i18n/config";
import { getLocaleFromPathname, resolveLocaleRedirect } from "./i18n/routing";

// Sends visitors without a language prefix to /ar (or the language they chose
// last), and remembers the language when they open a prefixed page.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const redirectTo = resolveLocaleRedirect(
    pathname,
    request.cookies.get(localeCookieName)?.value,
  );
  if (redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  const locale = getLocaleFromPathname(pathname);
  if (locale) {
    response.cookies.set(localeCookieName, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

export const config = {
  // Skip Next.js internals, API routes and files with an extension.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
