import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function getClientIp(request: NextRequest) {
  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")[0]
      ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp =
    request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim();
  }

  return null;
}

function blockedResponse() {
  return new NextResponse(
    `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Access Denied | WeWantAgain</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        linear-gradient(
          180deg,
          #f5f3ff 0%,
          #ffffff 100%
        );
      color: #0f172a;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
    }

    .card {
      width: 100%;
      max-width: 520px;
      padding: 42px 32px;
      text-align: center;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 28px;
      box-shadow:
        0 20px 60px rgba(124, 58, 237, 0.12);
    }

    .logo {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -1px;
    }

    .logo span {
      color: #7c3aed;
    }

    .tagline {
      margin-top: 6px;
      color: #94a3b8;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .icon {
      width: 82px;
      height: 82px;
      margin: 32px auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #fee2e2;
      font-size: 38px;
    }

    h1 {
      margin: 24px 0 0;
      font-size: 34px;
      font-weight: 900;
    }

    p {
      margin: 14px auto 0;
      max-width: 390px;
      color: #64748b;
      font-size: 15px;
      line-height: 1.7;
    }

    .code {
      display: inline-block;
      margin-top: 24px;
      padding: 8px 14px;
      border-radius: 999px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
    }
  </style>
</head>

<body>
  <div class="card">
    <div class="logo">
      WEWANT<span>AGAIN</span>
    </div>

    <div class="tagline">
      YOUR VOICE. THEIR ATTENTION.
    </div>

    <div class="icon">
      ⛔
    </div>

    <h1>
      Access denied
    </h1>

    <p>
      Access from this network has been restricted
      by WeWantAgain moderation.
    </p>

    <div class="code">
      HTTP 403
    </div>
  </div>
</body>
</html>
`,
    {
      status: 403,

      headers: {
        "Content-Type":
          "text/html; charset=utf-8",

        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function proxy(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  /*
   * Admin routes stay accessible.
   *
   * This prevents an accidental IP ban
   * from locking the administrator out
   * of the panel needed to remove it.
   *
   * Admin API routes still require the
   * admin authentication checks we
   * already created.
   */
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/")
  ) {
    return NextResponse.next();
  }

  const ipAddress =
    getClientIp(request);

  /*
   * If an IP cannot be determined,
   * fail open instead of taking the
   * entire website offline.
   */
  if (!ipAddress) {
    return NextResponse.next();
  }

  try {
    const {
      data: bannedIp,
      error,
    } = await supabaseAdmin
      .from("ip_bans")
      .select("id")
      .eq(
        "ip_address",
        ipAddress
      )
      .maybeSingle();

    /*
     * If Supabase temporarily fails,
     * keep the site available.
     */
    if (error) {
      console.error(
        "IP ban lookup failed:",
        error
      );

      return NextResponse.next();
    }

    if (bannedIp) {
      return blockedResponse();
    }

    return NextResponse.next();
  } catch (error) {
    console.error(
      "Proxy IP check failed:",
      error
    );

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Check normal pages and APIs,
     * but skip Next.js static assets
     * and common public image files.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};