import { AuthShell } from "@/components/auth/auth-shell";
import { VerificationStatus } from "@/components/auth/auth-status";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <AuthShell>
      <VerificationStatus
        sent={first(params.sent)}
        verified={first(params.verified)}
        error={first(params.error)}
      />
    </AuthShell>
  );
}
