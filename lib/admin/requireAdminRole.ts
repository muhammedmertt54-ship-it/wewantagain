import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../supabaseAdmin";

export type AdminRole =
  | "owner"
  | "admin"
  | "moderator";

type AdminAuthSuccess = {
  ok: true;

  user: {
    id: string;
    email: string | null;
  };

  admin: {
    userId: string;
    role: AdminRole;
  };
};

type AdminAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AdminAuthResult =
  | AdminAuthSuccess
  | AdminAuthFailure;

const VALID_ROLES: AdminRole[] = [
  "owner",
  "admin",
  "moderator",
];

function isAdminRole(
  value: unknown
): value is AdminRole {
  return (
    typeof value === "string" &&
    VALID_ROLES.includes(
      value as AdminRole
    )
  );
}

function unauthorized(
  message =
    "Authentication required."
): AdminAuthFailure {
  return {
    ok: false,

    response:
      NextResponse.json(
        {
          error: message,
        },
        {
          status: 401,
        }
      ),
  };
}

function forbidden(
  message =
    "You do not have permission to perform this action."
): AdminAuthFailure {
  return {
    ok: false,

    response:
      NextResponse.json(
        {
          error: message,
        },
        {
          status: 403,
        }
      ),
  };
}

export async function requireAdminRole(
  request: NextRequest,
  allowedRoles: AdminRole[] = [
    "owner",
    "admin",
    "moderator",
  ]
): Promise<AdminAuthResult> {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return unauthorized();
    }

    const accessToken =
      authorization
        .slice(7)
        .trim();

    if (!accessToken) {
      return unauthorized();
    }

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      return unauthorized(
        "Invalid or expired admin session."
      );
    }

    const {
      data:
        adminRow,
      error:
        adminError,
    } =
      await supabaseAdmin
        .from("admins")
        .select(
          `
          user_id,
          role
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      adminError
    ) {
      console.error(
        "Admin role lookup error:",
        adminError
      );

      return {
        ok: false,

        response:
          NextResponse.json(
            {
              error:
                "Admin authorization could not be verified.",
            },
            {
              status: 500,
            }
          ),
      };
    }

    if (
      !adminRow
    ) {
      return forbidden(
        "This account does not have admin access."
      );
    }

    if (
      !isAdminRole(
        adminRow.role
      )
    ) {
      console.error(
        "Invalid admin role:",
        adminRow.role
      );

      return forbidden(
        "This admin account has an invalid role."
      );
    }

    if (
      !allowedRoles.includes(
        adminRow.role
      )
    ) {
      return forbidden(
        `This action requires one of these roles: ${allowedRoles.join(
          ", "
        )}.`
      );
    }

    return {
      ok: true,

      user: {
        id:
          user.id,

        email:
          user.email ??
          null,
      },

      admin: {
        userId:
          adminRow.user_id,

        role:
          adminRow.role,
      },
    };
  } catch (error) {
    console.error(
      "Admin authorization error:",
      error
    );

    return {
      ok: false,

      response:
        NextResponse.json(
          {
            error:
              "Admin authorization failed.",
          },
          {
            status: 500,
          }
        ),
    };
  }
}

export function isOwner(
  role: AdminRole
) {
  return role === "owner";
}

export function isAdminOrOwner(
  role: AdminRole
) {
  return (
    role === "owner" ||
    role === "admin"
  );
}

export function isModeratorOrHigher(
  role: AdminRole
) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "moderator"
  );
}