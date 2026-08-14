import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  AdminRole,
  requireAdminRole,
} from "../../../../../lib/admin/requireAdminRole";

type UserAction =
  | "ban-user"
  | "unban-user"
  | "delete-user"
  | "ban-ip"
  | "unban-ip"
  | "force-logout"
  | "make-admin"
  | "remove-admin"
  | "set-admin-role";

async function writeAuditLog({
  adminUserId,
  targetUserId,
  action,
  details,
}: {
  adminUserId: string;
  targetUserId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin
    .from("admin_audit_logs")
    .insert({
      admin_user_id: adminUserId,
      target_user_id: targetUserId ?? null,
      action,
      details: details ?? null,
    });

  if (error) {
    console.error(
      "Audit log error:",
      error
    );
  }
}


const VALID_ADMIN_ROLES: AdminRole[] = [
  "owner",
  "admin",
  "moderator",
];

function isAdminRole(
  value: unknown
): value is AdminRole {
  return (
    typeof value === "string" &&
    VALID_ADMIN_ROLES.includes(
      value as AdminRole
    )
  );
}

function actionAllowedForRole(
  role: AdminRole,
  action: UserAction
) {
  if (role === "owner") {
    return true;
  }

  if (role === "admin") {
    return [
      "ban-user",
      "unban-user",
      "ban-ip",
      "unban-ip",
      "force-logout",
    ].includes(action);
  }

  return [
    "ban-user",
    "unban-user",
    "force-logout",
  ].includes(action);
}

async function getTargetAdminRole(
  userId: string
): Promise<AdminRole | null> {
  if (!userId) {
    return null;
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Target admin role lookup error:",
      error
    );

    throw new Error(
      "Target admin role could not be verified."
    );
  }

  if (!data) {
    return null;
  }

  if (!isAdminRole(data.role)) {
    throw new Error(
      "Target account has an invalid admin role."
    );
  }

  return data.role;
}

