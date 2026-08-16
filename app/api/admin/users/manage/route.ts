import { NextRequest } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  AdminRole,
} from "../../../../../lib/admin/requireAdminRole";
import {
  secureAdminApi,
} from "../../../../../lib/security/secureAdminApi";
import {
  parseJsonBody,
  secureJson,
} from "../../../../../lib/security/requestSecurity";

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

const MAX_BODY_BYTES =
  12_000;

const ADMIN_ACTION_RATE_LIMIT =
  20;

const ADMIN_ACTION_RATE_WINDOW_MS =
  60_000;

type ManageUserBody = {
  action?: unknown;
  userId?: unknown;
  ipAddress?: unknown;
  reason?: unknown;
  role?: unknown;
};

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
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-users-manage",

        allowedRoles: [
          "owner",
          "admin",
          "moderator",
        ],

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            ADMIN_ACTION_RATE_LIMIT,

          windowMs:
            ADMIN_ACTION_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
    admin,
  } = security;

  try {
    const parsed =
      await parseJsonBody<ManageUserBody>(
        request,
        {
          maxBytes:
            MAX_BODY_BYTES,
        }
      );

    if (!parsed.ok) {
      return secureJson(
        {
          error:
            parsed.error,
          request_id:
            requestId,
        },
        {
          status:
            parsed.status,
          requestId,
        }
      );
    }

    const body =
      parsed.body;

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
      return secureJson(
        { error: "Invalid action." },
        { status: 400, requestId }
      );
    }


    if (
      !actionAllowedForRole(
        admin.role,
        action
      )
    ) {
      return secureJson(
        {
          error:
            "Your admin role does not have permission to perform this action.",
          role:
            admin.role,
          action,
          request_id:
            requestId,
        },
        { status: 403, requestId }
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

        return secureJson(
          {
            error:
              "Target admin role could not be verified.",
          },
          { status: 500, requestId }
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
          admin.role,
        targetRole:
          targetAdminRole,
      })
    ) {
      return secureJson(
        {
          error:
            "Your role cannot manage this admin account.",
        },
        { status: 403, requestId }
      );
    }

    // BAN USER
    if (action === "ban-user") {
      if (!userId) {
        return secureJson(
          {
            error:
              "User ID is required.",
          },
          { status: 400, requestId }
        );
      }

      if (userId === user.id) {
        return secureJson(
          {
            error:
              "You cannot ban your own admin account.",
          },
          { status: 400, requestId }
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

        return secureJson(
          {
            error:
              "User could not be banned.",
          },
          { status: 500, requestId }
        );
      }

      // AÃƒÂ§Ã„Â±k oturumlarÃ„Â± da uygulama tarafÃ„Â±nda iptal et.
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
              user.id,
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
          user.id,
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

      return secureJson(
        {
          success: true,
          action: "ban-user",
          request_id: requestId,
        },
        { requestId }
      );
    }

    // UNBAN USER
    if (action === "unban-user") {
      if (!userId) {
        return secureJson(
          {
            error:
              "User ID is required.",
          },
          { status: 400, requestId }
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

        return secureJson(
          {
            error:
              "User could not be unbanned.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
        targetUserId:
          userId,
        action:
          "unban-user",
      });

      return secureJson(
        {
          success: true,
          action: "unban-user",
          request_id: requestId,
        },
        { requestId }
      );
    }

    // DELETE USER
    if (action === "delete-user") {
      if (!userId) {
        return secureJson(
          {
            error:
              "User ID is required.",
          },
          { status: 400, requestId }
        );
      }

      if (userId === user.id) {
        return secureJson(
          {
            error:
              "You cannot delete your own admin account.",
          },
          { status: 400, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
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

        return secureJson(
          {
            error:
              "User could not be deleted.",
          },
          { status: 500, requestId }
        );
      }

      return secureJson(
        {
          success: true,
          action: "delete-user",
          request_id: requestId,
        },
        { requestId }
      );
    }

    // FORCE LOGOUT
    if (action === "force-logout") {
      if (!userId) {
        return secureJson(
          {
            error:
              "User ID is required.",
          },
          { status: 400, requestId }
        );
      }

      if (userId === user.id) {
        return secureJson(
          {
            error:
              "You cannot force logout your own admin account.",
          },
          { status: 400, requestId }
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
              user.id,

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

        return secureJson(
          {
            error:
              "User sessions could not be ended.",
          },
          { status: 500, requestId }
        );
      }

      if (!controlRow) {
        return secureJson(
          {
            error:
              "Force logout marker was not saved.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
        targetUserId:
          userId,
        action:
          "force-logout",
        details: {
          revoked_before:
            controlRow.revoked_before,
        },
      });

      return secureJson(
        {
          success: true,
          action: "force-logout",
          revokedBefore: controlRow.revoked_before,
          request_id: requestId,
        },
        { requestId }
      );
    }

    // MAKE ADMIN
    if (action === "make-admin") {
      if (!userId) {
        return secureJson(
          {
            error:
              "User ID is required.",
          },
          { status: 400, requestId }
        );
      }

      if (
        targetAdminRole ===
        "owner"
      ) {
        return secureJson(
          {
            error:
              "Owner role cannot be changed through this action.",
          },
          { status: 403, requestId }
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

        return secureJson(
          {
            error:
              "Admin permission could not be granted.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
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
            admin.role,
        },
      });

      return secureJson(
        {
          success: true,
          action: "make-admin",
          request_id: requestId,
        },
        { requestId }
      );
    }


    // SET ADMIN ROLE
    if (
      action ===
      "set-admin-role"
    ) {
      if (!userId) {
        return secureJson(
          {
            error:
              "User ID is required.",
          },
          { status: 400, requestId }
        );
      }

      if (
        userId ===
        user.id
      ) {
        return secureJson(
          {
            error:
              "You cannot change your own owner role.",
          },
          { status: 400, requestId }
        );
      }

      if (
        requestedRole !==
          "admin" &&
        requestedRole !==
          "moderator"
      ) {
        return secureJson(
          {
            error:
              "Role must be admin or moderator.",
          },
          { status: 400, requestId }
        );
      }

      if (
        targetAdminRole ===
        "owner"
      ) {
        return secureJson(
          {
            error:
              "Owner role cannot be changed.",
          },
          { status: 403, requestId }
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

        return secureJson(
          {
            error:
              "Admin role could not be updated.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
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
            admin.role,
        },
      });

      return secureJson(
        {
          success: true,
          action: "set-admin-role",
          role: requestedRole,
          request_id: requestId,
        },
        { requestId }
      );
    }

    // REMOVE ADMIN
    if (action === "remove-admin") {
      if (!userId) {
        return secureJson(
          {
            error:
              "User ID is required.",
          },
          { status: 400, requestId }
        );
      }

      if (userId === user.id) {
        return secureJson(
          {
            error:
              "You cannot remove your own admin permission.",
          },
          { status: 400, requestId }
        );
      }

      if (
        targetAdminRole ===
        "owner"
      ) {
        return secureJson(
          {
            error:
              "Owner permission cannot be removed.",
          },
          { status: 403, requestId }
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

        return secureJson(
          {
            error:
              "Admin permission could not be removed.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
        targetUserId:
          userId,
        action:
          "remove-admin",
        details: {
          removed_role:
            targetAdminRole,
          actor_role:
            admin.role,
        },
      });

      return secureJson(
        {
          success: true,
          action: "remove-admin",
          request_id: requestId,
        },
        { requestId }
      );
    }

    // BAN IP
    if (action === "ban-ip") {
      if (!ipAddress) {
        return secureJson(
          {
            error:
              "IP address is required.",
          },
          { status: 400, requestId }
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
              user.id,
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

        return secureJson(
          {
            error:
              "IP address could not be banned.",
          },
          { status: 500, requestId }
        );
      }

      if (!bannedIp) {
        return secureJson(
          {
            error:
              "IP ban was not saved.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
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

      return secureJson(
        {
          success: true,
          action: "ban-ip",
          ipAddress: bannedIp.ip_address,
          request_id: requestId,
        },
        { requestId }
      );
    }

    // UNBAN IP
    if (action === "unban-ip") {
      if (!ipAddress) {
        return secureJson(
          {
            error:
              "IP address is required.",
          },
          { status: 400, requestId }
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

        return secureJson(
          {
            error:
              "IP address could not be unbanned.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,
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

      return secureJson(
        {
          success: true,
          action: "unban-ip",
          ipAddress,
          request_id: requestId,
        },
        { requestId }
      );
    }

    return secureJson(
      {
        error:
          "Unknown action.",
      },
      { status: 400, requestId }
    );
  } catch (error) {
    console.error(
      "Admin user manage API error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}