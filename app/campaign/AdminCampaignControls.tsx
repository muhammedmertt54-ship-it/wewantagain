"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../../lib/supabase";

type AdminRole =
  | "owner"
  | "admin"
  | "moderator";

type Props = {
  campaignId: number;
  campaignTitle: string;
};

function isAdminRole(
  value: unknown
): value is AdminRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "moderator"
  );
}

export default function AdminCampaignControls({
  campaignId,
  campaignTitle,
}: Props) {
  const [
    checking,
    setChecking,
  ] = useState(true);

  const [
    role,
    setRole,
  ] =
    useState<AdminRole | null>(
      null
    );

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session?.user) {
        setChecking(false);
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("admins")
          .select("role")
          .eq(
            "user_id",
            session.user.id
          )
          .maybeSingle();

      if (error) {
        console.error(
          "Campaign admin role check error:",
          error
        );

        setChecking(false);
        return;
      }

      if (
        data &&
        isAdminRole(
          data.role
        )
      ) {
        setRole(
          data.role
        );
      }
    } catch (error) {
      console.error(
        "Campaign admin controls error:",
        error
      );
    } finally {
      setChecking(false);
    }
  }

  async function deleteCampaign() {
    if (
      deleting ||
      !role
    ) {
      return;
    }

    const firstConfirm =
      window.confirm(
        `Delete "${campaignTitle}"?\n\nThis will permanently delete the campaign and its support records.`
      );

    if (!firstConfirm) {
      return;
    }

    const secondConfirm =
      window.confirm(
        "This action cannot be undone. Are you absolutely sure?"
      );

    if (!secondConfirm) {
      return;
    }

    setDeleting(true);
    setErrorMessage("");

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        setErrorMessage(
          "Your admin session has expired. Please sign in again."
        );

        return;
      }

      const response =
        await fetch(
          "/api/admin/campaigns/manage",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify(
                {
                  campaignId,

                  action:
                    "delete",
                }
              ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setErrorMessage(
          data?.error ??
            "Campaign could not be deleted."
        );

        return;
      }

      window.location.href =
        "/?campaign-deleted=1";
    } catch (error) {
      console.error(
        "Campaign delete request error:",
        error
      );

      setErrorMessage(
        "Campaign could not be deleted. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (
    checking ||
    !role
  ) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-8">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-red-500">
              STAFF CONTROLS
            </div>

            <h2 className="mt-2 text-xl font-black text-red-950">
              Campaign Management
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-700">
              Signed in as{" "}
              <strong>
                {role.toUpperCase()}
              </strong>
              . Deleting a campaign is permanent.
            </p>
          </div>

          <button
            type="button"
            disabled={
              deleting
            }
            onClick={
              deleteCampaign
            }
            className="shrink-0 rounded-xl bg-red-600 px-6 py-4 font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting
              ? "DELETING..."
              : "DELETE CAMPAIGN"}
          </button>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-white p-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}
      </div>
    </section>
  );
}