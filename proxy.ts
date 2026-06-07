import { NextRequest, NextResponse } from "next/server";

const REALM = "Snazzy Garfield Practice Player";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`
    }
  });
}

function hasValidCredentials(request: NextRequest) {
  const password = process.env.BAND_ACCESS_PASSWORD;

  if (!password) {
    return true;
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Basic ")) {
    return false;
  }

  try {
    const [, providedPassword] = atob(authorization.slice("Basic ".length)).split(
      ":"
    );

    return providedPassword === password;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  if (!hasValidCredentials(request)) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"
  ]
};