function canManageTargetAdmin({
  actorRole,
  targetRole,
}: {
  actorRole: AdminRole;
  targetRole: AdminRole | null;
}) {
  if (!targetRole) {
    return true;
  }

  if (targetRole === "owner") {
    return false;
  }

  if (actorRole === "owner") {
    return true;
  }

  if (
    actorRole === "admin" &&
    targetRole === "moderator"
  ) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const auth =
      await requireAdminRole(
        request,
        [
          "owner",
          "admin",
          "moderator",
        ]
      );

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();

    const action =
      typeof body?.action === "string"
        ? (body.action as UserAction)
        : null;

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const ipAddress =
      typeof body?.ipAddress === "string"
        ? body.ipAddress.trim()
        : "";

    const reason =
      typeof body?.reason === "string"
        ? body.reason.trim()
        : "";

    const requestedRole =
      typeof body?.role === "string"
        ? body.role.trim()
        : "";

    const allowedActions: UserAction[] = [
      "ban-user",
      "unban-user",
      "delete-user",
      "ban-ip",
      "unban-ip",
      "force-logout",
      "make-admin",
      "remove-admin",
      "set-admin-role",
    ];

    if (
      !action ||
      !allowedActions.includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }


    if (
      !actionAllowedForRole(
        auth.admin.role,
        action
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Your admin role does not have permission to perform this action.",
          role:
            auth.admin.role,
          action,
        },
        {
          status: 403,
        }
      );
    }

    let targetAdminRole:
      AdminRole | null = null;

    if (userId) {
      try {
        targetAdminRole =
          await getTargetAdminRole(
            userId
          );
      } catch (error) {
        console.error(error);

        return NextResponse.json(
          {
            error:
              "Target admin role could not be verified.",
          },
          {
            status: 500,
          }
        );
      }
    }

    const protectedUserActions:
      UserAction[] = [
        "ban-user",
        "unban-user",
        "delete-user",
        "force-logout",
      ];

    if (
      userId &&
      protectedUserActions.includes(
        action
      ) &&
      !canManageTargetAdmin({
        actorRole:
          auth.admin.role,
        targetRole:
          targetAdminRole,
      })
    ) {
      return NextResponse.json(
        {
          error:
            "Your role cannot manage this admin account.",
        },
        {
          status: 403,
        }
      );
    }

    // BAN USER
    if (action === "ban-user") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot ban your own admin account.",
          },
          { status: 400 }
        );
      }

      const {
        data: bannedUser,
        error: banError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration: "876000h",
          }
        );

      if (banError) {
        console.error(
          "User ban error:",
          banError
        );

        return NextResponse.json(
          {
            error:
              "User could not be banned.",
            details:
              banError.message,
          },
          { status: 500 }
        );
      }

      // AÃ§Ä±k oturumlarÄ± da uygulama tarafÄ±nda iptal et.
      const revokedBefore =
        new Date().toISOString();

      const {
        error: revokeError,
      } = await supabaseAdmin
        .from("user_session_controls")
        .upsert(
          {
            user_id: userId,
            revoked_before:
              revokedBefore,
            updated_by:
              auth.user.id,
            updated_at:
              revokedBefore,
          },
          {
            onConflict: "user_id",
          }
        );

      if (revokeError) {
        console.error(
          "Session revoke marker error:",
          revokeError
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId,
        action:
          "ban-user",
        details: {
          reason:
            reason || null,
          banned_until:
            bannedUser.user
              ?.banned_until ??
            null,
          sessions_revoked:
            !revokeError,
        },
      });

      return NextResponse.json({
        success: true,
        action: "ban-user",
      });
    }

    // UNBAN USER
    if (action === "unban-user") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      const {
        error: unbanError,
      } =
        await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            ban_duration: "none",
          }
        );

      if (unbanError) {
        console.error(
          "User unban error:",
          unbanError
        );

        return NextResponse.json(
          {
            error:
              "User could not be unbanned.",
            details:
              unbanError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId,
        action:
          "unban-user",
      });

      return NextResponse.json({
        success: true,
        action: "unban-user",
      });
    }

    // DELETE USER
    if (action === "delete-user") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot delete your own admin account.",
          },
          { status: 400 }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId,
        action:
          "delete-user",
      });

      const {
        error: deleteError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          userId
        );

      if (deleteError) {
        console.error(
          "User delete error:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              "User could not be deleted.",
            details:
              deleteError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "delete-user",
      });
    }

    // FORCE LOGOUT
    if (action === "force-logout") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot force logout your own admin account.",
          },
          { status: 400 }
        );
      }

      const now =
        new Date().toISOString();

      const {
        data: controlRow,
        error: forceLogoutError,
      } = await supabaseAdmin
        .from("user_session_controls")
        .upsert(
          {
            user_id:
              userId,

            revoked_before:
              now,

            updated_by:
              auth.user.id,

            updated_at:
              now,
          },
          {
            onConflict:
              "user_id",
          }
        )
        .select(
          "user_id, revoked_before"
        )
        .single();

      if (forceLogoutError) {
        console.error(
          "Force logout error:",
          forceLogoutError
        );

        return NextResponse.json(
          {
            error:
              "User sessions could not be ended.",
            details:
              forceLogoutError.message,
          },
          { status: 500 }
        );
      }

      if (!controlRow) {
        return NextResponse.json(
          {
            error:
              "Force logout marker was not saved.",
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId,
        action:
          "force-logout",
        details: {
          revoked_before:
            controlRow.revoked_before,
        },
      });

      return NextResponse.json({
        success: true,
        action:
          "force-logout",
        revokedBefore:
          controlRow.revoked_before,
      });
    }

    // MAKE ADMIN
    if (action === "make-admin") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      if (
        targetAdminRole ===
        "owner"
      ) {
        return NextResponse.json(
          {
            error:
              "Owner role cannot be changed through this action.",
          },
          {
            status: 403,
          }
        );
      }

      const {
        error: makeAdminError,
      } = await supabaseAdmin
        .from("admins")
        .upsert(
          {
            user_id:
              userId,
            role:
              "admin",
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (makeAdminError) {
        console.error(
          "Make admin error:",
          makeAdminError
        );

        return NextResponse.json(
          {
            error:
              "Admin permission could not be granted.",
            details:
              makeAdminError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId,
        action:
          "make-admin",
        details: {
          previous_role:
            targetAdminRole,
          new_role:
            "admin",
          actor_role:
            auth.admin.role,
        },
      });

      return NextResponse.json({
        success: true,
        action: "make-admin",
      });
    }


    // SET ADMIN ROLE
    if (
      action ===
      "set-admin-role"
    ) {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        userId ===
        auth.user.id
      ) {
        return NextResponse.json(
          {
            error:
              "You cannot change your own owner role.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        requestedRole !==
          "admin" &&
        requestedRole !==
          "moderator"
      ) {
        return NextResponse.json(
          {
            error:
              "Role must be admin or moderator.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        targetAdminRole ===
        "owner"
      ) {
        return NextResponse.json(
          {
            error:
              "Owner role cannot be changed.",
          },
          {
            status: 403,
          }
        );
      }

      const {
        error:
          roleUpdateError,
      } = await supabaseAdmin
        .from("admins")
        .upsert(
          {
            user_id:
              userId,
            role:
              requestedRole,
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (
        roleUpdateError
      ) {
        console.error(
          "Admin role update error:",
          roleUpdateError
        );

        return NextResponse.json(
          {
            error:
              "Admin role could not be updated.",
            details:
              roleUpdateError.message,
          },
          {
            status: 500,
          }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId,
        action:
          "set-admin-role",
        details: {
          previous_role:
            targetAdminRole,
          new_role:
            requestedRole,
          actor_role:
            auth.admin.role,
        },
      });

      return NextResponse.json({
        success: true,
        action:
          "set-admin-role",
        role:
          requestedRole,
      });
    }

    // REMOVE ADMIN
    if (action === "remove-admin") {
      if (!userId) {
        return NextResponse.json(
          {
            error:
              "User ID is required.",
          },
          { status: 400 }
        );
      }

      if (userId === auth.user.id) {
        return NextResponse.json(
          {
            error:
              "You cannot remove your own admin permission.",
          },
          { status: 400 }
        );
      }

      if (
        targetAdminRole ===
        "owner"
      ) {
        return NextResponse.json(
          {
            error:
              "Owner permission cannot be removed.",
          },
          {
            status: 403,
          }
        );
      }

      const {
        error: removeAdminError,
      } = await supabaseAdmin
        .from("admins")
        .delete()
        .eq(
          "user_id",
          userId
        );

      if (removeAdminError) {
        console.error(
          "Remove admin error:",
          removeAdminError
        );

        return NextResponse.json(
          {
            error:
              "Admin permission could not be removed.",
            details:
              removeAdminError.message,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId,
        action:
          "remove-admin",
        details: {
          removed_role:
            targetAdminRole,
          actor_role:
            auth.admin.role,
        },
      });

      return NextResponse.json({
        success: true,
        action:
          "remove-admin",
      });
    }

    // BAN IP
    if (action === "ban-ip") {
      if (!ipAddress) {
        return NextResponse.json(
          {
            error:
              "IP address is required.",
          },
          { status: 400 }
        );
      }

      const {
        data: bannedIp,
        error: banIpError,
      } = await supabaseAdmin
        .from("ip_bans")
        .upsert(
          {
            ip_address:
              ipAddress,

            reason:
              reason || null,

            banned_by:
              auth.user.id,
          },
          {
            onConflict:
              "ip_address",
          }
        )
        .select(
          "id, ip_address, reason, banned_by, created_at"
        )
        .single();

      if (banIpError) {
        console.error(
          "IP ban error:",
          banIpError
        );

        return NextResponse.json(
          {
            error:
              "IP address could not be banned.",
            details:
              banIpError.message,
            code:
              banIpError.code,
          },
          { status: 500 }
        );
      }

      if (!bannedIp) {
        return NextResponse.json(
          {
            error:
              "IP ban was not saved.",
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId || null,
        action:
          "ban-ip",
        details: {
          ip_address:
            bannedIp.ip_address,
          reason:
            reason || null,
        },
      });

      return NextResponse.json({
        success: true,
        action: "ban-ip",
        ipAddress:
          bannedIp.ip_address,
      });
    }

    // UNBAN IP
    if (action === "unban-ip") {
      if (!ipAddress) {
        return NextResponse.json(
          {
            error:
              "IP address is required.",
          },
          { status: 400 }
        );
      }

      const {
        data: deletedIps,
        error: unbanIpError,
      } = await supabaseAdmin
        .from("ip_bans")
        .delete()
        .eq(
          "ip_address",
          ipAddress
        )
        .select(
          "id, ip_address"
        );

      if (unbanIpError) {
        console.error(
          "IP unban error:",
          unbanIpError
        );

        return NextResponse.json(
          {
            error:
              "IP address could not be unbanned.",
            details:
              unbanIpError.message,
            code:
              unbanIpError.code,
          },
          { status: 500 }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,
        targetUserId:
          userId || null,
        action:
          "unban-ip",
        details: {
          ip_address:
            ipAddress,
          removed:
            (deletedIps?.length ??
              0) > 0,
        },
      });

      return NextResponse.json({
        success: true,
        action: "unban-ip",
        ipAddress,
      });
    }

    return NextResponse.json(
      {
        error:
          "Unknown action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Admin user manage API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}